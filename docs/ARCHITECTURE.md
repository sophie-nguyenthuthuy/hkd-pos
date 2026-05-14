# Architecture

```
┌────────────────────┐         ┌────────────────────────────────────────┐
│  Mobile (Expo)     │         │           API (NestJS + Fastify)        │
│                    │  HTTPS  │                                         │
│  React Native      ├────────►│  /v1/auth        OTP + JWT              │
│  RN Query · Zustand│         │  /v1/businesses  tenant CRUD            │
│  Secure Store      │◄────────┤  /v1/products    catalogue              │
│  i18n (vi/en)      │  JSON   │  /v1/orders      POS sales (idempotent) │
│  Offline-first     │         │  /v1/invoices    HĐĐT issuance          │
└────────────────────┘         │  /v1/tax         forecast + tờ khai     │
                               └────┬──────────────────────────────┬─────┘
                                    │                              │
                       ┌────────────▼────────────┐    ┌────────────▼─────────────┐
                       │  Prisma → Postgres 16    │    │  EInvoiceProvider port    │
                       │  audit_events            │    │  ├── MockProvider (dev)   │
                       │  invoice_serials (lock)  │    │  ├── VnptProvider         │
                       │  signed XML retained     │    │  ├── MisaProvider (TODO)  │
                       │                          │    │  ├── ViettelProvider (TODO)│
                       └──────────────────────────┘    │  └── …                    │
                                                       └────────────┬──────────────┘
                                                                    │ signed XML
                                                                    ▼
                                                          ┌────────────────────┐
                                                          │ GDT (Tổng cục Thuế)│
                                                          │ HĐĐT-MTT receipt   │
                                                          └────────────────────┘
```

## Key design decisions

### 1. Pluggable e-invoice provider behind a port

Vietnam has ~10 GDT-authorised e-invoice providers. Household businesses have
existing contracts with one of them. Hard-coding a provider would fragment the
addressable market in half on day one.

`EInvoiceProvider` (in `apps/api/src/providers/einvoice/provider.interface.ts`)
is the only seam. Each concrete adapter:

- builds provider-specific XML/JSON from the canonical `EInvoicePayload`,
- signs the document with the merchant's certificate (via USB token, soft cert,
  or HSM, depending on deployment),
- transmits to the provider, who relays to GDT and returns mã CQT,
- maps provider errors back onto our `ErrorCode` enum.

A new provider is roughly 200–400 LOC and one suite of contract tests.

### 2. Invoice numbers are reserved before the network call

`invoice_serials` holds one row per `(business, templateCode, serial)` with a
monotonically-increasing `next`. `InvoicesService.issueForOrder` reserves a
number inside a short Postgres transaction (`UPDATE … RETURNING next - 1`),
then makes the provider call **outside** the transaction. If the call fails,
the Invoice row is marked `REJECTED` and the number is consumed — required by
TT 78/2021 (numbers must be gap-free and never reused).

### 3. Offline-first POS

The mobile app generates a `clientOrderRef` (ULID) on the device for every
sale. The API treats `(businessId, clientOrderRef)` as an idempotency key.
A flaky 3G connection (typical at outdoor markets) cannot cause double charges.

### 4. Money is BigInt all the way down

All amounts in Postgres are `BigInt`. The shared `formatVND` and `toVND` helpers
guard against `Number.MAX_SAFE_INTEGER` overflow when aggregating annual
revenue across millions of small sales. VAT rates are stored as basis points
(`vatRateBps: 800` for 8%) to avoid float drift.

### 5. Phone + OTP for primary auth

Email reaches a small subset of HKD owners. Phone reaches all of them. We use
6-digit OTP with argon2id hashing, 5-minute TTL, and 5-attempt/5-per-hour
rate limits. Sessions issue an access JWT (15m) + opaque refresh token (30d,
hashed at rest, rotated on every refresh).

### 6. Tax math lives in `@hkd-pos/shared`

The API and the mobile preview must agree to the đồng. Both import
`computePresumptiveTax` and `computeInvoiceTotals` from the shared package.
Tests in `packages/shared/test/tax.test.ts` pin the rates from TT 40/2021 and
the per-line VAT computation from TT 78/2021.

## Data flow: one sale

1. Cashier taps products on `NewSaleScreen` → `lines` state updates locally.
2. `computeInvoiceTotals` runs on every render — VAT + total preview is instant.
3. Tap "Xuất HĐĐT" → `POST /v1/businesses/:id/orders` with `clientOrderRef`.
4. API persists the Order under that ref (idempotent).
5. `POST /v1/businesses/:id/invoices/issue/:orderId` → InvoicesService:
   - reserves invoice number (Postgres lock),
   - builds canonical payload,
   - calls EInvoiceProvider.issue → signed XML + mã CQT,
   - persists onto the Invoice row.
6. Mobile invalidates `['invoices']` and `['forecast']` queries; the home
   screen updates in real time.

# HKD-POS — Hộ Kinh Doanh POS

> Bán hàng + Hóa đơn điện tử + Thuế khoán + Tờ khai — một chạm trên mobile.

Mobile-first POS for Vietnamese household businesses (hộ kinh doanh) complying with
**Nghị định 70/2025/NĐ-CP**: from 1 June 2025, household businesses with annual revenue
≥ 1 billion VND must issue electronic invoices generated directly from the cash register
(hóa đơn điện tử khởi tạo từ máy tính tiền) and transmit them to the General Department
of Taxation (Tổng cục Thuế — GDT).

This repo is the foundation for a single app that gives ~5M household businesses:

1. **POS** — fast offline-first sales entry on mobile (single thumb operation).
2. **E-invoicing** — instant HĐĐT issuance via a pluggable provider (VNPT, MISA,
   EasyInvoice, Viettel, FPT) with automatic GDT transmission.
3. **Presumptive tax (thuế khoán)** — automatic computation of VAT + PIT under the
   revenue-based regime, with monthly/quarterly cash-flow forecasting.
4. **One-tap declaration filing** — pre-filled forms 01/CNKD và 01/TKN-CNKD ready to
   submit via the GDT eTax Mobile bridge.

## Regulatory context

| Reference                                    | What it says                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| Nghị định 70/2025/NĐ-CP (amends NĐ 123/2020) | Mandates HĐĐT-MTT for HKD with revenue ≥ 1 tỷ VND/year from 01/06/2025 |
| Thông tư 78/2021/TT-BTC                      | Technical schema for e-invoice data transmitted to GDT                 |
| Thông tư 40/2021/TT-BTC                      | Presumptive tax computation for household and individual businesses    |
| Luật Quản lý thuế 38/2019/QH14               | Tax administration framework                                           |

All tax/compliance logic lives in `packages/shared/src/tax/` and is unit-tested against
worked examples from the circulars. Do not duplicate rates elsewhere.

## Repository layout

```
hkd-pos/
├── apps/
│   ├── api/                NestJS backend — REST + WebSocket, Prisma, BullMQ workers
│   └── mobile/             Expo (React Native) — offline-first POS client
├── packages/
│   └── shared/             Zod schemas, domain types, tax math, error codes
├── docs/                   Architecture notes, compliance references, ADRs
├── docker-compose.yml      Postgres 16 + Redis 7 for local dev
├── turbo.json              Turborepo build pipeline
└── pnpm-workspace.yaml
```

## Quick start

```bash
# Prerequisites: Node 20+, pnpm 9+, Docker
corepack enable
pnpm install

# Bring up Postgres + Redis
docker compose up -d

# Run migrations + seed
pnpm --filter @hkd-pos/api db:migrate
pnpm --filter @hkd-pos/api db:seed

# Run everything (api + mobile + shared in watch mode)
pnpm dev
```

API: <http://localhost:3000> · Swagger: <http://localhost:3000/docs>
Mobile: Expo dev tools — scan the QR code with Expo Go (Android/iOS).

## Production checklist

This skeleton is wired for production but each integration must be filled in before
go-live. Treat any `TODO(provider):` marker as a release-blocker.

- [ ] Real e-invoice provider credentials (VNPT/MISA/Viettel/FPT) — see
      [`apps/api/src/providers/einvoice`](apps/api/src/providers/einvoice).
- [ ] GDT eTax Mobile signing certificate (USB token or HSM-backed).
- [ ] SMS/Zalo OTP gateway (Stringee, eSMS, Twilio fallback).
- [ ] Sentry DSN, OpenTelemetry collector endpoint.
- [ ] Production database backup + PITR.
- [ ] Pen-test of payment flow (VNPay/MoMo) before exposing real money.

See [`docs/PRODUCTION.md`](docs/PRODUCTION.md) for the full pre-launch checklist.

## License

Business Source License 1.1 — see [`LICENSE`](LICENSE). Converts to Apache 2.0 four
years after each release. Production use against household-business workloads is
permitted; reselling this software as a SaaS is not.

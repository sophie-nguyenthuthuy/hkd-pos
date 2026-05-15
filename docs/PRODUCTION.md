# Production checklist

Treat this as the gate between "the scaffold runs" and "real money flows through it."

## Compliance

- [ ] Signed contract with a GDT-authorised HĐĐT provider (VNPT / MISA / Viettel
      / FPT / EasyInvoice / BKAV).
- [ ] Each onboarded business has its own provider account (or a sub-account
      under a reseller agreement) and a registered template + serial in
      `invoice_serials`.
- [ ] Each business's digital certificate is loaded onto: - a USB token attached to a desktop relay, **or** - a soft-cert (PFX) encrypted with the per-business secret + KMS, **or** - an HSM partition keyed by tax code.
- [ ] Tax-code-scoped configuration of the e-invoice provider is verified
      against the provider's UAT before being promoted to live.
- [ ] Filed Thông báo phát hành (TB04/AC) with GDT for the template + serial,
      and confirmed acceptance, before issuing the first real invoice.
- [ ] Privacy notice + DPA reviewed against Nghị định 13/2023/NĐ-CP (personal
      data protection).

## Infrastructure

- [ ] Postgres 16 with PITR (continuous WAL archiving). Daily encrypted base
      backups retained 30 days minimum.
- [ ] Redis with persistence (AOF) for OTP rate-limit counters and BullMQ.
- [ ] HTTPS everywhere; HSTS preload; TLS 1.2+.
- [ ] Secrets in a managed vault (AWS Secrets Manager / GCP Secret Manager).
      Never bake secrets into images.
- [ ] Database connection limits sized for 2× expected concurrent merchants
      (Prisma `connection_limit` query param).

## Application

- [ ] All `TODO(provider):` markers resolved.
- [ ] `EINVOICE_PROVIDER=mock` rejected by a startup check in production.
- [ ] SMS provider live (eSMS / Stringee) with branded sender name.
- [ ] Pen-test of auth flow + payment integration.
- [ ] Rate limits validated by load test (target: 100 req/s steady, 500 req/s
      burst per business).
- [ ] OpenAPI spec published at `/docs` is reviewed for accidentally exposed
      internal fields.

## Observability

- [ ] Sentry DSN configured (API + mobile).
- [ ] OpenTelemetry traces exported (collector at `OTEL_EXPORTER_OTLP_ENDPOINT`).
- [ ] Structured logs (`pino`) shipped to a log warehouse; PII redaction
      configured (see `app.module.ts` → `LoggerModule.pinoHttp.redact`).
- [ ] Alerts: - `5xx rate > 1% over 5m` - `einvoice_provider_unavailable > 0 over 1m` - `gdt_transmission_failed_total > 5 over 5m` - `postgres connection pool > 80% for 5m`

## Mobile release

- [ ] Production EAS builds use a separate Apple Developer Team / Google Play
      console from internal builds.
- [ ] App Store / Play submission notes reference NĐ 70/2025 to pre-empt
      financial-app review questions.
- [ ] In-app version pinning: API rejects mobile clients older than the
      minimum-supported version (`X-Client-Version` header check — not yet
      implemented; flag for v0.2).

## Disaster recovery

- [ ] PITR tested by restoring last week's backup to a staging DB.
- [ ] Provider-side invoice records reconciled nightly against our `invoices`
      table — any drift surfaces as a Sentry alert.
- [ ] Documented runbook for: provider outage, GDT outage, certificate
      expiry, rogue refund.

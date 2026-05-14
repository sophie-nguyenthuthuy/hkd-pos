import type { EInvoiceIssued, EInvoicePayload, EInvoiceProviderKind } from '@hkd-pos/shared';

export const EINVOICE_PROVIDER = Symbol('EINVOICE_PROVIDER');

export interface EInvoiceProvider {
  readonly kind: EInvoiceProviderKind;

  /**
   * Submit an invoice payload to the provider. The provider is expected to:
   *   1. Sign the invoice with the merchant's certificate (USB token / HSM).
   *   2. Transmit it to GDT and obtain a "mã của cơ quan thuế".
   *   3. Return the signed XML and the GDT code (or throw on rejection).
   *
   * Implementations must be idempotent on a stable provider-side key derived
   * from (sellerTaxCode, templateCode, serial, number) so that retries after
   * timeout do not double-issue.
   */
  issue(payload: EInvoicePayload): Promise<EInvoiceIssued>;

  /** Mark an issued invoice as voided / replaced. */
  void(providerInvoiceId: string, reason: string): Promise<void>;
}

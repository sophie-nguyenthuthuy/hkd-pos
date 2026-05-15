import { DomainError, ErrorCode, type EInvoiceIssued, type EInvoicePayload } from '@hkd-pos/shared';
import type { ConfigService } from '@nestjs/config';

import type { EInvoiceProvider } from './provider.interface.js';

/**
 * VNPT e-invoice provider adapter.
 *
 * VNPT exposes SOAP endpoints under `/PublishService.asmx` (issuance) and
 * `/BusinessService.asmx` (queries). Requests authenticate via WS-Security with
 * the merchant's tax-code-scoped account credentials, and the invoice XML is
 * signed before transmission using the merchant's digital certificate.
 *
 * This file is a *scaffold*. Before go-live:
 *   1. Add a SOAP client (e.g. `strong-soap` or hand-rolled fetch+XML).
 *   2. Implement XML signing per VNPT's signing spec (XAdES enveloped, SHA-256).
 *   3. Map provider error codes → our `ErrorCode` enum.
 *   4. Add contract tests against VNPT's UAT environment.
 */
export class VnptEInvoiceProvider implements EInvoiceProvider {
  readonly kind = 'vnpt' as const;

  constructor(private readonly config: ConfigService) {
    const baseUrl = config.get<string>('EINVOICE_BASE_URL');
    const username = config.get<string>('EINVOICE_USERNAME');
    const password = config.get<string>('EINVOICE_PASSWORD');
    const certPath = config.get<string>('EINVOICE_CERT_PATH');

    if (!baseUrl || !username || !password || !certPath) {
      throw new Error(
        'VNPT e-invoice provider requires EINVOICE_BASE_URL, EINVOICE_USERNAME, EINVOICE_PASSWORD, EINVOICE_CERT_PATH.',
      );
    }
  }

  issue(_payload: EInvoicePayload): Promise<EInvoiceIssued> {
    // TODO(provider): build TT78-conformant XML, sign with cert, POST to PublishService.
    throw new DomainError(
      ErrorCode.EINVOICE_PROVIDER_UNAVAILABLE,
      'VNPT provider not yet implemented — see apps/api/src/providers/einvoice/vnpt.provider.ts',
    );
  }

  void(_providerInvoiceId: string, _reason: string): Promise<void> {
    throw new DomainError(
      ErrorCode.EINVOICE_PROVIDER_UNAVAILABLE,
      'VNPT void not yet implemented.',
    );
  }
}

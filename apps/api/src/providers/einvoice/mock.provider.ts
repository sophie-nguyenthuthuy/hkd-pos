import type { EInvoiceIssued, EInvoicePayload } from '@hkd-pos/shared';
import { ulid } from 'ulid';

import type { EInvoiceProvider } from './provider.interface.js';

/**
 * Local-only provider used for development and tests.
 * Emits a deterministic fake "GDT code" so flows can be exercised offline.
 */
export class MockEInvoiceProvider implements EInvoiceProvider {
  readonly kind = 'mock' as const;

  async issue(payload: EInvoicePayload): Promise<EInvoiceIssued> {
    const providerInvoiceId = ulid();
    const gdtCode = `MOCK-${payload.templateCode}-${payload.serial}-${Date.now()}`;
    return {
      providerInvoiceId,
      gdtCode,
      lookupUrl: `https://example.invalid/lookup/${providerInvoiceId}`,
      signedXml: buildMinimalXml(payload),
    };
  }

  async void(_providerInvoiceId: string, _reason: string): Promise<void> {
    // no-op
  }
}

function buildMinimalXml(p: EInvoicePayload): string {
  // Not a valid TT78 schema — placeholder for the real signed XML.
  return `<?xml version="1.0" encoding="UTF-8"?>
<MockInvoice>
  <Seller><TaxCode>${p.seller.taxCode}</TaxCode><Name>${escapeXml(p.seller.name)}</Name></Seller>
  <Template>${p.templateCode}</Template>
  <Serial>${p.serial}</Serial>
  <IssuedAt>${p.issuedAt}</IssuedAt>
  <Total>${p.totals.totalVnd}</Total>
</MockInvoice>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === '"' ? '&quot;' : '&apos;',
  );
}

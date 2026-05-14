import type { EInvoicePayload } from '@hkd-pos/shared';
import { describe, expect, it } from 'vitest';

import { MockEInvoiceProvider } from './mock.provider.js';

const payload: EInvoicePayload = {
  seller: { taxCode: '0123456789', name: 'Quán A', address: 'Đường ABC' },
  buyer: {},
  templateCode: '1/001',
  serial: 'C25TAA',
  issuedAt: new Date('2026-05-14T10:00:00Z').toISOString(),
  currency: 'VND',
  lines: [
    {
      name: 'Cà phê',
      unit: 'ly',
      quantity: 2,
      unitPriceVnd: 30_000,
      vatRate: 0.08,
      discountVnd: 0,
      netVnd: 60_000,
      vatVnd: 4_800,
    },
  ],
  totals: { totalBeforeVatVnd: 60_000, totalVatVnd: 4_800, totalVnd: 64_800 },
};

describe('MockEInvoiceProvider', () => {
  it('returns a deterministic-looking GDT code and signed XML', async () => {
    const p = new MockEInvoiceProvider();
    const result = await p.issue(payload);
    expect(result.providerInvoiceId).toMatch(/^[0-9A-Z]{26}$/);
    expect(result.gdtCode).toMatch(/^MOCK-1\/001-C25TAA-/);
    expect(result.signedXml).toContain('<TaxCode>0123456789</TaxCode>');
    expect(result.signedXml).toContain('<Total>64800</Total>');
  });
});

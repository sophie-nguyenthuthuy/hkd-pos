import { z } from 'zod';

export const EInvoiceProviderKindSchema = z.enum([
  'vnpt',
  'misa',
  'viettel',
  'easyinvoice',
  'fpt',
  'mock',
]);
export type EInvoiceProviderKind = z.infer<typeof EInvoiceProviderKindSchema>;

/**
 * The normalized payload an adapter receives. Each provider then maps it to
 * its own XML/JSON schema. The shape mirrors GDT's data model in TT 78/2021.
 */
export const EInvoicePayloadSchema = z.object({
  seller: z.object({
    taxCode: z.string(),
    name: z.string(),
    address: z.string(),
  }),
  buyer: z.object({
    name: z.string().optional(),
    taxCode: z.string().optional(),
    address: z.string().optional(),
  }),
  templateCode: z.string(),
  serial: z.string(),
  /** ISO date — the invoice issue date. */
  issuedAt: z.string().datetime(),
  currency: z.literal('VND'),
  lines: z.array(
    z.object({
      name: z.string(),
      unit: z.string(),
      quantity: z.number().positive(),
      unitPriceVnd: z.number().int().nonnegative(),
      vatRate: z.number(),
      discountVnd: z.number().int().nonnegative(),
      netVnd: z.number().int().nonnegative(),
      vatVnd: z.number().int().nonnegative(),
    }),
  ),
  totals: z.object({
    totalBeforeVatVnd: z.number().int().nonnegative(),
    totalVatVnd: z.number().int().nonnegative(),
    totalVnd: z.number().int().nonnegative(),
  }),
});
export type EInvoicePayload = z.infer<typeof EInvoicePayloadSchema>;

export const EInvoiceIssuedSchema = z.object({
  /** Provider-side invoice id. */
  providerInvoiceId: z.string(),
  /** Mã của cơ quan thuế — when GDT has accepted and assigned a code. */
  gdtCode: z.string().nullable(),
  /** URL where the customer can look up the invoice (PDF/web view). */
  lookupUrl: z.string().url().nullable(),
  /** Signed XML payload — store this; it is the legal record. */
  signedXml: z.string(),
});
export type EInvoiceIssued = z.infer<typeof EInvoiceIssuedSchema>;

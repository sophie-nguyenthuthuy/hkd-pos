import type { OrderLine } from '../domain/schemas.js';
import type { VND } from '../money.js';
import { toVND } from '../money.js';

export interface InvoiceTotals {
  /** Σ (qty × unit price − line discount), before VAT. */
  totalBeforeVatVnd: VND;
  /** Σ VAT per line. */
  totalVatVnd: VND;
  /** totalBeforeVatVnd + totalVatVnd. */
  totalVnd: VND;
  /** Per-VAT-rate breakdown — required for HĐĐT XML and for filings. */
  byVatRate: { rate: number; netVnd: VND; vatVnd: VND }[];
}

/**
 * Compute invoice totals from order lines.
 *
 * Important: VAT is computed **per line then summed**, not on the grand total.
 * This matches the GDT XML schema (each line carries its own VAT) and avoids
 * rounding drift across different VAT rates in the same invoice.
 */
export function computeInvoiceTotals(lines: readonly OrderLine[]): InvoiceTotals {
  const byRate = new Map<number, { netVnd: number; vatVnd: number }>();

  let totalBeforeVat = 0;
  let totalVat = 0;

  for (const line of lines) {
    const gross = line.unitPriceVnd * line.quantity;
    const net = Math.max(0, gross - line.discountVnd);
    const vat = net * line.vatRate;

    totalBeforeVat += net;
    totalVat += vat;

    const bucket = byRate.get(line.vatRate) ?? { netVnd: 0, vatVnd: 0 };
    bucket.netVnd += net;
    bucket.vatVnd += vat;
    byRate.set(line.vatRate, bucket);
  }

  const totalBeforeVatVnd = toVND(totalBeforeVat);
  const totalVatVnd = toVND(totalVat);

  return {
    totalBeforeVatVnd,
    totalVatVnd,
    totalVnd: totalBeforeVatVnd + totalVatVnd,
    byVatRate: [...byRate.entries()]
      .sort(([a], [b]) => a - b)
      .map(([rate, v]) => ({ rate, netVnd: toVND(v.netVnd), vatVnd: toVND(v.vatVnd) })),
  };
}

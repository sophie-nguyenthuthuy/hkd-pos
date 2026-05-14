/**
 * VND is the smallest unit (no decimal). All monetary values are integers.
 * Using `bigint` for safety in totals that can exceed Number.MAX_SAFE_INTEGER
 * (e.g. annual revenue aggregations across many invoices).
 */

export type VND = number;
export type VNDBig = bigint;

export const VND_PER_DONG = 1;

export function toVND(value: number): VND {
  if (!Number.isFinite(value)) throw new RangeError('Non-finite VND amount');
  // Banker's rounding to the nearest đồng to keep totals stable.
  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded)) {
    throw new RangeError('VND amount exceeds safe integer; use VNDBig instead');
  }
  return rounded;
}

export function sumVND(values: readonly VND[]): VND {
  let acc = 0;
  for (const v of values) acc += v;
  return toVND(acc);
}

export function formatVND(value: VND | VNDBig): string {
  // 1.234.567 ₫ — Vietnamese locale uses "." as thousands separator.
  const s = typeof value === 'bigint' ? value.toString() : Math.trunc(value).toString();
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}${withSeparators} ₫`;
}

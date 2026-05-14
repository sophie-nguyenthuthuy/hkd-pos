import { describe, expect, it } from 'vitest';

import {
  HKD_TAX_EXEMPTION_THRESHOLD_VND,
  NDD70_REVENUE_THRESHOLD_VND,
  annualizeRevenue,
  computeInvoiceTotals,
  computePresumptiveTax,
  proratePeriod,
} from '../src/tax/index.js';

describe('computePresumptiveTax', () => {
  it('exempts annual revenue at or below 100M VND', () => {
    const r = computePresumptiveTax('DISTRIBUTION_SUPPLY', HKD_TAX_EXEMPTION_THRESHOLD_VND);
    expect(r.exempt).toBe(true);
    expect(r.vatVnd).toBe(0);
    expect(r.pitVnd).toBe(0);
    expect(r.totalVnd).toBe(0);
  });

  it('applies 1% VAT + 0.5% PIT for DISTRIBUTION_SUPPLY above the threshold', () => {
    // 500M VND in retail revenue → 5M VAT + 2.5M PIT
    const r = computePresumptiveTax('DISTRIBUTION_SUPPLY', 500_000_000);
    expect(r.exempt).toBe(false);
    expect(r.vatVnd).toBe(5_000_000);
    expect(r.pitVnd).toBe(2_500_000);
    expect(r.totalVnd).toBe(7_500_000);
  });

  it('applies 5% VAT + 2% PIT for services', () => {
    const r = computePresumptiveTax('SERVICES_CONSTRUCTION_NO_MATERIAL', 1_200_000_000);
    expect(r.vatVnd).toBe(60_000_000);
    expect(r.pitVnd).toBe(24_000_000);
  });

  it('applies 3% VAT + 1.5% PIT for production / transport / services with goods', () => {
    const r = computePresumptiveTax('PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS', 2_000_000_000);
    expect(r.vatVnd).toBe(60_000_000);
    expect(r.pitVnd).toBe(30_000_000);
  });

  it('applies 2% VAT + 1% PIT for "other business"', () => {
    const r = computePresumptiveTax('OTHER_BUSINESS', 1_000_000_000);
    expect(r.vatVnd).toBe(20_000_000);
    expect(r.pitVnd).toBe(10_000_000);
  });

  it('rejects negative revenue', () => {
    expect(() => computePresumptiveTax('OTHER_BUSINESS', -1)).toThrow(RangeError);
  });
});

describe('annualizeRevenue', () => {
  it('projects 30-day revenue to a full year', () => {
    // 100M in 30 days → ~1.217B annualized — crosses NĐ70 threshold.
    const annual = annualizeRevenue(100_000_000, 30);
    expect(annual).toBeGreaterThan(NDD70_REVENUE_THRESHOLD_VND);
    expect(annual).toBe(Math.round((100_000_000 / 30) * 365));
  });

  it('rejects zero or negative period', () => {
    expect(() => annualizeRevenue(1_000, 0)).toThrow(RangeError);
    expect(() => annualizeRevenue(1_000, -7)).toThrow(RangeError);
  });
});

describe('proratePeriod', () => {
  it('prorates an annual figure to a month', () => {
    const monthly = proratePeriod(36_500_000, 31);
    expect(monthly).toBe(Math.round((36_500_000 / 365) * 31));
  });

  it('rejects out-of-range periods', () => {
    expect(() => proratePeriod(100, 0)).toThrow(RangeError);
    expect(() => proratePeriod(100, 400)).toThrow(RangeError);
  });
});

describe('computeInvoiceTotals', () => {
  it('sums multi-rate lines with per-line VAT', () => {
    const result = computeInvoiceTotals([
      {
        productId: 'p1',
        name: 'Cà phê',
        quantity: 2,
        unit: 'ly',
        unitPriceVnd: 30_000,
        vatRate: 0.08,
        discountVnd: 0,
      },
      {
        productId: 'p2',
        name: 'Bánh mì',
        quantity: 1,
        unit: 'ổ',
        unitPriceVnd: 20_000,
        vatRate: 0.05,
        discountVnd: 0,
      },
    ]);

    // 60_000 + 20_000 = 80_000 net
    // VAT: 60_000 * 0.08 = 4_800 ; 20_000 * 0.05 = 1_000 → 5_800
    expect(result.totalBeforeVatVnd).toBe(80_000);
    expect(result.totalVatVnd).toBe(5_800);
    expect(result.totalVnd).toBe(85_800);
    expect(result.byVatRate).toEqual([
      { rate: 0.05, netVnd: 20_000, vatVnd: 1_000 },
      { rate: 0.08, netVnd: 60_000, vatVnd: 4_800 },
    ]);
  });

  it('applies line discount before VAT', () => {
    const result = computeInvoiceTotals([
      {
        productId: 'p1',
        name: 'Áo thun',
        quantity: 3,
        unit: 'cái',
        unitPriceVnd: 200_000,
        vatRate: 0.1,
        discountVnd: 50_000,
      },
    ]);
    // gross 600k − discount 50k = 550k net ; VAT 10% = 55k
    expect(result.totalBeforeVatVnd).toBe(550_000);
    expect(result.totalVatVnd).toBe(55_000);
    expect(result.totalVnd).toBe(605_000);
  });

  it('never produces a negative net even if discount exceeds gross', () => {
    const result = computeInvoiceTotals([
      {
        productId: 'p1',
        name: 'Promo item',
        quantity: 1,
        unit: 'cái',
        unitPriceVnd: 10_000,
        vatRate: 0.08,
        discountVnd: 50_000,
      },
    ]);
    expect(result.totalBeforeVatVnd).toBe(0);
    expect(result.totalVatVnd).toBe(0);
  });
});

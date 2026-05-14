import type { BusinessSector } from '../domain/schemas.js';
import type { VND } from '../money.js';
import { toVND } from '../money.js';

import {
  HKD_TAX_EXEMPTION_THRESHOLD_VND,
  PRESUMPTIVE_RATES,
  type SectorRates,
} from './rates.js';

export interface PresumptiveTaxResult {
  sector: BusinessSector;
  revenueVnd: VND;
  /** True when annual revenue ≤ 100M VND — both VAT and PIT are 0. */
  exempt: boolean;
  rates: SectorRates;
  vatVnd: VND;
  pitVnd: VND;
  totalVnd: VND;
}

/**
 * Compute thuế khoán (presumptive tax) for a given **annualized** revenue.
 *
 * Callers must pass annualized revenue — the exemption threshold is annual.
 * For monthly/quarterly filings, gross up first using `annualizeRevenue` and
 * then prorate the result back to the period.
 */
export function computePresumptiveTax(
  sector: BusinessSector,
  annualRevenueVnd: VND,
): PresumptiveTaxResult {
  if (annualRevenueVnd < 0) {
    throw new RangeError('Annual revenue cannot be negative');
  }

  const rates = PRESUMPTIVE_RATES[sector];

  if (annualRevenueVnd <= HKD_TAX_EXEMPTION_THRESHOLD_VND) {
    return {
      sector,
      revenueVnd: annualRevenueVnd,
      exempt: true,
      rates,
      vatVnd: 0,
      pitVnd: 0,
      totalVnd: 0,
    };
  }

  const vatVnd = toVND(annualRevenueVnd * rates.vatRate);
  const pitVnd = toVND(annualRevenueVnd * rates.pitRate);

  return {
    sector,
    revenueVnd: annualRevenueVnd,
    exempt: false,
    rates,
    vatVnd,
    pitVnd,
    totalVnd: vatVnd + pitVnd,
  };
}

/**
 * Project annual revenue from a partial-year figure.
 *
 * Used when computing whether a HKD will cross either the NĐ70 threshold
 * (1B VND) or the exemption threshold (100M VND) by year end, to drive UI
 * warnings like "You're on pace to need HĐĐT-MTT by November".
 */
export function annualizeRevenue(periodRevenueVnd: VND, periodDays: number): VND {
  if (periodDays <= 0) throw new RangeError('periodDays must be > 0');
  return toVND((periodRevenueVnd / periodDays) * 365);
}

/**
 * Prorate annual tax back to a specific declaration period
 * (e.g. one month or one quarter). Uses an exact-day proration.
 */
export function proratePeriod(annualTaxVnd: VND, periodDays: number): VND {
  if (periodDays <= 0) throw new RangeError('periodDays must be > 0');
  if (periodDays > 366) throw new RangeError('periodDays cannot exceed 366');
  return toVND((annualTaxVnd / 365) * periodDays);
}

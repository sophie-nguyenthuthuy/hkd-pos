import type { BusinessSector } from '../domain/schemas.js';

/**
 * Presumptive tax rates for household / individual businesses.
 *
 * Source: Thông tư 40/2021/TT-BTC, Appendix I — Phụ lục Danh mục ngành nghề
 * tính thuế GTGT, thuế TNCN theo tỷ lệ % trên doanh thu đối với hộ kinh doanh,
 * cá nhân kinh doanh.
 *
 * Keep these in one place. The API uses them; the mobile app uses them for the
 * "what will I owe?" preview. Diverging rates would cause shadow filings.
 */

export interface SectorRates {
  /** Thuế GTGT (VAT) rate applied to gross revenue under the presumptive regime. */
  vatRate: number;
  /** Thuế TNCN (personal income tax) rate applied to gross revenue. */
  pitRate: number;
}

export const PRESUMPTIVE_RATES: Record<BusinessSector, SectorRates> = {
  // Phân phối, cung cấp hàng hóa — 1% VAT + 0.5% PIT
  DISTRIBUTION_SUPPLY: { vatRate: 0.01, pitRate: 0.005 },
  // Dịch vụ, xây dựng không bao thầu nguyên vật liệu — 5% VAT + 2% PIT
  SERVICES_CONSTRUCTION_NO_MATERIAL: { vatRate: 0.05, pitRate: 0.02 },
  // Sản xuất, vận tải, dịch vụ gắn với hàng hóa, xây dựng có bao thầu nguyên vật liệu
  // — 3% VAT + 1.5% PIT
  PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS: { vatRate: 0.03, pitRate: 0.015 },
  // Hoạt động kinh doanh khác — 2% VAT + 1% PIT
  OTHER_BUSINESS: { vatRate: 0.02, pitRate: 0.01 },
};

/**
 * Revenue threshold under Nghị định 70/2025: HKD whose annual revenue meets or
 * exceeds this must issue HĐĐT generated from the cash register from 01/06/2025.
 */
export const NDD70_REVENUE_THRESHOLD_VND = 1_000_000_000;

/**
 * PIT/VAT exemption threshold for household businesses (Thông tư 40/2021):
 * annual revenue ≤ 100M VND is not subject to presumptive VAT/PIT.
 */
export const HKD_TAX_EXEMPTION_THRESHOLD_VND = 100_000_000;

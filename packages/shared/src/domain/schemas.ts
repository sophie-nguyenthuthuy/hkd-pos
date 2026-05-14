import { z } from 'zod';

/**
 * Vietnamese tax code: 10 digits for individuals/HKD, 13 digits for branches
 * (10-NNN format), or 14 digits with hyphen — we normalize to digits-only here.
 */
export const TaxCodeSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\d{10}(\d{3})?$/, 'Mã số thuế phải gồm 10 hoặc 13 chữ số.'));

/** Vietnamese phone — accept +84, 84, or 0 prefix; normalize to E.164. */
export const PhoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s().-]/g, ''))
  .transform((s) => {
    if (s.startsWith('+84')) return s;
    if (s.startsWith('84')) return `+${s}`;
    if (s.startsWith('0')) return `+84${s.slice(1)}`;
    return s;
  })
  .pipe(z.string().regex(/^\+84\d{9}$/, 'Số điện thoại không hợp lệ.'));

/**
 * Business sector for thuế khoán — drives VAT/PIT rates (Thông tư 40/2021/TT-BTC).
 * The full official catalogue has dozens of sub-codes; we keep the four umbrella
 * categories and let providers narrow further if needed.
 */
export const BusinessSectorSchema = z.enum([
  'DISTRIBUTION_SUPPLY', // Phân phối, cung cấp hàng hóa
  'SERVICES_CONSTRUCTION_NO_MATERIAL', // Dịch vụ, xây dựng không bao thầu nguyên vật liệu
  'PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS', // Sản xuất, vận tải, dịch vụ gắn với hàng hóa
  'OTHER_BUSINESS', // Hoạt động kinh doanh khác
]);
export type BusinessSector = z.infer<typeof BusinessSectorSchema>;

export const BusinessSchema = z.object({
  id: z.string(),
  taxCode: TaxCodeSchema,
  name: z.string().min(1).max(255),
  address: z.string().min(1).max(500),
  sector: BusinessSectorSchema,
  ownerName: z.string().min(1).max(255),
  ownerPhone: PhoneSchema,
  ownerEmail: z.string().email().optional(),
  createdAt: z.string().datetime(),
});
export type Business = z.infer<typeof BusinessSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  unit: z.string().min(1).max(32), // e.g. "cái", "kg", "hộp"
  unitPriceVnd: z.number().int().nonnegative(),
  /** VAT rate as a fraction (0, 0.05, 0.08, 0.10). 0.08 = the 2024–25 reduction. */
  vatRate: z.union([z.literal(0), z.literal(0.05), z.literal(0.08), z.literal(0.1)]),
  archived: z.boolean().default(false),
});
export type Product = z.infer<typeof ProductSchema>;

export const OrderLineSchema = z.object({
  productId: z.string(),
  name: z.string(), // snapshot at sale time
  quantity: z.number().positive(),
  unit: z.string(),
  unitPriceVnd: z.number().int().nonnegative(),
  vatRate: z.number(),
  discountVnd: z.number().int().nonnegative().default(0),
});
export type OrderLine = z.infer<typeof OrderLineSchema>;

export const PaymentMethodSchema = z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'EWALLET', 'OTHER']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  number: z.string(), // POS-2026-000123
  lines: z.array(OrderLineSchema).min(1, 'Đơn hàng phải có ít nhất 1 dòng.'),
  paymentMethod: PaymentMethodSchema,
  customerName: z.string().optional(),
  customerTaxCode: TaxCodeSchema.optional(),
  /** ISO timestamp of when the sale was rung up on the device. */
  soldAt: z.string().datetime(),
  /** Invoice issued for this order; null until issued. */
  invoiceId: z.string().nullable().default(null),
});
export type Order = z.infer<typeof OrderSchema>;

export const InvoiceStatusSchema = z.enum([
  'DRAFT',
  'SIGNED', // signed locally, not yet transmitted to GDT
  'TRANSMITTED', // accepted by GDT, có mã của cơ quan thuế
  'REJECTED', // GDT returned an error
  'VOIDED', // thay thế / hủy bỏ
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  orderId: z.string(),
  /** Ký hiệu mẫu số hóa đơn: e.g. "1/001" — see Thông tư 78/2021. */
  templateCode: z.string(),
  /** Ký hiệu hóa đơn: e.g. "C25TAA". */
  serial: z.string(),
  /** Số hóa đơn: sequential within (templateCode, serial). */
  number: z.number().int().positive(),
  status: InvoiceStatusSchema,
  /** Mã của cơ quan thuế — assigned by GDT on successful transmission. */
  gdtCode: z.string().nullable().default(null),
  issuedAt: z.string().datetime(),
  totalBeforeVatVnd: z.number().int().nonnegative(),
  totalVatVnd: z.number().int().nonnegative(),
  totalVnd: z.number().int().nonnegative(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

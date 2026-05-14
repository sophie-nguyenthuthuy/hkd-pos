# Compliance references

Primary legal sources. Cite these in PRs that change tax math, invoice
schemas, or filing flows.

## Nghị định 70/2025/NĐ-CP — Amends NĐ 123/2020/NĐ-CP on invoices

- Effective: **1 June 2025**
- Mandates HĐĐT khởi tạo từ máy tính tiền (HĐĐT-MTT) for:
  - Hộ kinh doanh, cá nhân kinh doanh nộp thuế theo phương pháp khoán with
    annual revenue **≥ 1 tỷ VND**.
  - Doanh nghiệp, hộ KD bán hàng hóa, cung cấp dịch vụ trực tiếp đến người
    tiêu dùng theo mô hình kinh doanh (siêu thị, F&B, vận tải hành khách,
    vui chơi giải trí, …).
- Data must be transmitted to GDT — directly or via an authorised provider —
  on the same day the invoice is issued.

## Thông tư 78/2021/TT-BTC — Implements NĐ 123/2020

- XML schema for HĐĐT: structure, mandatory fields, signing requirements.
- Ký hiệu mẫu số hóa đơn (template code) and ký hiệu hóa đơn (serial) format.
- Quy định về mã của cơ quan thuế (the GDT-assigned code).
- Numbering rules: monotonic per (template, serial), no gaps, no reuse.

## Thông tư 40/2021/TT-BTC — Presumptive tax (thuế khoán)

- Hộ kinh doanh + cá nhân kinh doanh dưới 100M VND/năm: miễn VAT + TNCN.
- Rates above the threshold (`packages/shared/src/tax/rates.ts`):
  - Phân phối, cung cấp hàng hóa: 1% VAT + 0.5% TNCN
  - Dịch vụ, xây dựng không bao thầu NVL: 5% VAT + 2% TNCN
  - Sản xuất, vận tải, dịch vụ gắn với hàng hóa: 3% VAT + 1.5% TNCN
  - Hoạt động kinh doanh khác: 2% VAT + 1% TNCN
- Filing forms:
  - 01/CNKD — Tờ khai thuế đối với hộ kinh doanh, cá nhân kinh doanh (khoán)
  - 01/TKN-CNKD — Tờ khai thuế hộ KD theo từng lần phát sinh

## Luật Quản lý thuế 38/2019/QH14

- General framework for tax administration.
- Article 8: electronic transactions in tax administration — basis for the
  eTax / eTax Mobile platforms.

## Nghị định 13/2023/NĐ-CP — Personal data protection

- Customer phone, name, and tax code captured at the POS are personal data.
- Required: a privacy notice, lawful basis, data-subject rights handling.
- We minimize: only `customerName`, `customerTaxCode`, and `customerPhone` are
  persisted, only when the customer requests an invoice in their name.

## Operational notes

- The exemption threshold (100M VND) and the NĐ70 threshold (1B VND) are
  defined as constants in `packages/shared/src/tax/rates.ts`. If GDT changes
  either, update there and re-run `packages/shared` tests.
- Rates are pinned to Decree/Circular version. When TT 40 is amended,
  bump the export and add a versioned variant rather than mutating the
  existing constants — historical filings must remain reproducible.

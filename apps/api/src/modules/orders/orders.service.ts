import { Injectable } from '@nestjs/common';
import { DomainError, ErrorCode, PaymentMethodSchema, TaxCodeSchema, computeInvoiceTotals } from '@hkd-pos/shared';
import { Prisma } from '@prisma/client';
import { ulid } from 'ulid';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service.js';

export const CreateOrderDto = z.object({
  /** Device-generated id for idempotency under flaky connections. */
  clientOrderRef: z.string().min(1).max(64),
  paymentMethod: PaymentMethodSchema,
  customerName: z.string().max(255).optional(),
  customerTaxCode: TaxCodeSchema.optional(),
  customerPhone: z.string().max(32).optional(),
  soldAt: z.string().datetime(),
  lines: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().positive(),
        unitPriceVnd: z.number().int().nonnegative().optional(),
        discountVnd: z.number().int().nonnegative().default(0),
      }),
    )
    .min(1),
});
export type CreateOrderDto = z.infer<typeof CreateOrderDto>;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an order. Idempotent on (businessId, clientOrderRef) so the mobile
   * app can safely retry after a network blip without double-charging.
   */
  async create(businessId: string, dto: CreateOrderDto) {
    const existing = await this.prisma.order.findUnique({
      where: { clientOrderRef: dto.clientOrderRef },
      include: { lines: true },
    });
    if (existing) {
      if (existing.businessId !== businessId) {
        throw new DomainError(ErrorCode.VALIDATION_FAILED, 'clientOrderRef collision');
      }
      return existing;
    }

    const productIds = dto.lines.map((l) => l.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, businessId },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const enriched = dto.lines.map((l) => {
      const p = byId.get(l.productId);
      if (!p) throw new DomainError(ErrorCode.PRODUCT_NOT_FOUND, `Sản phẩm ${l.productId} không tồn tại.`);
      return {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        unitPriceVnd: l.unitPriceVnd ?? Number(p.unitPriceVnd),
        vatRateBps: p.vatRateBps,
        discountVnd: l.discountVnd,
        quantity: l.quantity,
      };
    });

    const totals = computeInvoiceTotals(
      enriched.map((l) => ({
        productId: l.productId,
        name: l.name,
        quantity: l.quantity,
        unit: l.unit,
        unitPriceVnd: l.unitPriceVnd,
        vatRate: l.vatRateBps / 10_000,
        discountVnd: l.discountVnd,
      })),
    );

    return this.prisma.$transaction(async (tx) => {
      const number = await nextOrderNumber(tx, businessId);
      const orderId = ulid();
      return tx.order.create({
        data: {
          id: orderId,
          businessId,
          number,
          paymentMethod: dto.paymentMethod,
          customerName: dto.customerName,
          customerTaxCode: dto.customerTaxCode,
          customerPhone: dto.customerPhone,
          totalBeforeVatVnd: BigInt(totals.totalBeforeVatVnd),
          totalVatVnd: BigInt(totals.totalVatVnd),
          totalVnd: BigInt(totals.totalVnd),
          soldAt: new Date(dto.soldAt),
          clientOrderRef: dto.clientOrderRef,
          lines: {
            create: enriched.map((l, idx) => {
              const gross = l.unitPriceVnd * l.quantity;
              const net = Math.max(0, gross - l.discountVnd);
              const vat = Math.round(net * (l.vatRateBps / 10_000));
              return {
                id: ulid(),
                productId: l.productId,
                name: l.name,
                unit: l.unit,
                quantity: new Prisma.Decimal(l.quantity),
                unitPriceVnd: BigInt(l.unitPriceVnd),
                vatRateBps: l.vatRateBps,
                discountVnd: BigInt(l.discountVnd),
                netVnd: BigInt(net),
                vatVnd: BigInt(vat),
                lineNumber: idx + 1,
              };
            }),
          },
        },
        include: { lines: true },
      });
    });
  }

  list(businessId: string, params: { from?: Date; to?: Date; take?: number }) {
    return this.prisma.order.findMany({
      where: {
        businessId,
        soldAt: { gte: params.from, lte: params.to },
      },
      orderBy: { soldAt: 'desc' },
      take: params.take ?? 50,
      include: { lines: true, invoice: true },
    });
  }
}

async function nextOrderNumber(tx: Prisma.TransactionClient, businessId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `POS-${year}-`;
  const last = await tx.order.findFirst({
    where: { businessId, number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const lastSeq = last ? Number(last.number.slice(prefix.length)) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(6, '0')}`;
}

import { Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '@hkd-pos/shared';
import { ulid } from 'ulid';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service.js';

export const UpsertProductDto = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  unit: z.string().min(1).max(32),
  unitPriceVnd: z.number().int().nonnegative(),
  /** Whole-number percent (0 / 5 / 8 / 10). Stored as basis points. */
  vatRatePercent: z.union([z.literal(0), z.literal(5), z.literal(8), z.literal(10)]),
});
export type UpsertProductDto = z.infer<typeof UpsertProductDto>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(businessId: string) {
    return this.prisma.product.findMany({
      where: { businessId, archived: false },
      orderBy: [{ name: 'asc' }],
    });
  }

  async upsert(businessId: string, dto: UpsertProductDto) {
    const vatRateBps = dto.vatRatePercent * 100;
    return this.prisma.product.upsert({
      where: { businessId_sku: { businessId, sku: dto.sku } },
      update: {
        name: dto.name,
        unit: dto.unit,
        unitPriceVnd: BigInt(dto.unitPriceVnd),
        vatRateBps,
      },
      create: {
        id: ulid(),
        businessId,
        sku: dto.sku,
        name: dto.name,
        unit: dto.unit,
        unitPriceVnd: BigInt(dto.unitPriceVnd),
        vatRateBps,
      },
    });
  }

  async archive(businessId: string, productId: string): Promise<void> {
    const result = await this.prisma.product.updateMany({
      where: { id: productId, businessId },
      data: { archived: true },
    });
    if (result.count === 0) {
      throw new DomainError(ErrorCode.PRODUCT_NOT_FOUND, 'Sản phẩm không tồn tại.');
    }
  }
}

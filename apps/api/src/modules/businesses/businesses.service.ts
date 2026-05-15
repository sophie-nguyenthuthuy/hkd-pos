import { BusinessSectorSchema, DomainError, ErrorCode, TaxCodeSchema } from '@hkd-pos/shared';
import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import { z } from 'zod';

import type { PrismaService } from '../../prisma/prisma.service.js';

export const CreateBusinessDto = z.object({
  taxCode: TaxCodeSchema,
  name: z.string().min(1).max(255),
  address: z.string().min(1).max(500),
  sector: BusinessSectorSchema,
  ownerName: z.string().min(1).max(255),
});
export type CreateBusinessDto = z.infer<typeof CreateBusinessDto>;

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new DomainError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'User not found');

    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          id: ulid(),
          taxCode: dto.taxCode,
          name: dto.name,
          address: dto.address,
          sector: dto.sector,
          ownerName: dto.ownerName,
          ownerPhone: user.phone,
          ownerEmail: user.email,
        },
      });
      await tx.businessMember.create({
        data: { id: ulid(), businessId: business.id, userId, role: 'OWNER' },
      });
      return business;
    });
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.businessMember.findMany({
      where: { userId },
      include: { business: true },
    });
    return memberships.map((m) => ({ ...m.business, role: m.role }));
  }

  async assertMember(userId: string, businessId: string): Promise<void> {
    const m = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (!m) throw new DomainError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Forbidden');
  }
}

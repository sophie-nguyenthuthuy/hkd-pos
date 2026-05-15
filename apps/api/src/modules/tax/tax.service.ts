import { DomainError, ErrorCode, annualizeRevenue, computePresumptiveTax } from '@hkd-pos/shared';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ulid } from 'ulid';

import type { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Forecast the tax owed if revenue continues at the current pace through year-end.
   * Used by the mobile "Thuế dự kiến" widget on the home screen.
   */
  async forecast(businessId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Business not found');

    const now = new Date();
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - yearStart.getTime()) / 86_400_000));

    const agg = await this.prisma.order.aggregate({
      where: { businessId, soldAt: { gte: yearStart, lte: now } },
      _sum: { totalVnd: true },
    });
    const ytdRevenue = Number(agg._sum.totalVnd ?? 0n);

    const annualized = annualizeRevenue(ytdRevenue, daysElapsed);
    const result = computePresumptiveTax(business.sector, annualized);

    return {
      ytdRevenueVnd: ytdRevenue,
      daysElapsed,
      projectedAnnualRevenueVnd: annualized,
      ...result,
    };
  }

  /** Build a draft declaration for a given period from order data. */
  async draftDeclaration(businessId: string, period: 'MONTH' | 'QUARTER', periodStart: Date) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Business not found');

    const periodEnd = endOfPeriod(period, periodStart);
    const agg = await this.prisma.order.aggregate({
      where: { businessId, soldAt: { gte: periodStart, lte: periodEnd } },
      _sum: { totalVnd: true },
    });
    const revenueVnd = Number(agg._sum.totalVnd ?? 0n);

    // Annualize for exemption-threshold check, then prorate back to period days.
    const periodDays = Math.max(
      1,
      Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86_400_000),
    );
    const annualRevenue = annualizeRevenue(revenueVnd, periodDays);
    const annualTax = computePresumptiveTax(business.sector, annualRevenue);

    const vatVnd = Math.round((annualTax.vatVnd / 365) * periodDays);
    const pitVnd = Math.round((annualTax.pitVnd / 365) * periodDays);

    const formPayload: Prisma.InputJsonValue = {
      sector: business.sector,
      rates: { vatRate: annualTax.rates.vatRate, pitRate: annualTax.rates.pitRate },
      exempt: annualTax.exempt,
    };

    return this.prisma.taxDeclaration.upsert({
      where: { businessId_period_periodStart: { businessId, period, periodStart } },
      update: {
        periodEnd,
        revenueVnd: BigInt(revenueVnd),
        vatVnd: BigInt(vatVnd),
        pitVnd: BigInt(pitVnd),
        totalDueVnd: BigInt(vatVnd + pitVnd),
        status: 'DRAFT',
        formPayload,
      },
      create: {
        id: ulid(),
        businessId,
        period,
        periodStart,
        periodEnd,
        revenueVnd: BigInt(revenueVnd),
        vatVnd: BigInt(vatVnd),
        pitVnd: BigInt(pitVnd),
        totalDueVnd: BigInt(vatVnd + pitVnd),
        status: 'DRAFT',
        formPayload,
      },
    });
  }
}

function endOfPeriod(period: 'MONTH' | 'QUARTER', start: Date): Date {
  const d = new Date(start);
  if (period === 'MONTH') {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59));
  }
  // QUARTER
  const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(d.getUTCFullYear(), qStartMonth + 3, 0, 23, 59, 59));
}

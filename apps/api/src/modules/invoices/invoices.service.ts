import { DomainError, ErrorCode, type EInvoicePayload } from '@hkd-pos/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ulid } from 'ulid';

import type { PrismaService } from '../../prisma/prisma.service.js';
import {
  EINVOICE_PROVIDER,
  type EInvoiceProvider,
} from '../../providers/einvoice/provider.interface.js';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EINVOICE_PROVIDER) private readonly provider: EInvoiceProvider,
  ) {}

  /**
   * Issue an HĐĐT-MTT for an order. The flow:
   *   1. Reserve a sequential invoice number under a row-level lock (FOR UPDATE).
   *   2. Build the canonical EInvoicePayload from the order snapshot.
   *   3. Call the configured provider — it signs, transmits to GDT, returns a code.
   *   4. Persist the signed XML and GDT code on the Invoice row.
   *
   * Steps 1 and 4 share a transaction; the provider call is **outside** the
   * transaction to avoid holding a DB lock across the network. If the provider
   * call fails after a number is reserved, the invoice row stays in DRAFT and
   * the next attempt reuses it (the number is not wasted).
   */
  async issueForOrder(businessId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: { lines: true, business: true, invoice: true },
    });
    if (!order) throw new DomainError(ErrorCode.ORDER_NOT_FOUND, 'Đơn hàng không tồn tại.');
    if (order.invoice && order.invoice.status !== 'DRAFT') {
      throw new DomainError(ErrorCode.ORDER_ALREADY_INVOICED, 'Đơn hàng đã có hóa đơn.');
    }

    const config = await this.prisma.eInvoiceConfig.findUnique({ where: { businessId } });
    if (!config) {
      throw new DomainError(
        ErrorCode.EINVOICE_PROVIDER_UNAVAILABLE,
        'Chưa cấu hình HĐĐT cho hộ kinh doanh.',
      );
    }

    // Step 1: reserve invoice number transactionally.
    const reserved =
      order.invoice ??
      (await this.prisma.$transaction(async (tx) => {
        const next = await reserveInvoiceNumber(tx, businessId, config.templateCode, config.serial);
        return tx.invoice.create({
          data: {
            id: ulid(),
            businessId,
            orderId,
            templateCode: config.templateCode,
            serial: config.serial,
            number: next,
            status: 'DRAFT',
            totalBeforeVatVnd: order.totalBeforeVatVnd,
            totalVatVnd: order.totalVatVnd,
            totalVnd: order.totalVnd,
            issuedAt: new Date(),
          },
        });
      }));

    // Step 2: build the provider payload.
    const payload: EInvoicePayload = {
      seller: {
        taxCode: order.business.taxCode,
        name: order.business.name,
        address: order.business.address,
      },
      buyer: {
        ...(order.customerName ? { name: order.customerName } : {}),
        ...(order.customerTaxCode ? { taxCode: order.customerTaxCode } : {}),
      },
      templateCode: reserved.templateCode,
      serial: reserved.serial,
      issuedAt: reserved.issuedAt.toISOString(),
      currency: 'VND',
      lines: order.lines.map((l) => {
        const net = Number(l.netVnd);
        const vat = Number(l.vatVnd);
        return {
          name: l.name,
          unit: l.unit,
          quantity: Number(l.quantity),
          unitPriceVnd: Number(l.unitPriceVnd),
          vatRate: l.vatRateBps / 10_000,
          discountVnd: Number(l.discountVnd),
          netVnd: net,
          vatVnd: vat,
        };
      }),
      totals: {
        totalBeforeVatVnd: Number(order.totalBeforeVatVnd),
        totalVatVnd: Number(order.totalVatVnd),
        totalVnd: Number(order.totalVnd),
      },
    };

    // Step 3: provider call (outside DB tx).
    let issued;
    try {
      issued = await this.provider.issue(payload);
    } catch (err) {
      await this.prisma.invoice.update({
        where: { id: reserved.id },
        data: { status: 'REJECTED' },
      });
      throw err;
    }

    // Step 4: persist the signed result.
    return this.prisma.invoice.update({
      where: { id: reserved.id },
      data: {
        status: issued.gdtCode ? 'TRANSMITTED' : 'SIGNED',
        gdtCode: issued.gdtCode,
        providerInvoiceId: issued.providerInvoiceId,
        lookupUrl: issued.lookupUrl,
        signedPayload: issued.signedXml,
      },
    });
  }

  list(businessId: string, params: { from?: Date; to?: Date }) {
    return this.prisma.invoice.findMany({
      where: { businessId, issuedAt: { gte: params.from, lte: params.to } },
      orderBy: { issuedAt: 'desc' },
      take: 100,
    });
  }
}

async function reserveInvoiceNumber(
  tx: Prisma.TransactionClient,
  businessId: string,
  templateCode: string,
  serial: string,
): Promise<number> {
  // Use a raw locking update to get an atomic sequence per (business, template, serial).
  const rows = await tx.$queryRaw<{ next: number }[]>`
    UPDATE invoice_serials
       SET next = next + 1, "updatedAt" = now()
     WHERE "businessId" = ${businessId}
       AND "templateCode" = ${templateCode}
       AND serial = ${serial}
     RETURNING next - 1 AS next
  `;
  const reserved = rows[0]?.next;
  if (reserved == null) {
    throw new DomainError(
      ErrorCode.EINVOICE_PROVIDER_UNAVAILABLE,
      `Invoice serial (${templateCode}/${serial}) not registered for this business.`,
    );
  }
  return reserved;
}

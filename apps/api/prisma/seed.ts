import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';

const prisma = new PrismaClient();

async function main() {
  const businessId = ulid();
  await prisma.business.upsert({
    where: { taxCode: '0123456789' },
    update: {},
    create: {
      id: businessId,
      taxCode: '0123456789',
      name: 'Quán Cà Phê Demo',
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      sector: 'DISTRIBUTION_SUPPLY',
      ownerName: 'Nguyễn Văn A',
      ownerPhone: '+84912345678',
      products: {
        create: [
          {
            id: ulid(),
            sku: 'CF-001',
            name: 'Cà phê đen',
            unit: 'ly',
            unitPriceVnd: 25_000n,
            vatRateBps: 800,
          },
          {
            id: ulid(),
            sku: 'CF-002',
            name: 'Cà phê sữa',
            unit: 'ly',
            unitPriceVnd: 30_000n,
            vatRateBps: 800,
          },
          {
            id: ulid(),
            sku: 'BM-001',
            name: 'Bánh mì thịt',
            unit: 'ổ',
            unitPriceVnd: 20_000n,
            vatRateBps: 500,
          },
        ],
      },
      invoiceSerials: {
        create: {
          id: ulid(),
          templateCode: '1/001',
          serial: 'C25TAA',
          next: 1,
        },
      },
      einvoiceConfig: {
        create: {
          id: ulid(),
          provider: 'mock',
          templateCode: '1/001',
          serial: 'C25TAA',
        },
      },
    },
  });

  console.warn('Seed complete. Business id:', businessId);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

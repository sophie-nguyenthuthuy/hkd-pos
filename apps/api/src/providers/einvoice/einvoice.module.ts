import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MockEInvoiceProvider } from './mock.provider.js';
import { EINVOICE_PROVIDER, type EInvoiceProvider } from './provider.interface.js';
import { VnptEInvoiceProvider } from './vnpt.provider.js';

@Global()
@Module({
  providers: [
    {
      provide: EINVOICE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EInvoiceProvider => {
        const kind = config.get<string>('EINVOICE_PROVIDER') ?? 'mock';
        switch (kind) {
          case 'mock':
            return new MockEInvoiceProvider();
          case 'vnpt':
            return new VnptEInvoiceProvider(config);
          // TODO(provider): misa, viettel, easyinvoice, fpt
          default:
            throw new Error(`E-invoice provider "${kind}" not yet implemented.`);
        }
      },
    },
  ],
  exports: [EINVOICE_PROVIDER],
})
export class EInvoiceProviderModule {}

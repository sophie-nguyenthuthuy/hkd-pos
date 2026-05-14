import { Module } from '@nestjs/common';

import { BusinessesModule } from '../businesses/businesses.module.js';
import { TaxController } from './tax.controller.js';
import { TaxService } from './tax.service.js';

@Module({
  imports: [BusinessesModule],
  controllers: [TaxController],
  providers: [TaxService],
})
export class TaxModule {}

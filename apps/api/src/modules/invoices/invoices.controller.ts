import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequestUser } from '../../common/decorators/zod-body.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { BusinessesService } from '../businesses/businesses.service.js';
import { InvoicesService } from './invoices.service.js';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/invoices')
export class InvoicesController {
  constructor(
    private readonly svc: InvoicesService,
    private readonly businesses: BusinessesService,
  ) {}

  @Get()
  async list(
    @RequestUser() user: { sub: string },
    @Param('businessId') businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.businesses.assertMember(user.sub, businessId);
    return this.svc.list(businessId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post('issue/:orderId')
  async issue(
    @RequestUser() user: { sub: string },
    @Param('businessId') businessId: string,
    @Param('orderId') orderId: string,
  ) {
    await this.businesses.assertMember(user.sub, businessId);
    return this.svc.issueForOrder(businessId, orderId);
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequestUser } from '../../common/decorators/zod-body.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { BusinessesService } from '../businesses/businesses.service.js';

import type { TaxService } from './tax.service.js';

@ApiTags('tax')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/tax')
export class TaxController {
  constructor(
    private readonly svc: TaxService,
    private readonly businesses: BusinessesService,
  ) {}

  @Get('forecast')
  async forecast(@RequestUser() user: { sub: string }, @Param('businessId') businessId: string) {
    await this.businesses.assertMember(user.sub, businessId);
    return this.svc.forecast(businessId);
  }

  @Post('declarations/draft')
  async draft(
    @RequestUser() user: { sub: string },
    @Param('businessId') businessId: string,
    @Body() body: { period: 'MONTH' | 'QUARTER'; periodStart: string },
  ) {
    await this.businesses.assertMember(user.sub, businessId);
    return this.svc.draftDeclaration(businessId, body.period, new Date(body.periodStart));
  }
}

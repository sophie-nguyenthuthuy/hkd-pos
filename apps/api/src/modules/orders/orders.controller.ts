import { Body, Controller, Get, Param, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequestUser, ZodValidationPipe } from '../../common/decorators/zod-body.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { BusinessesService } from '../businesses/businesses.service.js';

import type { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './orders.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/orders')
export class OrdersController {
  constructor(
    private readonly svc: OrdersService,
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

  @Post()
  @UsePipes(new ZodValidationPipe(CreateOrderDto))
  async create(
    @RequestUser() user: { sub: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateOrderDto,
  ) {
    await this.businesses.assertMember(user.sub, businessId);
    return this.svc.create(businessId, dto);
  }
}

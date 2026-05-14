import { Body, Controller, Delete, Get, Param, Put, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequestUser, ZodValidationPipe } from '../../common/decorators/zod-body.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { BusinessesService } from '../businesses/businesses.service.js';
import { ProductsService, UpsertProductDto } from './products.service.js';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/products')
export class ProductsController {
  constructor(
    private readonly svc: ProductsService,
    private readonly businesses: BusinessesService,
  ) {}

  @Get()
  async list(@RequestUser() user: { sub: string }, @Param('businessId') businessId: string) {
    await this.businesses.assertMember(user.sub, businessId);
    return this.svc.list(businessId);
  }

  @Put()
  @UsePipes(new ZodValidationPipe(UpsertProductDto))
  async upsert(
    @RequestUser() user: { sub: string },
    @Param('businessId') businessId: string,
    @Body() dto: UpsertProductDto,
  ) {
    await this.businesses.assertMember(user.sub, businessId);
    return this.svc.upsert(businessId, dto);
  }

  @Delete(':productId')
  async archive(
    @RequestUser() user: { sub: string },
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ): Promise<void> {
    await this.businesses.assertMember(user.sub, businessId);
    await this.svc.archive(businessId, productId);
  }
}

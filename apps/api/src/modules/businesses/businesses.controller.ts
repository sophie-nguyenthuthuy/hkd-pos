import { Body, Controller, Get, Post, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequestUser, ZodValidationPipe } from '../../common/decorators/zod-body.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

import type { BusinessesService } from './businesses.service.js';
import { CreateBusinessDto } from './businesses.service.js';

@ApiTags('businesses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly svc: BusinessesService) {}

  @Get()
  list(@RequestUser() user: { sub: string }) {
    return this.svc.listForUser(user.sub);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateBusinessDto))
  create(@RequestUser() user: { sub: string }, @Body() dto: CreateBusinessDto) {
    return this.svc.create(user.sub, dto);
  }
}

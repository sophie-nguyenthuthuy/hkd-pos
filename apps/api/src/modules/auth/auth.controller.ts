import { Body, Controller, HttpCode, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ZodValidationPipe } from '../../common/decorators/zod-body.decorator.js';

import type { AuthService } from './auth.service.js';
import { RefreshDto, RequestOtpDto, VerifyOtpDto } from './dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(RequestOtpDto))
  async requestOtp(@Body() dto: RequestOtpDto): Promise<void> {
    await this.auth.requestOtp(dto.phone, dto.purpose);
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(VerifyOtpDto))
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtpAndIssueTokens(dto.phone, dto.otp, dto.purpose, dto.fullName);
  }

  @Post('token/refresh')
  @UsePipes(new ZodValidationPipe(RefreshDto))
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @UsePipes(new ZodValidationPipe(RefreshDto))
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.revokeSession(dto.refreshToken);
  }
}

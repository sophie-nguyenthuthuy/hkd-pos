import { randomBytes, randomInt } from 'node:crypto';

import { DomainError, ErrorCode } from '@hkd-pos/shared';
import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import argon2 from 'argon2';
import { ulid } from 'ulid';

import type { PrismaService } from '../../prisma/prisma.service.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Issue an OTP, rate-limited per phone+purpose to MAX_PER_HOUR.
   * Returns nothing — the code is only delivered out of band.
   */
  async issue(phone: string, purpose: string): Promise<void> {
    const recent = await this.prisma.otpChallenge.count({
      where: {
        phone,
        purpose,
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recent >= MAX_PER_HOUR) {
      throw new DomainError(
        ErrorCode.AUTH_RATE_LIMITED,
        'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau 1 giờ.',
      );
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await argon2.hash(code, { type: argon2.argon2id });

    await this.prisma.otpChallenge.create({
      data: {
        id: ulid(),
        phone,
        codeHash,
        purpose,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await this.deliver(phone, code);
  }

  async verify(phone: string, code: string, purpose: string): Promise<void> {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new DomainError(ErrorCode.AUTH_OTP_INCORRECT, 'Mã OTP không đúng.');
    }
    if (challenge.expiresAt < new Date()) {
      throw new DomainError(ErrorCode.AUTH_OTP_EXPIRED, 'Mã OTP đã hết hạn.');
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      throw new DomainError(
        ErrorCode.AUTH_RATE_LIMITED,
        'Sai mã quá nhiều lần. Hãy yêu cầu mã mới.',
      );
    }

    const ok = await argon2.verify(challenge.codeHash, code);
    if (!ok) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new DomainError(ErrorCode.AUTH_OTP_INCORRECT, 'Mã OTP không đúng.');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
  }

  private async deliver(phone: string, code: string): Promise<void> {
    const provider = this.config.get<string>('SMS_PROVIDER');
    if (provider === 'log' || this.config.get<string>('NODE_ENV') === 'development') {
      // Dev/log mode: write to logs (never logged in production due to redact config).
      this.logger.warn(`[DEV ONLY] OTP for ${phone}: ${code}`);
      return;
    }

    // TODO(provider): wire eSMS / Stringee / Twilio HTTP calls.
    // Production deploys must configure SMS_PROVIDER and supply credentials.
    throw new DomainError(
      ErrorCode.AUTH_RATE_LIMITED,
      `SMS provider "${provider}" not yet implemented.`,
    );
  }
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

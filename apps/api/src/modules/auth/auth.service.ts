import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DomainError, ErrorCode } from '@hkd-pos/shared';
import { ulid } from 'ulid';

import { PrismaService } from '../../prisma/prisma.service.js';
import { OtpService, generateRefreshToken } from './otp.service.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly otp: OtpService,
    private readonly config: ConfigService,
  ) {}

  requestOtp(phone: string, purpose: 'LOGIN' | 'REGISTER'): Promise<void> {
    return this.otp.issue(phone, purpose);
  }

  async verifyOtpAndIssueTokens(
    phone: string,
    code: string,
    purpose: 'LOGIN' | 'REGISTER',
    fullName?: string,
  ): Promise<AuthTokens> {
    await this.otp.verify(phone, code, purpose);

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      if (purpose !== 'REGISTER' || !fullName) {
        throw new DomainError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Tài khoản không tồn tại.');
      }
      user = await this.prisma.user.create({
        data: { id: ulid(), phone, fullName },
      });
    }

    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const hash = hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new DomainError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Phiên đăng nhập không hợp lệ.');
    }
    // Refresh-token rotation: revoke the old one, issue a new pair.
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(session.userId);
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const hash = hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const memberships = await this.prisma.businessMember.findMany({
      where: { userId },
      select: { businessId: true, role: true },
    });
    const businessId = memberships[0]?.businessId;
    const role = memberships[0]?.role;

    const accessTtlSec = parseDuration(this.config.get<string>('JWT_ACCESS_TTL') ?? '15m');
    const refreshTtlMs = parseDuration(this.config.get<string>('JWT_REFRESH_TTL') ?? '30d') * 1000;

    const accessToken = await this.jwt.signAsync(
      { sub: userId, businessId, role },
      { expiresIn: accessTtlSec },
    );

    const refreshToken = generateRefreshToken();
    await this.prisma.session.create({
      data: {
        id: ulid(),
        userId,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlMs),
      },
    });

    return { accessToken, refreshToken, expiresIn: accessTtlSec };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Parse "15m" / "30d" / "1h" / "3600" into seconds. */
function parseDuration(spec: string): number {
  const match = /^(\d+)([smhd])?$/.exec(spec);
  if (!match) throw new Error(`Invalid duration: ${spec}`);
  const value = Number(match[1]);
  const unit = match[2] ?? 's';
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86_400;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

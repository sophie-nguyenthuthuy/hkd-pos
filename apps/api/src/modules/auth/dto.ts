import { PhoneSchema } from '@hkd-pos/shared';
import { z } from 'zod';

export const RequestOtpDto = z.object({
  phone: PhoneSchema,
  purpose: z.enum(['LOGIN', 'REGISTER']).default('LOGIN'),
});
export type RequestOtpDto = z.infer<typeof RequestOtpDto>;

export const VerifyOtpDto = z.object({
  phone: PhoneSchema,
  otp: z.string().regex(/^\d{6}$/),
  purpose: z.enum(['LOGIN', 'REGISTER']).default('LOGIN'),
  /** Required for REGISTER. */
  fullName: z.string().min(1).max(255).optional(),
});
export type VerifyOtpDto = z.infer<typeof VerifyOtpDto>;

export const RefreshDto = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDto = z.infer<typeof RefreshDto>;

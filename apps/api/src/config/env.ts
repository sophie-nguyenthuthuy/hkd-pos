import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  SMS_PROVIDER: z.enum(['esms', 'stringee', 'twilio', 'log']).default('log'),
  ESMS_API_KEY: z.string().optional(),
  ESMS_SECRET_KEY: z.string().optional(),
  ESMS_BRANDNAME: z.string().optional(),

  EINVOICE_PROVIDER: z.enum(['vnpt', 'misa', 'viettel', 'easyinvoice', 'fpt', 'mock']).default('mock'),
  EINVOICE_BASE_URL: z.string().url().optional(),
  EINVOICE_USERNAME: z.string().optional(),
  EINVOICE_PASSWORD: z.string().optional(),
  EINVOICE_TAX_CODE: z.string().optional(),
  EINVOICE_CERT_PATH: z.string().optional(),
  EINVOICE_CERT_PASSWORD: z.string().optional(),

  GDT_BASE_URL: z.string().url().default('https://etaxmobile.gdt.gov.vn'),
  GDT_CLIENT_ID: z.string().optional(),
  GDT_CLIENT_SECRET: z.string().optional(),

  SENTRY_DSN: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = result.data;
  return cached;
}

/** Test-only: reset the cache between tests. */
export function _resetEnvCacheForTests(): void {
  cached = null;
}

import { afterEach, describe, expect, it } from 'vitest';

import { _resetEnvCacheForTests, loadEnv } from './env.js';

const base: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgresql://hkd:hkd@localhost:5432/hkd_pos?schema=public',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

afterEach(() => _resetEnvCacheForTests());

describe('loadEnv', () => {
  it('accepts a valid environment', () => {
    const env = loadEnv(base);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.EINVOICE_PROVIDER).toBe('mock');
  });

  it('rejects short JWT secrets', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'too-short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects invalid DATABASE_URL', () => {
    expect(() => loadEnv({ ...base, DATABASE_URL: 'not-a-url' })).toThrow(/DATABASE_URL/);
  });

  it('parses production env', () => {
    const env = loadEnv({ ...base, NODE_ENV: 'production', PORT: '8080' });
    expect(env.NODE_ENV).toBe('production');
    expect(env.PORT).toBe(8080);
  });
});

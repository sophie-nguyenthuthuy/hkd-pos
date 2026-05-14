import { describe, expect, it } from 'vitest';

import { PhoneSchema, TaxCodeSchema } from '../src/domain/schemas.js';

describe('TaxCodeSchema', () => {
  it('accepts 10-digit MST', () => {
    expect(TaxCodeSchema.parse('0123456789')).toBe('0123456789');
  });

  it('accepts 13-digit branch MST and strips the hyphen', () => {
    expect(TaxCodeSchema.parse('0123456789-001')).toBe('0123456789001');
  });

  it('rejects letters or short codes', () => {
    expect(() => TaxCodeSchema.parse('12345')).toThrow();
    expect(() => TaxCodeSchema.parse('A123456789')).toThrow();
  });
});

describe('PhoneSchema', () => {
  it.each([
    ['0912345678', '+84912345678'],
    ['84912345678', '+84912345678'],
    ['+84912345678', '+84912345678'],
    ['0912 345 678', '+84912345678'],
    ['(091)234-5678', '+84912345678'],
  ])('normalizes %s → %s', (input, expected) => {
    expect(PhoneSchema.parse(input)).toBe(expected);
  });

  it('rejects malformed phones', () => {
    expect(() => PhoneSchema.parse('1234')).toThrow();
    expect(() => PhoneSchema.parse('+8412')).toThrow();
  });
});

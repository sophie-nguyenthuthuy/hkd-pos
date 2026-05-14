/**
 * Stable error codes shared between API and mobile.
 * Add new codes here so both sides agree on the wire format.
 */
export const ErrorCode = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_OTP_EXPIRED: 'AUTH_OTP_EXPIRED',
  AUTH_OTP_INCORRECT: 'AUTH_OTP_INCORRECT',
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  // Domain
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_INVOICED: 'ORDER_ALREADY_INVOICED',
  INVOICE_ALREADY_VOIDED: 'INVOICE_ALREADY_VOIDED',

  // E-invoice
  EINVOICE_PROVIDER_UNAVAILABLE: 'EINVOICE_PROVIDER_UNAVAILABLE',
  EINVOICE_PROVIDER_REJECTED: 'EINVOICE_PROVIDER_REJECTED',
  EINVOICE_SIGNING_FAILED: 'EINVOICE_SIGNING_FAILED',

  // Tax / GDT
  TAX_DECLARATION_PERIOD_CLOSED: 'TAX_DECLARATION_PERIOD_CLOSED',
  GDT_TRANSMISSION_FAILED: 'GDT_TRANSMISSION_FAILED',

  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

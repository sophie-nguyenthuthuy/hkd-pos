import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { ErrorCode, DomainError } from '@hkd-pos/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? req.id;

    const { status, body } = this.translate(exception);
    if (status >= 500) {
      this.logger.error({ err: exception, requestId, path: req.url }, 'unhandled error');
    }

    void res.status(status).send({ ...body, requestId });
  }

  private translate(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof DomainError) {
      return { status: domainStatus(exception.code), body: { code: exception.code, message: exception.message, details: exception.details } };
    }

    if (exception instanceof ZodError) {
      return {
        status: 400,
        body: { code: ErrorCode.VALIDATION_FAILED, message: 'Validation failed', details: exception.flatten() },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message = typeof response === 'string' ? response : (response as { message?: string }).message ?? exception.message;
      const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR';
      return { status, body: { code, message, details: typeof response === 'object' ? response : undefined } };
    }

    return {
      status: 500,
      body: { code: ErrorCode.INTERNAL_ERROR, message: 'Internal server error' },
    };
  }
}

function domainStatus(code: string): number {
  switch (code) {
    case ErrorCode.AUTH_INVALID_CREDENTIALS:
    case ErrorCode.AUTH_OTP_INCORRECT:
    case ErrorCode.AUTH_OTP_EXPIRED:
      return 401;
    case ErrorCode.AUTH_RATE_LIMITED:
      return 429;
    case ErrorCode.VALIDATION_FAILED:
      return 400;
    case ErrorCode.PRODUCT_NOT_FOUND:
    case ErrorCode.ORDER_NOT_FOUND:
      return 404;
    case ErrorCode.ORDER_ALREADY_INVOICED:
    case ErrorCode.INVOICE_ALREADY_VOIDED:
    case ErrorCode.TAX_DECLARATION_PERIOD_CLOSED:
      return 409;
    case ErrorCode.EINVOICE_PROVIDER_UNAVAILABLE:
    case ErrorCode.GDT_TRANSMISSION_FAILED:
      return 502;
    case ErrorCode.EINVOICE_PROVIDER_REJECTED:
    case ErrorCode.EINVOICE_SIGNING_FAILED:
      return 422;
    default:
      return 500;
  }
}

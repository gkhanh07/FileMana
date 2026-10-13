import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

const DEFAULT_CODES: Record<number, string> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'FILE_TOO_LARGE',
  429: 'TOO_MANY_REQUESTS',
};

// Every error leaves the API as { statusCode, code, message }; internals never leak.
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request & { user?: { id: string } }>();
    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      const obj =
        typeof body === 'object' ? (body as Record<string, unknown>) : {};
      code =
        typeof obj.code === 'string'
          ? obj.code
          : (DEFAULT_CODES[statusCode] ?? 'ERROR');
      const msg = obj.message ?? body;
      message = Array.isArray(msg)
        ? msg.join('; ')
        : typeof msg === 'string'
          ? msg
          : 'Error';
    }
    // NFR-15: every 5xx is logged with enough context to trace it.
    if (statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.url} user=${req.user?.id ?? '-'}: ${exception instanceof Error ? (exception.stack ?? exception.message) : String(exception)}`,
      );
    }
    res.status(statusCode).json({ statusCode, code, message });
  }
}

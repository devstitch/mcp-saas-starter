import { AuthorizationError } from '@mcp-saas-starter/authorization';
import { AppError, InternalError, RateLimitError, ToolInputError } from '@mcp-saas-starter/shared';

export type ClientErrorBody = {
  error: string;
  error_description: string;
  correlation_id?: string;
  retry_after_seconds?: number;
  details?: unknown;
};

export type ClientError = {
  status: number;
  body: ClientErrorBody;
  headers?: Record<string, string>;
};

type LogFn = (...args: unknown[]) => void;

function detailText(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

/**
 * Map any thrown value to a client-safe body.
 * Internal failures are logged with a correlation id. The body never includes the cause.
 */
export function toClientError(error: unknown, log: LogFn = console.error): ClientError {
  if (error instanceof ToolInputError) {
    return {
      status: 400,
      body: {
        error: 'validation_error',
        error_description: error.message,
        details: error.issues,
      },
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      status: 403,
      body: {
        error: 'unauthorized',
        error_description: 'Not found or not permitted.',
      },
    };
  }

  if (error instanceof RateLimitError) {
    return {
      status: error.status,
      headers: { 'Retry-After': String(error.retryAfterSeconds) },
      body: {
        error: error.code,
        error_description: error.message,
        retry_after_seconds: error.retryAfterSeconds,
      },
    };
  }

  if (error instanceof InternalError) {
    log(`[${error.correlationId}]`, detailText(error.causeDetail ?? error));
    return {
      status: 500,
      body: {
        error: 'internal_error',
        error_description: 'Internal server error',
        correlation_id: error.correlationId,
      },
    };
  }

  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: error.code,
        error_description: error.message,
      },
    };
  }

  const internal = new InternalError(error);
  log(`[${internal.correlationId}]`, detailText(error));
  return {
    status: 500,
    body: {
      error: 'internal_error',
      error_description: 'Internal server error',
      correlation_id: internal.correlationId,
    },
  };
}

/** Text for an MCP tool or resource error result. */
export function toolErrorText(error: unknown, log?: LogFn): string {
  const client = toClientError(error, log);
  if (client.body.correlation_id) {
    return `${client.body.error_description} Reference ${client.body.correlation_id}.`;
  }
  return client.body.error_description;
}

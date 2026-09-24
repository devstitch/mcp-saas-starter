function createCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('validation_error', 400, message);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required.') {
    super('unauthenticated', 401, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not permitted.') {
    super('unauthorized', 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super('not_found', 404, message);
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message?: string) {
    super(
      'rate_limit_reached',
      429,
      message ?? `Rate limit reached. Retry after ${retryAfterSeconds} seconds.`,
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ProtectedActionPendingError extends AppError {
  constructor(message = 'Pending approval. The action was not completed.') {
    super('protected_action_pending', 409, message);
  }
}

/** Safe client message only. The cause is for server logs, never for the response body. */
export class InternalError extends AppError {
  readonly correlationId: string;
  readonly causeDetail: unknown;

  constructor(cause?: unknown, correlationId = createCorrelationId()) {
    super('internal_error', 500, 'Internal server error');
    this.correlationId = correlationId;
    this.causeDetail = cause;
  }
}

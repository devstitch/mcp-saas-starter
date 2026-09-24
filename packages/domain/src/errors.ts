import {
  NotFoundError as SharedNotFoundError,
  ValidationError as SharedValidationError,
} from '@mcp-saas-starter/shared';

export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export class NotFoundError extends SharedNotFoundError {
  constructor(message: string) {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string) {
    super('FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends SharedValidationError {
  constructor(message: string) {
    super(message);
  }
}

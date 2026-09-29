import { ErrorCode } from '@datachan/shared-types';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed or missing token', details?: any) {
    super('AUTHENTICATION_ERROR', message, 401, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied to this resource', details?: any) {
    super('AUTHORIZATION_ERROR', message, 403, details);
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      'RESOURCE_NOT_FOUND',
      id ? `${resource} with identifier '${id}' was not found` : `${resource} was not found`,
      404
    );
  }
}

export class InvalidRequestError extends AppError {
  constructor(message: string, details?: any) {
    super('INVALID_REQUEST', message, 400, details);
  }
}

export class InvalidQueryError extends AppError {
  constructor(message: string, details?: any) {
    super('INVALID_QUERY', message, 400, details);
  }
}

export class UnsupportedOperationError extends AppError {
  constructor(operation: string) {
    super(
      'UNSUPPORTED_OPERATION',
      `The operation '${operation}' is not supported in Version 1 sandbox`,
      400
    );
  }
}

export class InvalidCollectionError extends AppError {
  constructor(collection: string) {
    super(
      'INVALID_COLLECTION',
      `The collection '${collection}' is invalid or access is restricted`,
      400
    );
  }
}

export class QueryLimitExceededError extends AppError {
  constructor(message = 'Query exceeded resource limits') {
    super('QUERY_LIMIT_EXCEEDED', message, 429);
  }
}

export class ExecutionTimeoutError extends AppError {
  constructor(timeoutMs: number) {
    super(
      'EXECUTION_TIMEOUT',
      `Query execution exceeded sandbox limit of ${timeoutMs}ms`,
      408
    );
  }
}

export class ChallengeFailedError extends AppError {
  constructor(feedback: string, details?: any) {
    super('CHALLENGE_FAILED', feedback, 400, details);
  }
}

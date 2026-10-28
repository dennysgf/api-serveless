export const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  CITY_NOT_FOUND: 'CITY_NOT_FOUND',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class InvalidRequestError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.INVALID_REQUEST, 400, message);
    this.name = 'InvalidRequestError';
  }
}

export class CityNotFoundError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.CITY_NOT_FOUND, 404, message);
    this.name = 'CityNotFoundError';
  }
}

export class UpstreamError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.UPSTREAM_ERROR, 502, message);
    this.name = 'UpstreamError';
  }
}

export class InternalError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.INTERNAL_ERROR, 500, message);
    this.name = 'InternalError';
  }
}

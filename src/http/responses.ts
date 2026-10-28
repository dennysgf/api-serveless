import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import type { AppError } from '../errors/app-error.js';
import { ERROR_CODES } from '../errors/app-error.js';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const INTERNAL_MESSAGE = 'Error interno del servidor';

export const jsonResponse = (
  statusCode: number,
  body: unknown,
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

export const errorResponse = (error: AppError): APIGatewayProxyStructuredResultV2 =>
  jsonResponse(error.statusCode, {
    error: { code: error.code, message: error.message },
  });

export const internalErrorResponse = (): APIGatewayProxyStructuredResultV2 =>
  jsonResponse(500, {
    error: { code: ERROR_CODES.INTERNAL_ERROR, message: INTERNAL_MESSAGE },
  });

import type {
  APIGatewayProxyEventQueryStringParameters,
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';

import type { WeatherService } from '../app/weather-service.js';
import { AppError } from '../errors/app-error.js';
import type { Logger } from '../logging/logger.js';
import { errorFields } from '../logging/logger.js';

import { errorResponse, internalErrorResponse, jsonResponse } from './responses.js';

export type WeatherHandlerDependencies = {
  readonly weatherService: WeatherService;
  readonly logger: Logger;
};

export type WeatherHandlerEvent = Pick<APIGatewayProxyEventV2, 'queryStringParameters'>;

export type WeatherHandlerContext = Pick<Context, 'awsRequestId'>;

export const createWeatherHandler =
  ({ weatherService, logger }: WeatherHandlerDependencies) =>
  async (
    event: WeatherHandlerEvent,
    context: WeatherHandlerContext,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const requestLogger = logger.child({ requestId: context.awsRequestId });
    const startedAt = Date.now();

    try {
      const queryParameters: APIGatewayProxyEventQueryStringParameters =
        event.queryStringParameters ?? {};
      const { city } = queryParameters;
      const report = await weatherService.getWeather(city);
      requestLogger.info('request completed', {
        statusCode: 200,
        durationMs: Date.now() - startedAt,
      });
      return jsonResponse(200, report);
    } catch (error) {
      if (error instanceof AppError) {
        const fields = {
          statusCode: error.statusCode,
          code: error.code,
          durationMs: Date.now() - startedAt,
        };
        if (error.statusCode >= 500) {
          requestLogger.error('request failed', { ...fields, ...errorFields(error) });
        } else {
          requestLogger.warn('request rejected', fields);
        }
        return errorResponse(error);
      }

      requestLogger.error('unhandled error', {
        statusCode: 500,
        durationMs: Date.now() - startedAt,
        ...errorFields(error),
      });
      return internalErrorResponse();
    }
  };

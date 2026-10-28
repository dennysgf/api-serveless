import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import { createWeatherService } from '../../src/app/weather-service.js';
import type { MetClient } from '../../src/clients/met-client.js';
import { UpstreamError } from '../../src/errors/app-error.js';
import { createWeatherHandler } from '../../src/http/weather-handler.js';
import { createLogger } from '../../src/logging/logger.js';

const bogota = {
  name: 'Bogotá',
  country: 'Colombia',
  latitude: 4.60971,
  longitude: -74.08175,
  timezone: 'America/Bogota',
};

const currentBogota = {
  time: '2026-10-27T09:00',
  temperature: 14.2,
  relativeHumidity: 78,
  windSpeed: 6.5,
  weatherCode: 2,
  units: { temperature: '°C', relativeHumidity: '%', windSpeed: 'km/h' },
};

const createFakeClient = (overrides: Partial<MetClient> = {}): MetClient => ({
  findLocation: vi.fn<MetClient['findLocation']>().mockResolvedValue(bogota),
  getCurrentConditions: vi.fn<MetClient['getCurrentConditions']>().mockResolvedValue(currentBogota),
  ...overrides,
});

const setup = (client: MetClient) => {
  const lines: string[] = [];
  const logger = createLogger({
    level: 'debug',
    write: (line) => {
      lines.push(line);
    },
  });
  const handler = createWeatherHandler({
    weatherService: createWeatherService(client),
    logger,
  });
  return { handler, lines };
};

const call = (
  handler: ReturnType<typeof setup>['handler'],
  city: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> =>
  handler(city === undefined ? {} : { queryStringParameters: { city } }, { awsRequestId: 'req-1' });

const parseBody = (response: APIGatewayProxyStructuredResultV2): unknown =>
  JSON.parse(response.body ?? '');

describe('createWeatherHandler', () => {
  it('returns 200 with the public weather contract', async () => {
    const { handler } = setup(createFakeClient());

    const response = await call(handler, 'Bogota');

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toMatchObject({
      city: 'Bogotá',
      country: 'Colombia',
      current: {
        temperature: { value: 14.2, unit: '°C' },
        condition: 'Parcialmente nublado',
      },
    });
  });

  it('returns 400 INVALID_REQUEST when city is missing', async () => {
    const client = createFakeClient();
    const { handler } = setup(client);

    const response = await call(handler, undefined);

    expect(response.statusCode).toBe(400);
    expect(parseBody(response)).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    expect(client.findLocation).not.toHaveBeenCalled();
  });

  it('returns 404 CITY_NOT_FOUND when geocoding has no match', async () => {
    const { handler } = setup(
      createFakeClient({
        findLocation: vi.fn<MetClient['findLocation']>().mockResolvedValue(undefined),
      }),
    );

    const response = await call(handler, 'Ciudadinventada');

    expect(response.statusCode).toBe(404);
    expect(parseBody(response)).toEqual({
      error: {
        code: 'CITY_NOT_FOUND',
        message: "No se encontró la ciudad 'Ciudadinventada'",
      },
    });
  });

  it('returns 502 UPSTREAM_ERROR when the weather service fails', async () => {
    const { handler } = setup(
      createFakeClient({
        findLocation: vi
          .fn<MetClient['findLocation']>()
          .mockRejectedValue(new UpstreamError('No se pudo consultar el servicio de clima')),
      }),
    );

    const response = await call(handler, 'Bogota');

    expect(response.statusCode).toBe(502);
    expect(parseBody(response)).toMatchObject({ error: { code: 'UPSTREAM_ERROR' } });
  });

  it('returns a generic 500 without leaking internal details', async () => {
    const { handler } = setup(
      createFakeClient({
        findLocation: vi
          .fn<MetClient['findLocation']>()
          .mockRejectedValue(new TypeError('secret internal detail')),
      }),
    );

    const response = await call(handler, 'Bogota');

    expect(response.statusCode).toBe(500);
    expect(parseBody(response)).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
    });
    expect(response.body).not.toContain('secret internal detail');
  });

  it('includes the request identifier in every log entry', async () => {
    const { handler, lines } = setup(createFakeClient());

    await call(handler, 'Bogota');

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '')).toMatchObject({
      requestId: 'req-1',
      level: 'info',
      message: 'request completed',
    });
  });
});

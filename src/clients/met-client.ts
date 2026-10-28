import { z } from 'zod';

import type { CurrentConditions, GeocodedLocation } from '../domain/weather-report.js';
import { UpstreamError } from '../errors/app-error.js';

const FAILURE_MESSAGE = 'No se pudo consultar el servicio de clima';

const geocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        country: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        timezone: z.string(),
      }),
    )
    .optional(),
});

const forecastResponseSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    wind_speed_10m: z.number(),
    weather_code: z.number(),
  }),
  current_units: z.object({
    temperature_2m: z.string(),
    relative_humidity_2m: z.string(),
    wind_speed_10m: z.string(),
  }),
});

export type MetClientOptions = {
  readonly geocodingUrl: string;
  readonly forecastUrl: string;
  readonly timeoutMs: number;
  readonly fetchFn?: typeof fetch;
};

export type MetClient = {
  readonly findLocation: (city: string) => Promise<GeocodedLocation | undefined>;
  readonly getCurrentConditions: (
    latitude: number,
    longitude: number,
  ) => Promise<CurrentConditions>;
};

const buildUrl = (baseUrl: string, path: string, params: Record<string, string>): URL => {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
};

const fetchJson = async <T>(
  fetchFn: typeof fetch,
  url: URL,
  timeoutMs: number,
  schema: z.ZodType<T>,
): Promise<T> => {
  let response: Response;
  try {
    response = await fetchFn(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new UpstreamError(FAILURE_MESSAGE);
  }

  if (!response.ok) {
    throw new UpstreamError(FAILURE_MESSAGE);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new UpstreamError(FAILURE_MESSAGE);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new UpstreamError(FAILURE_MESSAGE);
  }
  return parsed.data;
};

export const createMetClient = (options: MetClientOptions): MetClient => {
  const { geocodingUrl, forecastUrl, timeoutMs, fetchFn = fetch } = options;

  return {
    findLocation: async (city) => {
      const url = buildUrl(geocodingUrl, 'search', {
        name: city,
        count: '1',
        language: 'es',
      });
      const body = await fetchJson(fetchFn, url, timeoutMs, geocodingResponseSchema);
      const [first] = body.results ?? [];
      if (first === undefined) {
        return undefined;
      }
      return {
        name: first.name,
        country: first.country,
        latitude: first.latitude,
        longitude: first.longitude,
        timezone: first.timezone,
      };
    },

    getCurrentConditions: async (latitude, longitude) => {
      const url = buildUrl(forecastUrl, 'forecast', {
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
        timezone: 'auto',
      });
      const body = await fetchJson(fetchFn, url, timeoutMs, forecastResponseSchema);
      return {
        time: body.current.time,
        temperature: body.current.temperature_2m,
        relativeHumidity: body.current.relative_humidity_2m,
        windSpeed: body.current.wind_speed_10m,
        weatherCode: body.current.weather_code,
        units: {
          temperature: body.current_units.temperature_2m,
          relativeHumidity: body.current_units.relative_humidity_2m,
          windSpeed: body.current_units.wind_speed_10m,
        },
      };
    },
  };
};

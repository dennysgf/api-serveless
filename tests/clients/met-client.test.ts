import { describe, expect, it, vi } from 'vitest';

import { createMetClient } from '../../src/clients/met-client.js';
import { UpstreamError } from '../../src/errors/app-error.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const geocodingBody = {
  results: [
    {
      name: 'Bogotá',
      country: 'Colombia',
      latitude: 4.60971,
      longitude: -74.08175,
      timezone: 'America/Bogota',
    },
  ],
};

const forecastBody = {
  current: {
    time: '2026-10-27T09:00',
    temperature_2m: 14.2,
    relative_humidity_2m: 78,
    wind_speed_10m: 6.5,
    weather_code: 2,
  },
  current_units: {
    temperature_2m: '°C',
    relative_humidity_2m: '%',
    wind_speed_10m: 'km/h',
  },
};

const baseOptions = {
  geocodingUrl: 'https://geocoding.test/v1',
  forecastUrl: 'https://forecast.test/v1',
  timeoutMs: 5000,
};

describe('createMetClient', () => {
  describe('findLocation', () => {
    it('returns the first geocoding match', async () => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(geocodingBody));
      const client = createMetClient({ ...baseOptions, fetchFn });

      await expect(client.findLocation('Bogota')).resolves.toEqual({
        name: 'Bogotá',
        country: 'Colombia',
        latitude: 4.60971,
        longitude: -74.08175,
        timezone: 'America/Bogota',
      });

      const [requestedInput] = fetchFn.mock.calls[0] ?? [];
      const requestedUrl = requestedInput instanceof URL ? requestedInput.href : '';
      expect(requestedUrl.startsWith('https://geocoding.test/v1/search?')).toBe(true);
      expect(requestedUrl).toContain('name=Bogota');
      expect(requestedUrl).toContain('count=1');
      expect(requestedUrl).toContain('language=es');
    });

    it('returns undefined when the city is not found', async () => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}));
      const client = createMetClient({ ...baseOptions, fetchFn });

      await expect(client.findLocation('Ciudadinventada')).resolves.toBeUndefined();
    });
  });

  describe('getCurrentConditions', () => {
    it('returns current conditions with their units', async () => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(forecastBody));
      const client = createMetClient({ ...baseOptions, fetchFn });

      await expect(client.getCurrentConditions(4.60971, -74.08175)).resolves.toEqual({
        time: '2026-10-27T09:00',
        temperature: 14.2,
        relativeHumidity: 78,
        windSpeed: 6.5,
        weatherCode: 2,
        units: { temperature: '°C', relativeHumidity: '%', windSpeed: 'km/h' },
      });

      const [requestedInput] = fetchFn.mock.calls[0] ?? [];
      const requestedUrl = requestedInput instanceof URL ? requestedInput.href : '';
      expect(requestedUrl.startsWith('https://forecast.test/v1/forecast?')).toBe(true);
      expect(requestedUrl).toContain('latitude=4.60971');
      expect(requestedUrl).toContain('longitude=-74.08175');
      expect(requestedUrl).toContain('timezone=auto');
    });
  });

  describe('failures', () => {
    it('throws UpstreamError when the service responds with an HTTP error', async () => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 500));
      const client = createMetClient({ ...baseOptions, fetchFn });

      await expect(client.findLocation('Bogota')).rejects.toBeInstanceOf(UpstreamError);
    });

    it('throws UpstreamError when the response body does not match the expected shape', async () => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ unexpected: true }));
      const client = createMetClient({ ...baseOptions, fetchFn });

      await expect(client.getCurrentConditions(4.6, -74.08)).rejects.toBeInstanceOf(UpstreamError);
    });

    it('throws UpstreamError when the network request fails', async () => {
      const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
      const client = createMetClient({ ...baseOptions, fetchFn });

      await expect(client.findLocation('Bogota')).rejects.toBeInstanceOf(UpstreamError);
    });

    it('throws UpstreamError when the request exceeds the timeout', async () => {
      const fetchFn = vi.fn<typeof fetch>(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new Error('aborted'));
            });
          }),
      );
      const client = createMetClient({ ...baseOptions, fetchFn, timeoutMs: 20 });

      await expect(client.findLocation('Bogota')).rejects.toBeInstanceOf(UpstreamError);
    });
  });
});

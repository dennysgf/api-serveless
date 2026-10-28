import { describe, expect, it } from 'vitest';

import { ConfigurationError, loadConfig } from '../../src/config/load-config.js';

describe('loadConfig', () => {
  it('applies Open-Meteo defaults when no variables are set', () => {
    expect(loadConfig({})).toEqual({
      openMeteo: {
        geocodingBaseUrl: 'https://geocoding-api.open-meteo.com/v1',
        forecastBaseUrl: 'https://api.open-meteo.com/v1',
        timeoutMs: 5000,
      },
    });
  });

  it('reads overrides from the environment', () => {
    const config = loadConfig({
      OPEN_METEO_GEOCODING_BASE_URL: 'http://localhost:4010/geocoding',
      OPEN_METEO_FORECAST_BASE_URL: 'http://localhost:4010/forecast',
      OPEN_METEO_TIMEOUT_MS: '2500',
    });

    expect(config.openMeteo).toEqual({
      geocodingBaseUrl: 'http://localhost:4010/geocoding',
      forecastBaseUrl: 'http://localhost:4010/forecast',
      timeoutMs: 2500,
    });
  });

  it.each([
    ['an invalid base URL', { OPEN_METEO_FORECAST_BASE_URL: 'not-a-url' }],
    ['a non-numeric timeout', { OPEN_METEO_TIMEOUT_MS: 'abc' }],
    ['a zero timeout', { OPEN_METEO_TIMEOUT_MS: '0' }],
    ['a timeout above the maximum', { OPEN_METEO_TIMEOUT_MS: '30001' }],
  ])('rejects %s', (_label, environment) => {
    expect(() => loadConfig(environment)).toThrow(ConfigurationError);
  });
});

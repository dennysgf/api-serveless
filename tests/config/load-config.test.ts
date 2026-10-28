import { describe, expect, it } from 'vitest';

import { ConfigurationError, loadConfig } from '../../src/config/load-config.js';

describe('loadConfig', () => {
  it('applies Open-Meteo defaults when no variables are set', () => {
    expect(loadConfig({})).toEqual({
      geocodingUrl: 'https://geocoding-api.open-meteo.com/v1',
      forecastUrl: 'https://api.open-meteo.com/v1',
      timeoutMs: 5000,
    });
  });

  it('reads overrides from the environment', () => {
    expect(
      loadConfig({
        GEOCODING_URL: 'http://localhost:4010/geocoding',
        FORECAST_URL: 'http://localhost:4010/forecast',
        TIMEOUT_MS: '2500',
      }),
    ).toEqual({
      geocodingUrl: 'http://localhost:4010/geocoding',
      forecastUrl: 'http://localhost:4010/forecast',
      timeoutMs: 2500,
    });
  });

  it.each([
    ['an invalid geocoding URL', { GEOCODING_URL: 'not-a-url' }],
    ['an invalid forecast URL', { FORECAST_URL: 'not-a-url' }],
    ['a non-numeric timeout', { TIMEOUT_MS: 'abc' }],
    ['a zero timeout', { TIMEOUT_MS: '0' }],
    ['a timeout above the maximum', { TIMEOUT_MS: '30001' }],
  ])('rejects %s', (_label, environment) => {
    expect(() => loadConfig(environment)).toThrow(ConfigurationError);
  });
});

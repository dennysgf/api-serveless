import { describe, expect, it } from 'vitest';

import { buildWeatherReport } from '../../src/domain/weather-report.js';

describe('buildWeatherReport', () => {
  it('maps geocoding and forecast data to the public contract', () => {
    const report = buildWeatherReport(
      {
        name: 'Bogotá',
        country: 'Colombia',
        latitude: 4.60971,
        longitude: -74.08175,
        timezone: 'America/Bogota',
      },
      {
        time: '2026-10-27T09:00',
        temperature: 14.2,
        relativeHumidity: 78,
        windSpeed: 6.5,
        weatherCode: 2,
        units: { temperature: '°C', relativeHumidity: '%', windSpeed: 'km/h' },
      },
    );

    expect(report).toEqual({
      city: 'Bogotá',
      country: 'Colombia',
      coordinates: { latitude: 4.60971, longitude: -74.08175 },
      timezone: 'America/Bogota',
      current: {
        temperature: { value: 14.2, unit: '°C' },
        humidity: { value: 78, unit: '%' },
        windSpeed: { value: 6.5, unit: 'km/h' },
        condition: 'Parcialmente nublado',
        observedAt: '2026-10-27T09:00',
      },
    });
  });
});

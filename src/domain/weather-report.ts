import { describeWeatherCode } from './weather-condition.js';

export type GeocodedLocation = {
  readonly name: string;
  readonly country: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;
};

export type CurrentConditions = {
  readonly time: string;
  readonly temperature: number;
  readonly relativeHumidity: number;
  readonly windSpeed: number;
  readonly weatherCode: number;
  readonly units: {
    readonly temperature: string;
    readonly relativeHumidity: string;
    readonly windSpeed: string;
  };
};

export type Measurement = {
  readonly value: number;
  readonly unit: string;
};

export type WeatherReport = {
  readonly city: string;
  readonly country: string;
  readonly coordinates: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly timezone: string;
  readonly current: {
    readonly temperature: Measurement;
    readonly humidity: Measurement;
    readonly windSpeed: Measurement;
    readonly condition: string;
    readonly observedAt: string;
  };
};

export const buildWeatherReport = (
  location: GeocodedLocation,
  conditions: CurrentConditions,
): WeatherReport => ({
  city: location.name,
  country: location.country,
  coordinates: {
    latitude: location.latitude,
    longitude: location.longitude,
  },
  timezone: location.timezone,
  current: {
    temperature: { value: conditions.temperature, unit: conditions.units.temperature },
    humidity: { value: conditions.relativeHumidity, unit: conditions.units.relativeHumidity },
    windSpeed: { value: conditions.windSpeed, unit: conditions.units.windSpeed },
    condition: describeWeatherCode(conditions.weatherCode),
    observedAt: conditions.time,
  },
});

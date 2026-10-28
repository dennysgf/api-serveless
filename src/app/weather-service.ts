import type { MetClient } from '../clients/met-client.js';
import { validateCity } from '../domain/city.js';
import { buildWeatherReport } from '../domain/weather-report.js';
import type { WeatherReport } from '../domain/weather-report.js';
import { CityNotFoundError } from '../errors/app-error.js';

export type WeatherService = {
  readonly getWeather: (city: string | undefined) => Promise<WeatherReport>;
};

export const createWeatherService = (client: MetClient): WeatherService => ({
  getWeather: async (input) => {
    const city = validateCity(input);
    const location = await client.findLocation(city);
    if (location === undefined) {
      throw new CityNotFoundError(`No se encontró la ciudad '${city}'`);
    }
    const conditions = await client.getCurrentConditions(location.latitude, location.longitude);
    return buildWeatherReport(location, conditions);
  },
});

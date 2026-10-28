import { createWeatherService } from './app/weather-service.js';
import { createMetClient } from './clients/met-client.js';
import { loadConfig } from './config/load-config.js';
import { createWeatherHandler } from './http/weather-handler.js';
import { createLogger } from './logging/logger.js';

const config = loadConfig(process.env);

const metClient = createMetClient({
  geocodingUrl: config.geocodingUrl,
  forecastUrl: config.forecastUrl,
  timeoutMs: config.timeoutMs,
});

export const handler = createWeatherHandler({
  weatherService: createWeatherService(metClient),
  logger: createLogger(),
});

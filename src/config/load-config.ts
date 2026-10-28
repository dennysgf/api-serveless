import { z } from 'zod';

const DEFAULT_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1';
const DEFAULT_FORECAST_URL = 'https://api.open-meteo.com/v1';
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 30000;

const configSchema = z.object({
  geocoding: z.url().default(DEFAULT_GEOCODING_URL),
  forecast: z.url().default(DEFAULT_FORECAST_URL),
  timeout: z.coerce.number().int().positive().max(MAX_TIMEOUT_MS).default(DEFAULT_TIMEOUT_MS),
});

export type AppConfig = {
  readonly geocodingUrl: string;
  readonly forecastUrl: string;
  readonly timeoutMs: number;
};

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export const loadConfig = (
  environment: Readonly<Record<string, string | undefined>>,
): AppConfig => {
  const { GEOCODING_URL, FORECAST_URL, TIMEOUT_MS } = environment;
  const result = configSchema.safeParse({
    geocoding: GEOCODING_URL,
    forecast: FORECAST_URL,
    timeout: TIMEOUT_MS,
  });
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ConfigurationError(`Invalid configuration: ${details}`);
  }
  return {
    geocodingUrl: result.data.geocoding,
    forecastUrl: result.data.forecast,
    timeoutMs: result.data.timeout,
  };
};

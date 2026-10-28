import { z } from 'zod';

const DEFAULT_GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1';
const DEFAULT_FORECAST_BASE_URL = 'https://api.open-meteo.com/v1';
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 30000;

const environmentSchema = z.object({
  OPEN_METEO_GEOCODING_BASE_URL: z.url().default(DEFAULT_GEOCODING_BASE_URL),
  OPEN_METEO_FORECAST_BASE_URL: z.url().default(DEFAULT_FORECAST_BASE_URL),
  OPEN_METEO_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_TIMEOUT_MS)
    .default(DEFAULT_TIMEOUT_MS),
});

export type AppConfig = {
  readonly openMeteo: {
    readonly geocodingBaseUrl: string;
    readonly forecastBaseUrl: string;
    readonly timeoutMs: number;
  };
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
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ConfigurationError(`Invalid configuration: ${details}`);
  }
  return {
    openMeteo: {
      geocodingBaseUrl: result.data.OPEN_METEO_GEOCODING_BASE_URL,
      forecastBaseUrl: result.data.OPEN_METEO_FORECAST_BASE_URL,
      timeoutMs: result.data.OPEN_METEO_TIMEOUT_MS,
    },
  };
};

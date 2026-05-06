import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  ERRFLOW_API_KEY: z.string().min(1, 'ERRFLOW_API_KEY is required'),
  ERRFLOW_ENV: z.string().default('production'),
  ERRFLOW_API_URL: z.string().default('https://api.errflow.dev/ingest'),
  ERRFLOW_DISABLED: z.string().optional().default('false').transform(val => val === 'true'),
});

type Env = z.infer<typeof envSchema>;

let cachedConfig: Env | null = null;

export function loadEnv(): Env {
  if (cachedConfig) {
    return cachedConfig;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Environment validation failed: ${errors}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function setConfig(config: { apiKey: string; env?: string; apiUrl?: string; disabled?: boolean }): void {
  cachedConfig = {
    ERRFLOW_API_KEY: config.apiKey,
    ERRFLOW_ENV: config.env || 'production',
    ERRFLOW_API_URL: config.apiUrl || 'https://api.errflow.dev/ingest',
    ERRFLOW_DISABLED: config.disabled || false,
  };
}

export function getConfig(): Env {
  if (!cachedConfig) {
    return loadEnv();
  }
  return cachedConfig;
}

export function isDisabled(): boolean {
  const config = getConfig();
  return config.ERRFLOW_DISABLED;
}

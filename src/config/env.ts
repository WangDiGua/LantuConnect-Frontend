import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  VITE_USE_MOCK: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  VITE_TOKEN_KEY: z.string().default('lantu_access_token'),
  VITE_REFRESH_TOKEN_KEY: z.string().default('lantu_refresh_token'),
  VITE_MOCK_DELAY_MS: z
    .string()
    .default('300')
    .transform((v) => Number(v)),
  VITE_APP_ENV: z
    .enum(['development', 'production', 'staging'])
    .default('development'),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const raw: Record<string, string | undefined> = {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_USE_MOCK: import.meta.env.VITE_USE_MOCK,
    VITE_TOKEN_KEY: import.meta.env.VITE_TOKEN_KEY,
    VITE_REFRESH_TOKEN_KEY: import.meta.env.VITE_REFRESH_TOKEN_KEY,
    VITE_MOCK_DELAY_MS: import.meta.env.VITE_MOCK_DELAY_MS,
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
  };

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    console.error('[env] Invalid environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = loadEnv();

export const isDev = env.VITE_APP_ENV === 'development';
export const isProd = env.VITE_APP_ENV === 'production';
export const isMock = env.VITE_USE_MOCK;

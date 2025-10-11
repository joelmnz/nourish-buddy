import { z } from 'zod';

const envSchema = z.object({
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD_HASH: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32),
  DATABASE_PATH: z.string().default('./data/nourish.sqlite'),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().email().or(z.string().url()),
  ALLOWED_ORIGIN: z.string().url(),
  // When true, CORS origin checks are disabled and CSP is relaxed for connect-src.
  // Intended for use behind trusted reverse proxies/tunnels only.
  INSECURE_DISABLE_ORIGIN_CHECKS: z.coerce.boolean().default(false),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
}).refine(
  (data) => data.ADMIN_PASSWORD_HASH || data.ADMIN_PASSWORD,
  {
    message: 'Either ADMIN_PASSWORD_HASH or ADMIN_PASSWORD must be set',
  }
);

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.format());
    throw new Error('Invalid environment configuration');
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

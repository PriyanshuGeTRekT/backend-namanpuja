import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@namanpuja.com',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!',
  },

  crm: {
    enabled: process.env.CRM_ENABLED === 'true',
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    defaultSalesId: Number(process.env.CRM_DEFAULT_SALES_ID ?? 1),
  },
};

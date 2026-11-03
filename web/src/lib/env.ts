import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    SENTRY_DSN: z.string().url().optional(),
    AIR_ENABLE_ERROR_ALERTS: z.string().optional(),
    OPS_ALERT_WEBHOOK_URL: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    AIR_ENABLE_PAYMENTS: z.string().optional(),
    SEPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
    AIR_BANK_NAME: z.string().min(1).optional(),
    AIR_BANK_ACCOUNT_NUMBER: z.string().min(1).optional(),
    AIR_BANK_ACCOUNT_NAME: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SENTRY_DSN: process.env.SENTRY_DSN,
    AIR_ENABLE_ERROR_ALERTS: process.env.AIR_ENABLE_ERROR_ALERTS,
    OPS_ALERT_WEBHOOK_URL: process.env.OPS_ALERT_WEBHOOK_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AIR_ENABLE_PAYMENTS: process.env.AIR_ENABLE_PAYMENTS,
    SEPAY_WEBHOOK_SECRET: process.env.SEPAY_WEBHOOK_SECRET,
    AIR_BANK_NAME: process.env.AIR_BANK_NAME,
    AIR_BANK_ACCOUNT_NUMBER: process.env.AIR_BANK_ACCOUNT_NUMBER,
    AIR_BANK_ACCOUNT_NAME: process.env.AIR_BANK_ACCOUNT_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})

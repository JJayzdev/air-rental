import { env } from './env'

/**
 * Observability & Error tracking helper
 * Sẵn sàng tích hợp Sentry khi có DSN trong biến môi trường
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Observability Error]:', error, context)
  }

  if (env.NEXT_PUBLIC_SENTRY_DSN && typeof window !== 'undefined') {
    // Gửi lỗi lên Sentry / endpoint giám sát khi kích hoạt
    const globalWithSentry = globalThis as unknown as {
      Sentry?: {
        captureException: (err: unknown, opts?: { extra?: Record<string, unknown> }) => void
      }
    }
    if (globalWithSentry.Sentry) {
      globalWithSentry.Sentry.captureException(error, { extra: context })
    }
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[Observability ${level.toUpperCase()}]:`, message)
  }
}

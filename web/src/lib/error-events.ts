export type SafeErrorEvent = {
  event: 'application.exception'
  timestamp: string
  errorName: 'Error' | 'TypeError' | 'RangeError' | 'SyntaxError'
  errorCode?: string
  operation?: 'sepay-webhook'
  outcome?: 'database-error'
}

type SafeContext = { operation?: 'sepay-webhook'; outcome?: 'database-error' }

/** Reduce arbitrary exceptions and context to fixed, bounded operational fields. */
export function buildSafeErrorEvent(
  error: unknown,
  context: SafeContext = {},
  timestamp = new Date().toISOString(),
): SafeErrorEvent {
  const candidate = error as { name?: unknown; code?: unknown } | null
  const safeContext = context && typeof context === 'object' ? context : {}
  const code = safeErrorCode(candidate?.code)
  return {
    event: 'application.exception',
    timestamp,
    errorName: safeErrorName(candidate?.name),
    ...(code ? { errorCode: code } : {}),
    ...(safeContext.operation === 'sepay-webhook' ? { operation: 'sepay-webhook' } : {}),
    ...(safeContext.outcome === 'database-error' ? { outcome: 'database-error' } : {}),
  }
}

/** Rebuild events at the transport boundary so runtime callers cannot smuggle extra properties. */
export function sanitizeSafeErrorEvent(value: unknown): SafeErrorEvent {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const timestamp =
    typeof input.timestamp === 'string' &&
    input.timestamp.length <= 35 &&
    !Number.isNaN(Date.parse(input.timestamp))
      ? new Date(input.timestamp).toISOString()
      : new Date().toISOString()
  return buildSafeErrorEvent(
    { name: input.errorName, code: input.errorCode },
    {
      operation: input.operation === 'sepay-webhook' ? 'sepay-webhook' : undefined,
      outcome: input.outcome === 'database-error' ? 'database-error' : undefined,
    },
    timestamp,
  )
}

function safeErrorName(value: unknown): SafeErrorEvent['errorName'] {
  if (value === 'TypeError' || value === 'RangeError' || value === 'SyntaxError') return value
  return 'Error'
}

function safeErrorCode(value: unknown): string | undefined {
  return typeof value === 'string' && /^[0-9A-Z]{5}$/.test(value) ? value : undefined
}

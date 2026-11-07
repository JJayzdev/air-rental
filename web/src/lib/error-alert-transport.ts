import { sanitizeSafeErrorEvent, type SafeErrorEvent } from './error-events.ts'

export const ERROR_ALERT_TIMEOUT_MS = 2500
export const ERROR_ALERT_COOLDOWN_MS = 60_000

export type AlertSendResult = 'disabled' | 'invalid-destination' | 'cooldown' | 'sent' | 'failed'

type DispatcherOptions = {
  fetcher?: typeof fetch
  now?: () => number
  timeoutMs?: number
  cooldownMs?: number
}

/** A per-process, best-effort transport. It intentionally keeps no destination or payload history. */
export function createErrorAlertDispatcher(options: DispatcherOptions = {}) {
  const fetcher = options.fetcher ?? fetch
  const now = options.now ?? Date.now
  const timeoutMs = options.timeoutMs ?? ERROR_ALERT_TIMEOUT_MS
  const cooldownMs = options.cooldownMs ?? ERROR_ALERT_COOLDOWN_MS
  let lastAttemptAt = Number.NEGATIVE_INFINITY

  return async function dispatch(
    event: SafeErrorEvent,
    config: { enabled: boolean; destination?: string },
  ): Promise<AlertSendResult> {
    if (!config.enabled) return 'disabled'
    const endpoint = secureEndpoint(config.destination)
    if (!endpoint) return 'invalid-destination'

    const startedAt = now()
    if (startedAt - lastAttemptAt < cooldownMs) return 'cooldown'
    // Start the cooldown before awaiting so concurrent failures in this process coalesce.
    lastAttemptAt = startedAt

    // Dùng timer thường thay cho AbortSignal.timeout: timer của AbortSignal.timeout không giữ
    // event loop, nên một request treo có thể bị bỏ dở mà không bao giờ trả về 'failed'.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const safeEvent = sanitizeSafeErrorEvent(event)
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(safeEvent),
        signal: controller.signal,
        redirect: 'error',
        cache: 'no-store',
      })
      return response.ok ? 'sent' : 'failed'
    } catch {
      return 'failed'
    } finally {
      clearTimeout(timer)
    }
  }
}

function secureEndpoint(value: string | undefined): URL | null {
  if (!value || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username !== '' ||
      url.password !== '' ||
      url.hash !== ''
    ) {
      return null
    }
    return url
  } catch {
    return null
  }
}

import 'server-only'
import { buildSafeErrorEvent, type SafeErrorEvent } from './error-events.ts'
import { createErrorAlertDispatcher } from './error-alert-transport.ts'

/** Emit bounded server events only; raw exceptions and caller supplied strings can contain PII. */
export function captureException(
  error: unknown,
  context: { operation?: 'sepay-webhook'; outcome?: 'database-error' } = {},
): SafeErrorEvent {
  const event = buildSafeErrorEvent(error, context)
  console.error(JSON.stringify(event))
  return event
}

const alertDispatcher = createErrorAlertDispatcher()
let invalidAlertConfigLogged = false

/** Best-effort HTTPS alert delivery; failures never escape to the request handler. */
export async function sendOperationalAlert(event: SafeErrorEvent): Promise<void> {
  if (process.env.AIR_ENABLE_ERROR_ALERTS !== 'true') return
  let result
  try {
    result = await alertDispatcher(event, {
      enabled: true,
      destination: process.env.OPS_ALERT_WEBHOOK_URL,
    })
  } catch {
    result = 'failed'
  }
  if (result === 'invalid-destination' && !invalidAlertConfigLogged) {
    invalidAlertConfigLogged = true
    console.warn(
      JSON.stringify({
        event: 'ops.alert.configuration_invalid',
        timestamp: new Date().toISOString(),
      }),
    )
  } else if (result === 'failed') {
    console.warn(
      JSON.stringify({ event: 'ops.alert.delivery_failed', timestamp: new Date().toISOString() }),
    )
  }
}

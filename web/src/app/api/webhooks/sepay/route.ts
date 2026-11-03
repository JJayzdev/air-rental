import { NextResponse } from 'next/server'
import {
  parseSePayWebhook,
  paymentsEnabled,
  sePayAuthorizationMatches,
} from '@/features/payments/sepay'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { captureException, sendOperationalAlert } from '@/lib/observability'
import type { Json } from '@/lib/supabase/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * SePay bank-transfer webhook.
 *
 * Responds 200 for anything SePay must not retry (replays, outgoing transfers, transfers with no
 * order code, Disabled deployment). Non-2xx is reserved for a bad secret or a database failure, so
 * a real transfer is never dropped silently.
 */
export async function POST(request: Request) {
  if (!paymentsEnabled()) {
    return NextResponse.json({ ok: true, status: 'disabled' }, { status: 200 })
  }
  const secret = process.env.SEPAY_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'webhook-not-configured' }, { status: 503 })
  }
  if (!sePayAuthorizationMatches(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 })
  }

  const parsed = parseSePayWebhook(body)
  if (!parsed.ok) {
    // Intentionally acknowledged: a retry would deliver the same unusable envelope forever.
    return NextResponse.json(
      { ok: true, status: 'ignored', reason: parsed.reason },
      { status: 200 },
    )
  }

  let supabase: ReturnType<typeof createSupabaseServiceClient>
  try {
    supabase = createSupabaseServiceClient()
  } catch {
    return NextResponse.json({ ok: false, error: 'service-role-missing' }, { status: 503 })
  }

  const { data, error } = await supabase.rpc('apply_sepay_payment', {
    p_external_id: parsed.transfer.externalId,
    p_amount_vnd: parsed.transfer.amountVnd,
    p_content: parsed.transfer.content,
    p_payload: parsed.transfer.payload as Json,
  })
  if (error) {
    const event = captureException(error, {
      operation: 'sepay-webhook',
      outcome: 'database-error',
    })
    await sendOperationalAlert(event)
    return NextResponse.json({ ok: false, error: 'apply-failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...(data as Record<string, unknown>) }, { status: 200 })
}

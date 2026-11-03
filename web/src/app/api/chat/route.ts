import { NextResponse, type NextRequest } from 'next/server'
import { chatRequestSchema, inferChatAction, validAvailabilityRange } from '@/features/chat/schema'
import { allowChatRequest, clientIpFromRequest, runChatAction } from '@/features/chat/server'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { supabaseIsConfigured } from '@/lib/supabase/server'
import { buildReply, isKnownFaq } from '@/components/chat/chat-engine'
import { chooseChatTool } from '@/features/chat/openai'

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })

async function readBoundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader()
  if (!reader) throw new Error('missing body')
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 8_192) {
      await reader.cancel()
      throw new RangeError('body too large')
    }
    chunks.push(value)
  }
  const buffer = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(buffer)) as unknown
}

export const runtime = 'nodejs'
export const maxDuration = 20

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Expected application/json.' }, 415)
  }
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > 8_192) return json({ error: 'Request too large.' }, 413)
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin)
    return json({ error: 'Cross-origin chat requests are not allowed.' }, 403)
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return json({ error: 'Cross-origin chat requests are not allowed.' }, 403)

  let body: unknown
  try {
    body = await readBoundedJson(request)
  } catch (error) {
    if (error instanceof RangeError) return json({ error: 'Request too large.' }, 413)
    return json({ error: 'Invalid JSON.' }, 400)
  }
  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'Invalid chat request.' }, 400)
  const input = parsed.data
  const startedAt = Date.now()
  const respond = (responseBody: unknown, status = 200) => {
    // Operational telemetry omits message text, user/IP identifiers, order codes, and arguments.
    // eslint-disable-next-line no-console -- only bounded action/status/duration metadata
    console.info('chat.request', {
      action: input.action,
      status,
      durationMs: Date.now() - startedAt,
    })
    return json(responseBody, status)
  }
  if (
    input.action === 'checkAvailability' &&
    !validAvailabilityRange(input.startDate, input.endDate)
  ) {
    return respond(
      { error: 'Hãy chọn khoảng ngày thuê hợp lệ, tối đa 63 ngày tính cả ngày bắt đầu.' },
      400,
    )
  }

  let userId: string | undefined
  if (supabaseIsConfigured()) {
    const auth = await getVerifiedUser().catch(() => null)
    userId = auth?.user?.id
  }
  try {
    const allowed = await allowChatRequest(clientIpFromRequest(request), userId)
    if (!allowed)
      return respond({ error: 'Bạn gửi hơi nhanh. Vui lòng chờ một phút rồi thử lại.' }, 429)
  } catch {
    // Never bypass the durable quota, including before an optional paid provider call.
    return respond({ error: 'Trợ lý chưa sẵn sàng. Vui lòng thử lại sau.' }, 503)
  }

  try {
    if (input.action === 'message') {
      const inferred = inferChatAction(input.message)
      if (inferred) return respond(await runChatAction(inferred, userId))
      const faq = buildReply(input.message)
      if (isKnownFaq(input.message)) return respond({ text: faq.text })
      const llm = await chooseChatTool(input.message)
      if (llm && 'tool' in llm) {
        if (
          llm.tool.action === 'checkAvailability' &&
          !validAvailabilityRange(llm.tool.startDate, llm.tool.endDate)
        ) {
          return respond({
            text: 'Cho mình ngày thuê theo định dạng YYYY-MM-DD để kiểm tra lịch, tối đa 63 ngày tính cả ngày bắt đầu.',
          })
        }
        const result = await runChatAction(llm.tool, userId)
        return respond(result)
      }
      return respond({ text: faq.text })
    }
    return respond(await runChatAction(input, userId))
  } catch {
    return respond({ error: 'Trợ lý chưa sẵn sàng. Vui lòng thử lại sau.' }, 503)
  }
}

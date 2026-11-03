import assert from 'node:assert/strict'
import test from 'node:test'
import { chooseChatTool } from './openai-client.ts'

const saved = {
  key: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL,
  enabled: process.env.AIR_ENABLE_CHAT_LLM,
}

function configure(enabled = 'true') {
  process.env.OPENAI_API_KEY = 'test-secret'
  process.env.OPENAI_MODEL = 'test-model'
  process.env.AIR_ENABLE_CHAT_LLM = enabled
}
function functionResponse(name: string, args: string): Response {
  return Response.json({
    output: [{ type: 'function_call', name, arguments: args, call_id: 'call_1' }],
  })
}

test.after(() => {
  if (saved.key === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = saved.key
  if (saved.model === undefined) delete process.env.OPENAI_MODEL
  else process.env.OPENAI_MODEL = saved.model
  if (saved.enabled === undefined) delete process.env.AIR_ENABLE_CHAT_LLM
  else process.env.AIR_ENABLE_CHAT_LLM = saved.enabled
})

test('provider is disabled by default and does not make a network request', async () => {
  configure('false')
  let called = false
  const result = await chooseChatTool('Câu hỏi', {
    fetcher: async () => {
      called = true
      return new Response()
    },
  })
  assert.equal(result, null)
  assert.equal(called, false)
})

test('valid provider function call returns only a locally validated tool', async () => {
  configure()
  const result = await chooseChatTool('Tìm laptop', {
    fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      assert.equal(body.store, false)
      assert.equal(body.max_output_tokens, 120)
      assert.equal(body.input, 'Tìm laptop')
      return functionResponse('searchProducts', JSON.stringify({ message: 'laptop' }))
    },
  })
  assert.deepEqual(result, { tool: { action: 'searchProducts', message: 'laptop' } })
})

test('provider cannot override tools, add owner scope, or author free text', async () => {
  configure()
  const call = (name: string, args: unknown, output: unknown[] = []) =>
    chooseChatTool('x', {
      fetcher: async () =>
        Response.json({
          output: [
            ...output,
            { type: 'function_call', name, arguments: JSON.stringify(args), call_id: 'x' },
          ],
        }),
    })
  assert.equal(await call('searchProducts', { message: 'laptop', action: 'getOrderStatus' }), null)
  assert.equal(await call('getOrderStatus', { orderCode: null, userId: 'victim' }), null)
  assert.equal(await call('unknown', { message: 'x' }), null)
  assert.equal(
    await call('checkAvailability', {
      productId: 'bad',
      startDate: '2026-11-02',
      endDate: '2026-11-03',
    }),
    null,
  )
  assert.equal(
    await chooseChatTool('x', {
      fetcher: async () =>
        Response.json({
          output: [{ type: 'message', content: [{ type: 'output_text', text: 'invented fact' }] }],
        }),
    }),
    null,
  )
  assert.equal(await call('searchProducts', { message: 'one' }, [{ type: 'function_call' }]), null)
})

test('provider errors, malformed output, oversized output, and timeouts fail closed', async () => {
  configure()
  assert.equal(
    await chooseChatTool('x', { fetcher: async () => new Response('error', { status: 500 }) }),
    null,
  )
  assert.equal(await chooseChatTool('x', { fetcher: async () => new Response('{bad') }), null)
  assert.equal(
    await chooseChatTool('x', {
      fetcher: async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(16_385))
              controller.close()
            },
          }),
        ),
    }),
    null,
  )
  const started = Date.now()
  assert.equal(
    await chooseChatTool('x', {
      timeoutMs: 10,
      fetcher: async (_url, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          })
        }),
    }),
    null,
  )
  assert.ok(Date.now() - started < 1000)
})

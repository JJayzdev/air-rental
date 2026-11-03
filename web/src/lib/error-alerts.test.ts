import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSafeErrorEvent } from './error-events.ts'
import { createErrorAlertDispatcher } from './error-alert-transport.ts'

const safeEvent = buildSafeErrorEvent(
  Object.assign(new Error('customer@example.com 0912345678'), {
    code: 'XX123',
    orderId: 'private-order-id',
  }),
  {
    operation: 'sepay-webhook',
    outcome: 'database-error',
    email: 'customer@example.com',
  } as never,
  '2026-11-02T10:00:00.000Z',
)

test('safe event contains only allowlisted error metadata', () => {
  assert.deepEqual(safeEvent, {
    event: 'application.exception',
    timestamp: '2026-11-02T10:00:00.000Z',
    errorName: 'Error',
    errorCode: 'XX123',
    operation: 'sepay-webhook',
    outcome: 'database-error',
  })
  assert.equal(JSON.stringify(safeEvent).includes('customer@example.com'), false)
  assert.equal(JSON.stringify(safeEvent).includes('private-order-id'), false)
})

test('alerts are disabled by default and invalid or credentialed destinations are rejected', async () => {
  let calls = 0
  const dispatch = createErrorAlertDispatcher({
    fetcher: async () => {
      calls += 1
      return new Response(null, { status: 204 })
    },
  })
  assert.equal(
    await dispatch(safeEvent, { enabled: false, destination: 'https://ops.example/hook' }),
    'disabled',
  )
  assert.equal(
    await dispatch(safeEvent, { enabled: true, destination: 'http://ops.example/hook' }),
    'invalid-destination',
  )
  assert.equal(
    await dispatch(safeEvent, {
      enabled: true,
      destination: 'https://user:secret@ops.example/hook',
    }),
    'invalid-destination',
  )
  assert.equal(calls, 0)
})

test('HTTPS alert sends only the safe event and prevents redirects', async () => {
  let capturedUrl: URL | undefined
  let capturedInit: RequestInit | undefined
  const dispatch = createErrorAlertDispatcher({
    fetcher: async (url, init) => {
      capturedUrl = url as URL
      capturedInit = init
      return new Response(null, { status: 204 })
    },
  })
  assert.equal(
    await dispatch(safeEvent, {
      enabled: true,
      destination: 'https://ops.example/alert?token=must-not-be-forwarded',
    }),
    'sent',
  )
  assert.equal(capturedUrl?.protocol, 'https:')
  assert.equal(capturedInit?.method, 'POST')
  assert.equal(capturedInit?.redirect, 'error')
  const body = String(capturedInit?.body)
  assert.deepEqual(JSON.parse(body), safeEvent)
  assert.equal(body.includes('must-not-be-forwarded'), false)
  assert.equal(body.includes('customer@example.com'), false)
})

test('transport re-sanitizes runtime event objects before serialization', async () => {
  let capturedBody = ''
  const dispatch = createErrorAlertDispatcher({
    fetcher: async (_url, init) => {
      capturedBody = String(init?.body)
      return new Response(null, { status: 204 })
    },
  })
  const injected = {
    ...safeEvent,
    customerPhone: '0912345678',
    rawError: 'private SQL content',
    authorization: 'secret-token',
  }
  assert.equal(
    await dispatch(injected as never, {
      enabled: true,
      destination: 'https://ops.example/alert',
    }),
    'sent',
  )
  assert.deepEqual(JSON.parse(capturedBody), safeEvent)
  assert.equal(capturedBody.includes('0912345678'), false)
  assert.equal(capturedBody.includes('secret-token'), false)
})

test('HTTP failure, thrown fetch, and timeout fail closed', async () => {
  const rejected = createErrorAlertDispatcher({
    fetcher: async () => new Response(null, { status: 503 }),
  })
  assert.equal(
    await rejected(safeEvent, { enabled: true, destination: 'https://ops.example/hook' }),
    'failed',
  )

  const thrown = createErrorAlertDispatcher({
    fetcher: async () => {
      throw new Error('private endpoint error')
    },
  })
  assert.equal(
    await thrown(safeEvent, { enabled: true, destination: 'https://ops.example/hook' }),
    'failed',
  )

  const timedOut = createErrorAlertDispatcher({
    timeoutMs: 5,
    fetcher: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('timeout')), { once: true })
      }),
  })
  assert.equal(
    await timedOut(safeEvent, { enabled: true, destination: 'https://ops.example/hook' }),
    'failed',
  )
})

test('cooldown is per dispatcher, starts before await, and releases after its interval', async () => {
  let clock = 100_000
  let calls = 0
  let releaseFirst: ((value: Response) => void) | undefined
  const dispatch = createErrorAlertDispatcher({
    now: () => clock,
    cooldownMs: 60_000,
    fetcher: async () => {
      calls += 1
      if (calls === 1)
        return new Promise((resolve) => {
          releaseFirst = resolve
        })
      return new Response(null, { status: 204 })
    },
  })
  const config = { enabled: true, destination: 'https://ops.example/hook' }
  const first = dispatch(safeEvent, config)
  assert.equal(await dispatch(safeEvent, config), 'cooldown')
  assert.equal(calls, 1)
  releaseFirst?.(new Response(null, { status: 204 }))
  assert.equal(await first, 'sent')
  clock += 60_000
  assert.equal(await dispatch(safeEvent, config), 'sent')
  assert.equal(calls, 2)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  findOrderCode,
  parseSePayWebhook,
  sePayAuthorizationMatches,
  transferMemo,
} from './sepay.ts'

const code = 'AIR-261101-ABCDEF12'

test('order code is found in noisy Vietnamese transfer descriptions', () => {
  assert.equal(findOrderCode(`CK ${code} coc thiet bi`), code)
  assert.equal(findOrderCode(`air-261101-abcdef12`), code)
  assert.equal(findOrderCode('KHONG CO MA DON'), null)
  assert.equal(findOrderCode('AIR-2611-ABCDEF12'), null)
  assert.equal(findOrderCode(null), null)
  assert.equal(findOrderCode(transferMemo(code)), code)
})

test('a SePay envelope is accepted only when it is a complete incoming transfer', () => {
  const result = parseSePayWebhook({
    id: 92704,
    gateway: 'Vietcombank',
    transferType: 'in',
    transferAmount: 30000,
    content: `CK ${code}`,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.transfer.externalId, '92704')
  assert.equal(result.transfer.amountVnd, 30000)
  assert.equal(findOrderCode(result.transfer.content), code)
})

test('outgoing, zero-value, and malformed envelopes are rejected', () => {
  assert.deepEqual(parseSePayWebhook({ id: 1, transferType: 'out', transferAmount: 1000 }), {
    ok: false,
    reason: 'not-incoming',
  })
  assert.deepEqual(parseSePayWebhook({ id: 1, transferType: 'in', transferAmount: 0 }), {
    ok: false,
    reason: 'invalid-amount',
  })
  assert.deepEqual(parseSePayWebhook({ id: 1, transferType: 'in', transferAmount: 1000.5 }), {
    ok: false,
    reason: 'invalid-amount',
  })
  assert.deepEqual(parseSePayWebhook({ transferType: 'in', transferAmount: 1000 }), {
    ok: false,
    reason: 'invalid-payload',
  })
  assert.deepEqual(parseSePayWebhook([]), { ok: false, reason: 'invalid-payload' })
  assert.deepEqual(parseSePayWebhook(null), { ok: false, reason: 'invalid-payload' })
})

test('the authorization header must match the configured API key exactly', () => {
  assert.equal(sePayAuthorizationMatches('Apikey secret-value', 'secret-value'), true)
  assert.equal(sePayAuthorizationMatches('Apikey secret-valuX', 'secret-value'), false)
  assert.equal(sePayAuthorizationMatches('Apikey secret-value ', 'secret-value'), false)
  assert.equal(sePayAuthorizationMatches('Bearer secret-value', 'secret-value'), false)
  assert.equal(sePayAuthorizationMatches(null, 'secret-value'), false)
  assert.equal(sePayAuthorizationMatches('Apikey secret-value', ''), false)
})

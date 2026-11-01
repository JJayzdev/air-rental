import assert from 'node:assert/strict'
import test from 'node:test'
import { applyAuthCookieUpdates } from './cookie-updates.ts'

test('auth refresh preserves every chunked session cookie in one response', () => {
  const requestCookies = new Map<string, string>()
  const responseCookies = new Map<string, string>()
  const updates = [
    { name: 'sb-local-auth-token.0', value: 'first' },
    { name: 'sb-local-auth-token.1', value: 'second' },
    { name: 'sb-local-auth-token-code-verifier', value: 'verifier' },
  ]
  const response = applyAuthCookieUpdates(
    updates,
    (cookie) => requestCookies.set(cookie.name, cookie.value),
    () => ({ cookies: responseCookies }),
    (target, cookie) => target.cookies.set(cookie.name, cookie.value),
  )
  assert.deepEqual(
    [...response.cookies.keys()],
    updates.map((cookie) => cookie.name),
  )
  assert.equal(requestCookies.get('sb-local-auth-token.1'), 'second')
})

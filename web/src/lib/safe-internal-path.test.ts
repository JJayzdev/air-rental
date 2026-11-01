import assert from 'node:assert/strict'
import test from 'node:test'
import { safeInternalPath } from './safe-internal-path.ts'

test('only same-origin internal return paths are accepted', () => {
  assert.equal(
    safeInternalPath('/checkout?ready=1', '/don-thue', 'https://air.example'),
    '/checkout?ready=1',
  )
  assert.equal(
    safeInternalPath('//evil.example/path', '/don-thue', 'https://air.example'),
    '/don-thue',
  )
  assert.equal(
    safeInternalPath('/\\\\evil.example/path', '/don-thue', 'https://air.example'),
    '/don-thue',
  )
  assert.equal(
    safeInternalPath(
      '/checkout\nLocation: https://evil.example',
      '/don-thue',
      'https://air.example',
    ),
    '/don-thue',
  )
})

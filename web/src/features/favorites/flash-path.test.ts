import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withFlash } from './flash-path.ts'

test('favorite flash keeps catalog filters and replaces stale flash values', () => {
  assert.equal(
    withFlash('/san-pham?q=laptop&danh-muc=laptop', 'favorite', 'saved'),
    '/san-pham?q=laptop&danh-muc=laptop&favorite=saved',
  )
  assert.equal(
    withFlash('/san-pham?favorite=failed&q=camera', 'favorite', 'saved'),
    '/san-pham?favorite=saved&q=camera',
  )
})

test('favorite flash keeps the fragment and works on a bare path', () => {
  assert.equal(withFlash('/yeu-thich', 'favorite', 'removed'), '/yeu-thich?favorite=removed')
  assert.equal(
    withFlash('/san-pham#catalog', 'favorite', 'saved'),
    '/san-pham?favorite=saved#catalog',
  )
})

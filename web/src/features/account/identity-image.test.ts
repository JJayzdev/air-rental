import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { normalizeIdentityImage } from './identity-image.ts'

test('identity image accepts real PNG/JPEG bytes and normalizes to metadata-free JPEG', async () => {
  const png = await sharp({ create: { width: 12, height: 10, channels: 3, background: '#426a88' } })
    .png()
    .toBuffer()
  const result = await normalizeIdentityImage(new File([png], 'sample.png', { type: 'image/png' }))
  assert.equal(result.mimeType, 'image/jpeg')
  assert.equal(result.bytes[0], 0xff)
  assert.equal(result.bytes[1], 0xd8)
  assert.equal((await sharp(result.bytes).metadata()).format, 'jpeg')
})

test('identity image rejects a mismatched MIME/signature and a declared format with invalid data', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#000' } })
    .png()
    .toBuffer()
  await assert.rejects(
    normalizeIdentityImage(new File([png], 'x.jpg', { type: 'image/jpeg' })),
    /signature/,
  )
  await assert.rejects(
    normalizeIdentityImage(new File(['not an image'], 'x.png', { type: 'image/png' })),
  )
})

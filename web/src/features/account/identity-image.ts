import sharp from 'sharp'

export const IDENTITY_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const MAX_INPUT_PIXELS = 25_000_000

export type NormalizedIdentityImage = { bytes: Buffer; mimeType: 'image/jpeg' }

export async function normalizeIdentityImage(file: File): Promise<NormalizedIdentityImage> {
  if (file.size < 1 || file.size > IDENTITY_IMAGE_MAX_BYTES) throw new Error('size')
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') throw new Error('type')
  const bytes = Buffer.from(await file.arrayBuffer())
  const hasJpegSignature =
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const hasPngSignature =
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (
    (file.type === 'image/jpeg' && !hasJpegSignature) ||
    (file.type === 'image/png' && !hasPngSignature)
  ) {
    throw new Error('signature')
  }
  const image = sharp(bytes, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS })
  const metadata = await image.metadata()
  if (
    (file.type === 'image/jpeg' && metadata.format !== 'jpeg') ||
    (file.type === 'image/png' && metadata.format !== 'png')
  ) {
    throw new Error('format')
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_INPUT_PIXELS)
    throw new Error('dimensions')
  const normalized = await image
    .rotate()
    .resize({ width: 4000, height: 4000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer()
  if (!normalized.length || normalized.length > IDENTITY_IMAGE_MAX_BYTES)
    throw new Error('normalized-size')
  return { bytes: normalized, mimeType: 'image/jpeg' }
}

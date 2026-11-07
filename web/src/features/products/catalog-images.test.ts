import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogImageUrlsFromInput } from './catalog-images.ts'
import { mapSupabaseCatalogRow } from './catalog-data.ts'

const SUPABASE = 'https://demo.supabase.co'

test('để trống dùng ảnh mặc định', () => {
  assert.deepEqual(catalogImageUrlsFromInput('  \n ', SUPABASE), [
    '/images/catalog-placeholder.svg',
  ])
})

test('nhận ảnh nội bộ và Supabase Storage công khai', () => {
  const storage = `${SUPABASE}/storage/v1/object/public/catalog/a.jpg`
  assert.deepEqual(catalogImageUrlsFromInput(`/images/catalog/a.jpg\n${storage}`, SUPABASE), [
    '/images/catalog/a.jpg',
    storage,
  ])
})

test('từ chối link ngoài, đường dẫn leo thư mục và quá 8 ảnh', () => {
  assert.equal(catalogImageUrlsFromInput('https://images.unsplash.com/photo-1', SUPABASE), null)
  assert.equal(
    catalogImageUrlsFromInput(`${SUPABASE}/storage/v1/object/sign/x.jpg`, SUPABASE),
    null,
  )
  assert.equal(catalogImageUrlsFromInput('/images/../secret.png', SUPABASE), null)
  assert.equal(catalogImageUrlsFromInput('/images/a.jpg,'.repeat(9), SUPABASE), null)
  assert.equal(
    catalogImageUrlsFromInput(`${SUPABASE}/storage/v1/object/public/a.jpg`, undefined),
    null,
  )
})

test('mọi ảnh được nhận khi lưu đều hiển thị được trong danh mục', () => {
  const imageUrls = catalogImageUrlsFromInput(
    `/images/catalog/a.jpg\n${SUPABASE}/storage/v1/object/public/catalog/b.png`,
    SUPABASE,
  )
  assert.ok(imageUrls)
  const product = mapSupabaseCatalogRow(
    {
      id: '00000000-0000-4000-8000-000000000001',
      slug: 'may-test',
      name: 'Máy test',
      description: '',
      price_per_day_vnd: 100000,
      deposit_vnd: 0,
      specifications: {},
      image_urls: imageUrls,
      image_alt: '',
      sort_order: 1,
      is_sample: false,
      source_url: null,
      image_credit_author: null,
      image_license: null,
      image_license_url: null,
      image_source_url: null,
      image_modification_note: null,
      category: { slug: 'laptop', name: 'Laptop' },
    },
    SUPABASE,
  )
  assert.equal(product.imageUrls.length, 2)
})

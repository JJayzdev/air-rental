import assert from 'node:assert/strict'
import test from 'node:test'
import { searchCatalogProducts } from './product-search.ts'
import type { CatalogProduct } from '../products/catalog-data.ts'

const product = (overrides: Partial<CatalogProduct>): CatalogProduct => ({
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'product',
  name: 'Product',
  description: 'SAMPLE: giá thuê và cấu hình máy cần xác minh.',
  categorySlug: 'laptop',
  categoryName: 'Laptop',
  pricePerDayVnd: 1,
  depositVnd: 1,
  specifications: {},
  sourceUrl: null,
  imageUrls: [],
  imageAlt: 'Product',
  imageCredit: null,
  sortOrder: 1,
  isSample: true,
  ...overrides,
})

const products = [
  product({
    id: 'camera-1',
    slug: 'sony-a6400',
    name: 'Sony Alpha A6400',
    categorySlug: 'camera',
    categoryName: 'Máy ảnh',
    sortOrder: 1,
  }),
  product({
    id: 'camera-2',
    slug: 'canon-r50',
    name: 'Canon EOS R50',
    categorySlug: 'camera',
    categoryName: 'Máy ảnh',
    sortOrder: 2,
  }),
  product({
    id: 'laptop-1',
    slug: 'macbook-air',
    name: 'MacBook Air M3',
    categorySlug: 'laptop',
    categoryName: 'Laptop',
    sortOrder: 3,
  }),
]

test('category phrases rank matching devices above generic sample descriptions', () => {
  assert.deepEqual(
    searchCatalogProducts(products, 'Tìm máy ảnh').map((item) => item.id),
    ['camera-1', 'camera-2'],
  )
  assert.deepEqual(
    searchCatalogProducts(products, 'laptop cho học tập').map((item) => item.id),
    ['laptop-1'],
  )
})

test('a model or slug query favors exact matching catalog products', () => {
  assert.deepEqual(
    searchCatalogProducts(products, 'sony-a6400').map((item) => item.id),
    ['camera-1'],
  )
})

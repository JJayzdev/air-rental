import assert from 'node:assert/strict'
import { test } from 'node:test'
import { slugifyProductName, uniqueSlug } from './slug.ts'

test('slugifyProductName chuyển tên tiếng Việt thành slug ASCII', () => {
  assert.equal(slugifyProductName('Máy ảnh Sony A7'), 'may-anh-sony-a7')
  assert.equal(slugifyProductName('Điện thoại iPhone 15 Pro'), 'dien-thoai-iphone-15-pro')
  assert.equal(slugifyProductName('  Laptop   Dell XPS 13  '), 'laptop-dell-xps-13')
})

test('slugifyProductName bỏ ký tự đặc biệt và không để gạch nối thừa', () => {
  assert.equal(slugifyProductName('Máy ảnh (Canon) #1!'), 'may-anh-canon-1')
  assert.equal(slugifyProductName('---'), 'san-pham')
})

test('slugifyProductName giới hạn 80 ký tự và không kết thúc bằng gạch nối', () => {
  const slug = slugifyProductName('a'.repeat(200))
  assert.equal(slug.length, 80)
  assert.equal(slug.endsWith('-'), false)
})

test('uniqueSlug thêm hậu tố khi slug đã tồn tại', () => {
  assert.equal(uniqueSlug('may-anh', []), 'may-anh')
  assert.equal(uniqueSlug('may-anh', ['may-anh']), 'may-anh-2')
  assert.equal(uniqueSlug('may-anh', ['may-anh', 'may-anh-2']), 'may-anh-3')
})

test('uniqueSlug giữ độ dài tối đa khi phải thêm hậu tố', () => {
  const base = 'a'.repeat(80)
  const slug = uniqueSlug(base, [base])
  assert.equal(slug.length <= 80, true)
  assert.equal(slug.endsWith('-2'), true)
})

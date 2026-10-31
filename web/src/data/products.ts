import type { Category, Product } from '@/types'

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'Tất cả', icon: '✦' },
  { id: 'Laptop', label: 'Laptop', icon: '▰' },
  { id: 'Điện thoại', label: 'Điện thoại', icon: '▯' },
  { id: 'Máy ảnh', label: 'Máy ảnh', icon: '◉' },
  { id: 'Tablet', label: 'Tablet', icon: '▱' },
  { id: 'Phụ kiện', label: 'Phụ kiện', icon: '⌁' },
]

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=85`

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'MacBook Air M3',
    category: 'Laptop',
    price: 350000,
    image: unsplash('1565630916779-e303be97b6f5'),
    specs: '13.6", Apple M3, RAM 16GB, SSD 512GB',
    available: 5,
  },
  {
    id: 2,
    name: 'iPhone 16',
    category: 'Điện thoại',
    price: 250000,
    image: unsplash('1711967299865-c88350fddb70'),
    specs: '6.1", A18, Camera 48MP, 128GB',
    available: 4,
  },
  {
    id: 3,
    name: 'Sony Alpha A6400',
    category: 'Máy ảnh',
    price: 400000,
    image: unsplash('1516035069371-29a1b244cc32'),
    specs: '24.2MP, 4K, kèm lens 16–50mm',
    available: 3,
  },
  {
    id: 4,
    name: 'iPad Air',
    category: 'Tablet',
    price: 180000,
    image: unsplash('1553103291-346188e304d2'),
    specs: '11", chip M2, Wi‑Fi, 128GB',
    available: 6,
  },
  {
    id: 5,
    name: 'Dell XPS 13',
    category: 'Laptop',
    price: 300000,
    image: unsplash('1717865499857-ec35ce6e65fa'),
    specs: '13.4", Core Ultra 7, RAM 16GB',
    available: 3,
  },
  {
    id: 6,
    name: 'AirPods Pro',
    category: 'Phụ kiện',
    price: 90000,
    image: unsplash('1606841837239-c5a1a4a07af7'),
    specs: 'Chống ồn chủ động, USB‑C',
    available: 8,
  },
]

export const findProduct = (id: number): Product | undefined =>
  PRODUCTS.find((product) => product.id === id)

export const HERO = {
  image: unsplash('1565630916779-e303be97b6f5'),
  phone: unsplash('1711967299865-c88350fddb70'),
  camera: unsplash('1516035069371-29a1b244cc32'),
}

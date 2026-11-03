import type { CatalogProduct } from '@/features/products/catalog-data'

const stopWords = new Set([
  'tim',
  'goi',
  'y',
  'cho',
  'minh',
  'toi',
  'muon',
  'thue',
  'thiet',
  'bi',
  'may',
])

const normalize = (value: string) =>
  value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const categoryAliases: Array<[string[], CatalogProduct['categorySlug']]> = [
  [['laptop', 'may tinh xach tay'], 'laptop'],
  [['may anh', 'camera'], 'camera'],
  [['dien thoai', 'iphone', 'smartphone'], 'phone'],
  [['tablet', 'ipad'], 'tablet'],
  [['phu kien', 'tai nghe', 'headphone', 'gimbal'], 'accessory'],
]

export function searchCatalogProducts(products: CatalogProduct[], query: string, limit = 3) {
  const normalizedQuery = normalize(query.replaceAll('-', ' '))
  const category = categoryAliases.find(([aliases]) =>
    aliases.some((alias) => normalizedQuery.includes(alias)),
  )?.[1]
  const terms = normalizedQuery
    .split(/\s+/)
    .filter((term) => term.length > 1 && !stopWords.has(term))
  const candidates = products.filter((product) => !category || product.categorySlug === category)
  return candidates
    .map((product) => {
      const nameCategory = normalize(`${product.name} ${product.categoryName}`)
      const specifications = normalize(Object.values(product.specifications).join(' '))
      const description = normalize(product.description)
      let score = 0
      if (normalizedQuery && nameCategory.includes(normalizedQuery)) score += 5
      for (const term of terms) {
        if (normalize(product.name).includes(term)) score += 3
        else if (normalize(product.categoryName).includes(term)) score += 2
        else if (specifications.includes(term)) score += 1
        else if (description.includes(term)) score += 0.25
      }
      if (category) score += 2
      return { product, score }
    })
    .filter(({ score }) => score >= 1)
    .sort((a, b) => b.score - a.score || a.product.sortOrder - b.product.sortOrder)
    .slice(0, limit)
    .map(({ product }) => product)
}

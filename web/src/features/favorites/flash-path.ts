const FLASH_BASE = 'http://air.local'

/**
 * Adds a flash query parameter to an already-sanitized internal path while
 * preserving the catalog filters the visitor was looking at.
 */
export function withFlash(path: string, key: string, value: string): string {
  const url = new URL(path, FLASH_BASE)
  url.searchParams.set(key, value)
  return `${url.pathname}${url.search}${url.hash}`
}

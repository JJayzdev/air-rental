export function safeInternalPath(value: unknown, fallback: string, appOrigin: string): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    [...value].some((character) => {
      const code = character.charCodeAt(0)
      return code === 92 || code < 32 || code === 127
    })
  ) {
    return fallback
  }
  try {
    const origin = new URL(appOrigin).origin
    const target = new URL(value, origin)
    if (target.origin !== origin) return fallback
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return fallback
  }
}

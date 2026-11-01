export function appBaseUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  return new URL(configured || 'http://localhost:3000')
}

export function absoluteAppUrl(path: string): string {
  return new URL(path, appBaseUrl()).toString()
}

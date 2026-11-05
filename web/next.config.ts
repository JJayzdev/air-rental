import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl) : null

const unsplashPattern = {
  protocol: 'https' as const,
  hostname: 'images.unsplash.com',
  pathname: '/**',
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  // Repo có 2 package-lock.json (bản Vite ở gốc, bản Next trong web/).
  // Chỉ rõ root để Next không suy ra nhầm thư mục gốc của workspace.
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: supabaseOrigin
      ? [
          unsplashPattern,
          {
            protocol: supabaseOrigin.protocol.slice(0, -1) as 'http' | 'https',
            hostname: supabaseOrigin.hostname,
            port: supabaseOrigin.port,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [unsplashPattern],
  },
}

export default nextConfig

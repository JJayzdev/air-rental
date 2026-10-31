import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const projectRoot = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Repo có 2 package-lock.json (bản Vite ở gốc, bản Next trong web/).
  // Chỉ rõ root để Next không suy ra nhầm thư mục gốc của workspace.
  outputFileTracingRoot: projectRoot,
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Ensure proxy.js is used instead of middleware.ts
    proxyUsage: true,
  },
}

export default nextConfig

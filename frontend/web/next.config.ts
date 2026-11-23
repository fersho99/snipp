import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `next dev` must not create AGENTS.md in the repo.
  agentRules: false,
  turbopack: {
    // frontend/, so the panel can import the data shared with the app (../shared).
    root: path.join(__dirname, '..'),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // The client app, exported by `npm run app` into public/app, is served at
  // /app so it shares the browser storage with the panel. Its files are
  // served as they are; any other /app/... route opens the app, which
  // shows the right screen.
  async rewrites() {
    return [{ source: '/app/:path*', destination: '/app/index.html' }]
  },
}

export default nextConfig

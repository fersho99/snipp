import path from 'node:path'
import type { NextConfig } from 'next'

// Security headers for the panel and the app served at /app (RNF-G05).
// Next and the exported app put small scripts and styles inline, so
// 'unsafe-inline' stays until the server sends a nonce per page (backend).
// `next dev` also needs eval and a websocket to reload the page.
const dev = process.env.NODE_ENV !== 'production'
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=()' },
]

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
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
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

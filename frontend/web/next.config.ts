import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `next dev` must not create AGENTS.md in the repo.
  agentRules: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig

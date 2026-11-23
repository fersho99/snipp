'use client'

import { useSyncExternalStore } from 'react'

const noop = () => () => {}

// The demo keeps its data and the session in the browser storage, so
// every screen renders in the browser only. When the real API arrives,
// pages that can render on the server can move out of this wrapper.
export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  return mounted ? children : null
}

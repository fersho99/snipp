'use client'

import { useSearchParams } from 'next/navigation'

// Remounts the screen when its query changes, so the screen index can jump
// between states (?estado=...) of the same page.
export default function Keyed({ children }: { children: React.ReactNode }) {
  const search = useSearchParams().toString()
  return <div key={search}>{children}</div>
}

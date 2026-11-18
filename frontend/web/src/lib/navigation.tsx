'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Redirect rendered as a component: the screen moves to `to` as soon as it
// mounts. With `replace`, the current address is not kept in the history.
export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (replace) router.replace(to)
    else router.push(to)
  }, [router, to, replace])
  return null
}

// One-time message handed from one screen to the next (for example, the
// confirmation shown on the Empleados list after unlinking someone). It is
// read once and then cleared, so reloading the page does not show it again.
export type FlashNotice = { title: string; body: string }
let flash: FlashNotice | null = null
export const setFlash = (notice: FlashNotice) => {
  flash = notice
}
// Reads the pending notice once per screen and clears it after mounting.
export function useFlash(): FlashNotice | null {
  const [notice] = useState(() => flash)
  useEffect(() => {
    flash = null
  }, [])
  return notice
}

// Query string as page state (filters and tabs kept in the address, so a
// reload or a shared link opens the same view). Like useSearchParams, plus
// a setter that replaces the query.
export function useQueryState(): [URLSearchParams, (next: Record<string, string> | URLSearchParams, options?: { replace?: boolean }) => void] {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const setParams = (next: Record<string, string> | URLSearchParams, options?: { replace?: boolean }) => {
    const query = new URLSearchParams(next).toString()
    const url = query ? `${pathname}?${query}` : pathname
    if (options?.replace) router.replace(url, { scroll: false })
    else router.push(url, { scroll: false })
  }
  return [new URLSearchParams(params.toString()), setParams]
}

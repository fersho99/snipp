// SRS v1.2, 4.2.2: in the agenda and the orders, the block or card that
// changed status is highlighted for a moment with its new color. Whoever
// changes it calls `markChanged(id)`; the views read `useChanged()` and add
// the FLASH ring of the item's status color while it lasts.
import { useSyncExternalStore } from 'react'

export const FLASH_MS = 2500

let changed: Record<string, true> = {}
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function markChanged(id: string) {
  changed = { ...changed, [id]: true }
  emit()
  setTimeout(() => {
    const rest = { ...changed }
    delete rest[id]
    changed = rest
    emit()
  }, FLASH_MS)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const empty: Record<string, true> = {}
export const useChanged = () => useSyncExternalStore(subscribe, () => changed, () => empty)

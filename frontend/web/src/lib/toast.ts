// Brief green confirmation after an action that does not leave a message on
// the page (for example, removing a block or creating a product and going
// back to the list). One at a time; it goes away by itself after 4 s.
import { useSyncExternalStore } from 'react'

type Toast = { id: number; text: string } | null
let current: Toast = null
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(text: string) {
  current = { id: Date.now(), text }
  clearTimeout(timer)
  timer = setTimeout(() => {
    current = null
    emit()
  }, 4000)
  emit()
}

export function dismissToast() {
  clearTimeout(timer)
  current = null
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useToast = () => useSyncExternalStore(subscribe, () => current, () => null)

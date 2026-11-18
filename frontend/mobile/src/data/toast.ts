// Brief green confirmation shown by components/Done.tsx (Toaster). One at a
// time; it goes away by itself after 4 s.
import { useSyncExternalStore } from 'react';

export type Toast = { id: number; text: string; action?: { label: string; to: string } } | null;
let current: Toast = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, action?: { label: string; to: string }) {
  current = { id: Date.now(), text, action };
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, 4000);
  emit();
}

export function dismissToast() {
  clearTimeout(timer);
  current = null;
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useToast = () => useSyncExternalStore(subscribe, () => current, () => current);

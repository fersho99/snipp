// Brief confirmation shown by components/Done.tsx (Toaster): white with a
// green stripe (SRS v1.2, 4.2). One at a time; it goes away by itself after
// 4 s. `detail` adds lines under the message.
import { useSyncExternalStore } from 'react';

type ToastAction = { label: string; to: string | { pathname: string; params: Record<string, string> } };
export type Toast = { id: number; text: string; detail?: string[]; action?: ToastAction } | null;
let current: Toast = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, options: { action?: ToastAction; detail?: string[] } = {}) {
  current = { id: Date.now(), text, ...options };
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

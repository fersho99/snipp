// Notice at the top of the screen, shown by components/Done.tsx (Toaster):
// white with the stripe of its color (SRS v1.2, 4.2 "Respuesta a acciones"):
// - verde: the action went well; it closes by itself after 4 s.
// - rojo: the action failed; it says the cause and what to do, and stays
//   until the person closes it or taps its action ("Reintentar").
// One at a time. `detail` adds lines under the message.
import { useSyncExternalStore } from 'react';

type Route = string | { pathname: string; params: Record<string, string> };
export type ToastAction = { label: string; to?: Route; onPress?: () => void };
export type ToastTone = 'verde' | 'rojo';
export type Toast = { id: number; tone: ToastTone; text: string; detail?: string[]; action?: ToastAction } | null;

let current: Toast = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, options: { tone?: ToastTone; action?: ToastAction; detail?: string[] } = {}) {
  const tone = options.tone ?? 'verde';
  current = { id: nextId++, text, tone, detail: options.detail, action: options.action };
  clearTimeout(timer);
  if (tone === 'verde') {
    timer = setTimeout(() => {
      current = null;
      emit();
    }, 4000);
  }
  emit();
}

// Red notice with the cause and what to do (RNF-M06).
export const toastError = (text: string, options: { action?: ToastAction; detail?: string[] } = {}) => toast(text, { ...options, tone: 'rojo' });

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

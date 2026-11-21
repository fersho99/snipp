// Answer to every action that saves, sends or pays (RNF-M06, SRS v1.2, 4.2
// "Respuesta a acciones"):
// - while it works the button is locked, with a spinner and "Pagando...";
//   a second tap does nothing;
// - if it went well the button turns green with a check and the result
//   ("Pagado") for about 1.5 s, a green notice shows the message, and then
//   the app moves on (`next`);
// - if it failed the button turns red with a cross ("No se pudo pagar") for
//   about 1.5 s and goes back to normal, and a red notice says the cause and
//   what to do, with "Reintentar".
import { useEffect, useRef, useState } from 'react';
import { toast, toastError } from '../data/toast';

export type Outcome =
  | { ok: true; message?: string; detail?: string[]; next?: () => void }
  | { ok: false; reason: string; retry?: boolean; after?: () => void }; // `after` runs once the red answer is shown

export const RESULT_MS = 1500;
export const NETWORK_REASON = 'No pudimos conectar con SNIPP. Revisa tu internet e inténtalo de nuevo.';
export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function useAction(labels: { busy: string; done: string; failed: string }) {
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = async (task: () => Promise<Outcome>) => {
    if (running.current) return; // a double tap does not send it twice
    running.current = true;
    setPhase('busy');
    let out: Outcome;
    try {
      out = await task();
    } catch {
      out = { ok: false, reason: NETWORK_REASON };
    }
    if (!mounted.current) { running.current = false; return; }
    if (out.ok) {
      setPhase('done');
      if (out.message) toast(out.message, { detail: out.detail });
      await wait(RESULT_MS);
      running.current = false;
      if (mounted.current) setPhase('idle');
      out.next?.();
    } else {
      setPhase('failed');
      toastError(out.reason, out.retry === false ? {} : { action: { label: 'Reintentar', onPress: () => { if (mounted.current) run(task); } } });
      await wait(RESULT_MS);
      running.current = false;
      if (mounted.current) { setPhase('idle'); out.after?.(); }
    }
  };

  return {
    run,
    busy: phase !== 'idle',
    // Spread on the Button: <Button label="Pagar" {...pay.button} onPress={...} />
    button: {
      loading: phase === 'busy',
      busyLabel: labels.busy,
      result: phase === 'done' ? { tone: 'verde' as const, label: labels.done } : phase === 'failed' ? { tone: 'rojo' as const, label: labels.failed } : null,
    },
  };
}

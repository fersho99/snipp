'use client'

// Answer to every panel action that saves or sends (RNF-W07, same as the
// app's RNF-M06; SRS v1.2, 4.2 "Respuesta a acciones"):
// - while it works the button is locked, with a spinner and "Guardando...";
//   a second click does nothing;
// - if it went well the button turns green with a check and the result
//   ("Guardado") for about 1.5 s and a green notice shows the message; then
//   `onDone` runs (close the dialog, go back to the list...);
// - if it failed the button turns red with a cross ("No se pudo guardar")
//   for about 1.5 s and goes back to normal, and a red notice says the cause
//   and what to do, with "Reintentar". What was typed stays.
import { useEffect, useRef, useState } from 'react'
import { toast, toastError } from './toast'

export const RESULT_MS = 1500

// What a Button takes from an action: spinner, "Guardando..." and the result.
export type ActionButton = { loading: boolean; busyLabel: string; result: { tone: 'verde' | 'rojo'; label: string } | null }

// Cause and what to do for the errors the services throw (ApiError codes).
export function failureMessage(err: unknown) {
  const code = typeof err === 'object' && err !== null && 'code' in err ? (err as { code: unknown }).code : null
  // A rule of the shared store was broken (RN-01, RF-W18...): its message says why.
  if ((code === 'invalid' || code === 'conflict' || code === 'forbidden' || code === 'not-found') && err instanceof Error) return err.message
  if (code === 'offline') return 'No hay conexión a internet. Revisa tu conexión y vuelve a intentar; lo que escribiste sigue aquí.'
  if (code === 'card') return 'La tarjeta fue rechazada. Prueba con otra tarjeta o revisa con tu banco; no se cobró nada.'
  if (code === 'stripe') return 'Stripe no respondió. No se cobró nada; vuelve a intentar en un momento.'
  if (err instanceof Error && err.message && !('code' in err)) return err.message
  return 'Hubo un problema con el servidor. Intenta de nuevo en un momento; lo que escribiste sigue aquí.'
}

type Options<T> = {
  success?: string | ((result: T) => string)
  detail?: string
  onDone?: (result: T) => void
  onError?: (err: unknown) => void
  reason?: (err: unknown) => string
}

export default function useAction(labels: { busy: string; done: string; failed: string }) {
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle')
  const running = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const run = async <T,>(task: () => Promise<T>, options: Options<T> = {}) => {
    if (running.current) return // a double click does not send it twice
    running.current = true
    setPhase('busy')
    try {
      const result = await task()
      if (!mounted.current) return
      setPhase('done')
      const message = typeof options.success === 'function' ? options.success(result) : options.success
      if (message) toast(message, { detail: options.detail })
      await wait(RESULT_MS)
      if (mounted.current) setPhase('idle')
      options.onDone?.(result)
    } catch (err) {
      if (!mounted.current) return
      setPhase('failed')
      toastError((options.reason ?? failureMessage)(err), { action: { label: 'Reintentar', onClick: () => { if (mounted.current) run(task, options) } } })
      options.onError?.(err)
      await wait(RESULT_MS)
      if (mounted.current) setPhase('idle')
    } finally {
      running.current = false
    }
  }

  const button: ActionButton = {
    loading: phase === 'busy',
    busyLabel: labels.busy,
    result: phase === 'done' ? { tone: 'verde', label: labels.done } : phase === 'failed' ? { tone: 'rojo', label: labels.failed } : null,
  }
  return {
    run,
    busy: phase !== 'idle',
    // Spread on the Button: <Button {...save.button} onClick={...}>Guardar</Button>
    button,
  }
}

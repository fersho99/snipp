'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ExclamationMark, Hourglass, WifiSlash, X, type Icon } from '@phosphor-icons/react'
import { Button } from './ui'

// Error screen of the panel (RF-W29, RN-20, SRS v1.2, 4.2.2 "Pantalla de
// error"): shown in the content area, keeping the side menu. Centered red
// icon on a light red circle, title, a plain explanation and the reference
// code in gray ("Código E-503 · 18/11/2026 01:47"), with no technical
// details or support contacts: the code is how the error is found in the
// server logs. Black "Reintentar" and the
// "Ir al inicio del panel" link. Forms keep what was typed, so a successful
// retry brings the section back as it was.
export type PanelFailure = 'sin-conexion' | 'servidor' | 'tiempo' | 'no-existe'

const FAILURE: Record<PanelFailure, { Icon: Icon; bold?: boolean; code: string; title: string; body: string }> = {
  'sin-conexion': { Icon: WifiSlash, code: 'E-000', title: 'No hay conexión', body: 'SNIPP necesita internet para mostrar tu panel. Revisa tu conexión y vuelve a intentar.' },
  servidor: { Icon: ExclamationMark, bold: true, code: 'E-503', title: 'Algo salió mal', body: 'Tuvimos un problema de nuestro lado y no pudimos cargar esta sección. Vuelve a intentar en un momento.' },
  tiempo: { Icon: Hourglass, code: 'E-504', title: 'Esto tardó demasiado', body: 'La sección no respondió en 15 segundos. Puede ser tu conexión o el servidor; vuelve a intentar.' },
  'no-existe': { Icon: X, bold: true, code: 'E-404', title: 'Esta página no existe', body: 'La dirección está mal escrita o lo que buscas ya no existe.' },
}

export default function PanelError({ kind, title, detail, onRetry, retrying }: { kind: PanelFailure; title?: string; detail?: string; onRetry?: () => void; retrying?: boolean }) {
  const f = FAILURE[kind]
  // When the error happened, on the device clock (not the demo date).
  const [at] = useState(() => new Date())
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center" role="alert">
      <span className="flex size-24 items-center justify-center rounded-full bg-rojo-soft">
        <f.Icon size={44} weight={f.bold ? 'bold' : 'fill'} className="text-rojo" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-[28px] font-bold leading-tight">{title ?? f.title}</h1>
      <p className="mt-2 text-ink-soft">{detail ?? f.body}</p>
      <p className="tabular mt-3 text-sm text-ink-soft">Código {f.code} · {stamp(at)}</p>
      <Button className="mt-8 w-full max-w-xs" onClick={onRetry ?? (() => window.location.reload())} loading={retrying} busyLabel="Reintentando...">Reintentar</Button>
      <Link href="/panel" className="mt-4 inline-flex min-h-11 items-center font-medium underline underline-offset-4">Ir al inicio del panel</Link>
    </div>
  )
}

const two = (n: number) => String(n).padStart(2, '0')
const stamp = (d: Date) => `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`

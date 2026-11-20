'use client'

import { CheckCircle, X } from '@phosphor-icons/react'
import { dismissToast, useToast } from '@/lib/toast'

// Where the green confirmations of lib/toast.ts appear: bottom center,
// above everything. Screen readers announce them (role="status").
export default function Toaster() {
  const t = useToast()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status" aria-live="polite">
      {t ? (
        <div key={t.id} className="pointer-events-auto flex max-w-md items-start gap-3 rounded-control bg-verde-text px-4 py-3 text-white shadow-[0_6px_24px_rgb(0_0_0/0.18)]">
          <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-[15px] font-medium">{t.text}</p>
          <button type="button" onClick={dismissToast} className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-white/15" aria-label="Cerrar aviso">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

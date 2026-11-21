'use client'

import { CheckCircle, X, XCircle } from '@phosphor-icons/react'
import { dismissToast, useToast } from '@/lib/toast'

// Where the notices of lib/toast.ts appear: top right corner, above
// everything (SRS v1.2, 4.2.2).
// White with a green stripe and check when an action went well, or a red
// stripe and cross with the cause when it failed (SRS v1.2, 4.2). Screen
// readers announce them.
export default function Toaster() {
  const t = useToast()
  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-end sm:inset-x-auto sm:right-6 sm:top-6" role="status" aria-live="polite">
      {t ? (
        <div
          key={t.id}
          role={t.tone === 'rojo' ? 'alert' : undefined}
          className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-control border border-divider border-l-[5px] bg-raised px-4 py-3 text-ink shadow-[0_6px_24px_rgb(0_0_0/0.18)] ${t.tone === 'rojo' ? 'border-l-rojo' : 'border-l-verde'}`}
        >
          {t.tone === 'rojo' ? (
            <XCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-rojo-text" aria-hidden="true" />
          ) : (
            <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-verde-text" aria-hidden="true" />
          )}
          <div className="flex flex-col gap-0.5">
            <p className="text-[15px] font-medium">{t.text}</p>
            {t.detail ? <p className="text-sm text-ink-soft">{t.detail}</p> : null}
            {t.action ? (
              <button
                type="button"
                onClick={() => { const a = t.action; dismissToast(); a?.onClick() }}
                className="mt-1 self-start text-[15px] font-semibold underline underline-offset-4"
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
          <button type="button" onClick={dismissToast} className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-sunken" aria-label="Cerrar aviso">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

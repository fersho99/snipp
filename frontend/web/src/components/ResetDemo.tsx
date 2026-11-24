'use client'

import { useState } from 'react'
import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { resetDemoData } from '@shared/store'
import { Button, Dialog } from './ui'

// "Reiniciar datos de demo": the app and the panel go back to the sample
// data. Asks first, because it removes what was booked or changed in both.
export default function ResetDemo({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const reset = () => {
    resetDemoData()
    // The panel also keeps some sample data in memory: start it again too.
    window.location.reload()
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`flex min-h-11 items-center gap-3 rounded-control text-[15px] font-medium hover:bg-sunken-pressed ${className}`}>
        <ArrowCounterClockwise size={20} aria-hidden="true" />
        Reiniciar datos de demo
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="¿Reiniciar los datos de demo?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={reset}>Reiniciar</Button>
          </>
        }
      >
        <p>La app y el panel vuelven a los datos de ejemplo. Se pierden las citas y los cambios hechos en este navegador.</p>
      </Dialog>
    </>
  )
}

'use client'

import { useBusinessPanel } from '@/components/PanelContext'
import { History } from '../../components/staff'
import { useStaffStore } from '../../services/staff'

// Mi historial de citas (RF-W17): the Empleado sees their own history, the
// same one their Jefe sees.
export default function MyHistory() {
  const { session, business } = useBusinessPanel()
  const s = useStaffStore()
  const me = Object.values(s.staff).find((e) => e.email === session.email)
  return (
    <div className="max-w-4xl">
      <h1 className="text-[28px] font-bold leading-tight">Mi historial de citas</h1>
      <p className="mt-1 mb-6 text-ink-soft">Tus citas confirmadas, canceladas y reagendadas en {business?.name}, con la fecha y quién hizo cada cambio.</p>
      {me ? <History employeeId={me.id} self /> : <p className="text-ink-soft">Ya no estás vinculado a este negocio.</p>}
    </div>
  )
}

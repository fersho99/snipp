'use client'

import type { Review } from '../../services/reports'
import { useState } from 'react'
import { useBusinessPanel } from '@/components/PanelContext'
import { Flag, Star } from '@phosphor-icons/react'
import { Button, Dialog, Note, TextArea } from '../../components/ui'
import { networkMessage, type ApiError } from '../../services/auth'
import { reportReview, REVIEW_REPORT_REASONS, useReportsStore } from '../../services/reports'
import { longDate } from '../../theme'

// Overall rating of each branch, as the app shows it (same numbers as the mobile catalog).
const RATING: Record<string, { average: number; count: number }> = { 'los-compas-centro': { average: 4.7, count: 212 }, 'los-compas-norte': { average: 4.5, count: 86 } }
const selectCls = 'min-h-11 rounded-control border-2 border-divider bg-sunken px-3 text-[15px] outline-none focus:border-ink-soft'

// Reseñas del negocio (RF-W23), Jefe only. Each review can be reported to
// the Administrator with a reason; it stays visible until the Administrator
// decides (RF-W28, batch W9). The Jefe cannot delete or edit reviews.
export default function Reviews() {
  const { business, branches } = useBusinessPanel()
  const { reviews } = useReportsStore()
  const [branchId, setBranchId] = useState('todas')
  const [reporting, setReporting] = useState<Review | null>(null)
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null)
  // A review the Administrator deleted no longer exists for the business (RF-W28).
  const mine = reviews.filter((r) => r.businessId === business.id && r.reported?.state !== 'eliminada' && (branchId === 'todas' || r.branchId === branchId)).sort((a, b) => b.on.getTime() - a.on.getTime())
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? ''
  const shownBranches = branchId === 'todas' ? branches : branches.filter((b) => b.id === branchId)

  return (
    <div className="max-w-4xl">
      <h1 className="text-[28px] font-bold leading-tight">Reseñas</h1>
      <p className="mt-1 max-w-prose text-ink-soft">Lo que los clientes escriben después de una cita atendida. Si una reseña es inapropiada, repórtala al Administrador de SNIPP con el motivo.</p>

      <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-5">
        {shownBranches.map((b) => (
          <div key={b.id} className="border-l-[3px] border-ink pl-3">
            <p className="text-sm text-ink-soft">{b.name}</p>
            <p className="tabular flex items-center gap-1.5 font-title text-[28px] font-bold leading-tight">
              {RATING[b.id] ? RATING[b.id].average.toFixed(1) : '—'}
              {RATING[b.id] ? <Star size={22} weight="fill" aria-hidden="true" /> : null}
            </p>
            <p className="text-sm">{RATING[b.id] ? `${RATING[b.id].count} reseñas` : 'Sin reseñas todavía'}</p>
          </div>
        ))}
        <label className="ml-auto flex items-center gap-2">
          <span className="text-sm text-ink-soft">Sucursal</span>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selectCls}>
            <option value="todas">Todas</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      </div>

      {notice ? <div className="mt-6"><Note tone="done" title={notice.title}>{notice.body}</Note></div> : null}

      <h2 className="mt-10 text-lg font-semibold">Más recientes</h2>
      {mine.length ? (
        <ul className="mt-2">
          {mine.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 border-b border-divider py-5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{r.author}</span>
                  <span className="inline-flex items-center gap-0.5" aria-label={`${r.stars} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={15} weight={n <= r.stars ? 'fill' : 'regular'} aria-hidden="true" />)}
                  </span>
                </p>
                <p className="text-sm text-ink-soft">{longDate(r.on)} · {r.service} · {branchName(r.branchId)}</p>
                <p className="mt-2 max-w-prose text-[15px]">{r.text}</p>
                {r.reported ? (
                  <p className="mt-2 flex items-start gap-1.5 text-sm font-semibold">
                    <Flag size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                    {r.reported.state === 'mantenida'
                      ? `El Administrador revisó tu reporte del ${longDate(r.reported.on)} y decidió mantenerla.`
                      : `Reportada al Administrador el ${longDate(r.reported.on)}: ${r.reported.reason.toLowerCase()}. Sigue visible hasta que la revise.`}
                  </p>
                ) : null}
              </div>
              {!r.reported ? (
                <button type="button" onClick={() => { setReporting(r); setNotice(null) }} className="min-h-11 shrink-0 font-medium underline underline-offset-4">
                  Reportar al Administrador
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          <p className="font-semibold">Todavía no hay reseñas</p>
          <p className="mt-1 max-w-prose">Los clientes pueden escribir una reseña después de una cita atendida, una por cita.</p>
        </div>
      )}

      {reporting ? (
        <ReportDialog
          review={reporting}
          onClose={() => setReporting(null)}
          onDone={() => {
            setNotice({ title: `Reportaste la reseña de ${reporting.author}`, body: 'El Administrador de SNIPP la revisa. Mientras tanto sigue visible en la app.' })
            setReporting(null)
          }}
        />
      ) : null}
    </div>
  )
}

function ReportDialog({ review, onClose, onDone }: { review: Review; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState(REVIEW_REPORT_REASONS[0])
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (reason === 'Otro' && !detail.trim()) return setError('Explica el motivo para que el Administrador lo entienda.')
    setBusy(true)
    setFailure(null)
    try {
      await reportReview(review.id, reason, detail.trim())
      onDone()
    } catch (err) {
      setFailure(err as ApiError)
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Reportar reseña al Administrador"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} loading={busy}>Enviar reporte</Button>
        </>
      }
    >
      <blockquote className="border-l-[3px] border-gray-light pl-3 text-[15px]">
        <span className="font-semibold">{review.author}:</span> {review.text}
      </blockquote>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rr-reason" className="text-sm font-medium">Motivo</label>
        <select id="rr-reason" value={reason} onChange={(e) => { setReason(e.target.value); setError(null) }} className={selectCls}>
          {REVIEW_REPORT_REASONS.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <TextArea label={reason === 'Otro' ? 'Explica el motivo' : 'Detalles (opcional)'} rows={3} value={detail} onChange={(e) => { setDetail(e.target.value); setError(null) }} error={error} />
      <p className="text-sm text-ink-soft">Solo el Administrador puede eliminar una reseña.</p>
      {failure ? <Note title={networkMessage(failure).title}>No se envió el reporte. Intenta de nuevo.</Note> : null}
    </Dialog>
  )
}

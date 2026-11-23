'use client'

import type { Business } from '../../types/domain'
import type { LoyaltyRules } from '../../services/shop'
import { useState } from 'react'
import { useBusinessPanel } from '@/components/PanelContext'
import { Button, Note, TextField } from '../../components/ui'
import useAction from '@/lib/useAction'
import { loyaltyFor, saveLoyalty, useShopStore } from '../../services/shop'
import { money } from '../../theme'

// Puntos de lealtad (RF-W24, RN-09). Each business decides how many pesos
// make one point, for attended appointments and for store purchases, and
// how much one point is worth as a discount on products of its own store.
// Points are earned and spent only in this business. New rules apply to
// purchases and appointments from now on; points already earned stay.
export default function Loyalty() {
  const { business } = useBusinessPanel()
  const s = useShopStore()
  const rules = loyaltyFor(s, business.id)
  return <Form key={business.id} business={business} rules={rules} />
}

function Form({ business, rules }: { business: Business; rules: LoyaltyRules }) {
  const [form, setForm] = useState({
    appt: String(rules.pesosPerPointAppointments),
    buy: String(rules.pesosPerPointPurchases),
    redeem: String(rules.pesosPerPointRedeemed),
  })
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({})
  const saving = useAction({ busy: 'Guardando...', done: 'Reglas guardadas', failed: 'No se pudo guardar' })
  const [saved, setSaved] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); setSaved(false) }
  const num = (v: string) => Number(String(v).replace(/[$,\s]/g, ''))
  // RF-W24: whole pesos from 1 to 1,000, the same check the store runs again.
  const ok = (v: string) => /^\d{1,4}$/.test(String(v).replace(/[$,\s]/g, '')) && num(v) >= 1 && num(v) <= 1000

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!ok(form.appt)) next.appt = 'Escribe pesos enteros, de 1 a 1,000.'
    if (!ok(form.buy)) next.buy = 'Escribe pesos enteros, de 1 a 1,000.'
    if (!ok(form.redeem)) next.redeem = 'Escribe pesos enteros, de 1 a 1,000.'
    setErrors(next)
    if (Object.keys(next).length) return
    saving.run(() => saveLoyalty(business.id, { pesosPerPointAppointments: num(form.appt), pesosPerPointPurchases: num(form.buy), pesosPerPointRedeemed: num(form.redeem) }), { onDone: () => setSaved(true) })
  }

  // Live examples with the values being typed.
  const appt = ok(form.appt) ? Math.floor(280 / num(form.appt)) : null
  const buy = ok(form.buy) ? Math.floor(230 / num(form.buy)) : null
  const worth = ok(form.redeem) ? 50 * num(form.redeem) : null

  return (
    <div className="max-w-3xl">
      <h1 className="text-[28px] font-bold leading-tight">Puntos de lealtad</h1>
      <p className="mt-1 max-w-prose text-ink-soft">Tus clientes juntan puntos en {business.name} y solo los pueden usar aquí, como descuento en los productos de tu tienda. Los cambios aplican a las compras y citas que vengan; los puntos que ya tienen se respetan.</p>

      <form onSubmit={submit} noValidate className="mt-8 flex flex-col">
        <h2 className="text-lg font-semibold">Cómo se ganan</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextField label="Citas atendidas: 1 punto por cada" prefix="$" inputMode="numeric" maxLength={5} value={form.appt} onChange={set('appt')} error={errors.appt} hint={appt != null ? `Un Corte + barba de $280 da ${appt} ${appt === 1 ? 'punto' : 'puntos'}.` : undefined} />
          <TextField label="Compras en la tienda: 1 punto por cada" prefix="$" inputMode="numeric" maxLength={5} value={form.buy} onChange={set('buy')} error={errors.buy} hint={buy != null ? `Una Pomada mate de $230 da ${buy} ${buy === 1 ? 'punto' : 'puntos'}.` : undefined} />
        </div>

        <h2 className="mt-10 text-lg font-semibold">Cómo se canjean</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextField label="Cada punto vale" prefix="$" inputMode="numeric" maxLength={5} value={form.redeem} onChange={set('redeem')} error={errors.redeem} hint={worth != null ? `50 puntos = ${money(worth)} de descuento en productos de tu tienda.` : undefined} />
        </div>
        <p className="mt-3 text-sm text-ink-soft">Los puntos no sirven para pagar citas: las citas se pagan en la sucursal.</p>

        <div className="mt-10 flex flex-col gap-4">
          {saved ? <Note tone="done" title="Reglas guardadas. Las próximas compras y citas ya suman con estos valores." /> : null}
          <Button type="submit" {...saving.button} className="self-start">Guardar reglas</Button>
        </div>
      </form>
    </div>
  )
}

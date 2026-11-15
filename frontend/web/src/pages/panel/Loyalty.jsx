import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { Button, Note, TextField } from '../../components/ui'
import { networkMessage } from '../../services/auth'
import { loyaltyFor, saveLoyalty, useShopStore } from '../../services/shop'
import { money } from '../../theme'

// Puntos de lealtad (RF-W24, RN-09). Each business decides how many pesos
// make one point, for attended appointments and for store purchases, and
// how much one point is worth as a discount on products of its own store.
// Points are earned and spent only in this business. New rules apply to
// purchases and appointments from now on; points already earned stay.
export default function Loyalty() {
  const { business } = useOutletContext()
  const s = useShopStore()
  const rules = loyaltyFor(s, business.id)
  return <Form key={business.id} business={business} rules={rules} />
}

function Form({ business, rules }) {
  const [form, setForm] = useState({
    appt: String(rules.pesosPerPointAppointments),
    buy: String(rules.pesosPerPointPurchases),
    redeem: String(rules.pesosPerPointRedeemed),
  })
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); setSaved(false) }
  const num = (v) => Number(String(v).replace(/[$,\s]/g, ''))
  const ok = (v) => Number.isFinite(num(v)) && num(v) > 0

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!ok(form.appt)) next.appt = 'Escribe un monto en pesos mayor que cero.'
    if (!ok(form.buy)) next.buy = 'Escribe un monto en pesos mayor que cero.'
    if (!ok(form.redeem)) next.redeem = 'Escribe un monto en pesos mayor que cero.'
    setErrors(next)
    setFailure(null)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await saveLoyalty(business.id, { pesosPerPointAppointments: num(form.appt), pesosPerPointPurchases: num(form.buy), pesosPerPointRedeemed: num(form.redeem) })
      setSaved(true)
    } catch (err) {
      setFailure(err)
    } finally {
      setBusy(false)
    }
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
          <TextField label="Citas atendidas: 1 punto por cada" prefix="$" inputMode="decimal" value={form.appt} onChange={set('appt')} error={errors.appt} hint={appt != null ? `Un Corte + barba de $280 da ${appt} ${appt === 1 ? 'punto' : 'puntos'}.` : undefined} />
          <TextField label="Compras en la tienda: 1 punto por cada" prefix="$" inputMode="decimal" value={form.buy} onChange={set('buy')} error={errors.buy} hint={buy != null ? `Una Pomada mate de $230 da ${buy} ${buy === 1 ? 'punto' : 'puntos'}.` : undefined} />
        </div>

        <h2 className="mt-10 text-lg font-semibold">Cómo se canjean</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextField label="Cada punto vale" prefix="$" inputMode="decimal" value={form.redeem} onChange={set('redeem')} error={errors.redeem} hint={worth != null ? `50 puntos = ${money(worth)} de descuento en productos de tu tienda.` : undefined} />
        </div>
        <p className="mt-3 text-sm text-ink-soft">Los puntos no sirven para pagar citas: las citas se pagan en la sucursal.</p>

        <div className="mt-10 flex flex-col gap-4">
          {failure ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
          {saved ? <Note tone="done" title="Reglas guardadas. Las próximas compras y citas ya suman con estos valores." /> : null}
          <Button type="submit" loading={busy} className="self-start">Guardar reglas</Button>
        </div>
      </form>
    </div>
  )
}

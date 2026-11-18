'use client'

import type { Product } from '../../services/shop'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useBranchPanel } from '@/components/PanelContext'
import { ArrowLeft, ImageSquare, Plus, UploadSimple, WarningCircle } from '@phosphor-icons/react'
import { Button, Dialog, Note, TextArea, TextField } from '../../components/ui'
import { networkMessage, type ApiError } from '../../services/auth'
import { imageProblem, MAX_IMAGE_MB } from '../../services/branches'
import { adjustStock, productLabel, saveProduct, useShopStore } from '../../services/shop'
import { longDate, money, timeOfDay } from '../../theme'

// Productos e inventario of the branch picked in the menu (RF-W19, RF-W20).
// `sub` = 'detalle' opens one product (or "nuevo").
export default function Products({ sub }: { sub?: string }) {
  return sub === 'detalle' ? <ProductEditor /> : <ProductList />
}

const LOW = 3

function Thumb({ p, size = 56 }: { p: Pick<Product, 'photo' | 'name'>; size?: number }) {
  return p.photo ? (
    <img src={p.photo} alt="" className="shrink-0 rounded-[10px] object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-[10px] bg-sunken text-ink-soft" style={{ width: size, height: size }}>
      <ImageSquare size={size * 0.45} aria-label="Sin foto" />
    </span>
  )
}

function StockText({ stock }: { stock: number }) {
  if (stock === 0) return <span className="inline-flex items-center gap-1 font-semibold"><WarningCircle size={16} weight="fill" aria-hidden="true" />Agotado</span>
  return <span className={stock <= LOW ? 'font-semibold' : ''}>{stock} {stock === 1 ? 'pieza' : 'piezas'}{stock <= LOW ? ' · quedan pocas' : ''}</span>
}

function ProductList() {
  const { activeBranch } = useBranchPanel()
  const s = useShopStore()
  const list = s.products.filter((p) => p.branchId === activeBranch.id)
  const [adjusting, setAdjusting] = useState<Product | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Productos e inventario</h1>
          <p className="mt-1 text-ink-soft">{activeBranch.name} · lo que ves aquí es la tienda de esta sucursal en la app.</p>
        </div>
        <Link href="/panel/productos/nuevo" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-control bg-ink px-5 font-semibold text-white hover:bg-ink-pressed sm:self-auto">
          <Plus size={18} weight="bold" aria-hidden="true" />
          Agregar producto
        </Link>
      </div>

      {notice ? <div className="mt-6"><Note tone="done" title={notice} /></div> : null}

      {list.length ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-divider text-sm text-ink-soft">
                <th scope="col" className="py-2.5 pr-4 font-medium">Producto</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Precio</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Existencias</th>
                <th scope="col" className="py-2.5 pl-3 text-right font-medium"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-divider last:border-0">
                  <th scope="row" className="py-3 pr-4 font-normal">
                    <span className="flex items-center gap-3">
                      <Thumb p={p} />
                      <span className="font-semibold">{productLabel(p)}</span>
                    </span>
                  </th>
                  <td className="tabular px-3 py-3 text-right">{money(p.price)}</td>
                  <td className="tabular px-3 py-3"><StockText stock={p.stock} /></td>
                  <td className="py-3 pl-3 text-right">
                    <span className="inline-flex gap-4">
                      <button type="button" onClick={() => { setAdjusting(p); setNotice(null) }} className="min-h-11 font-medium underline underline-offset-4">Ajustar existencias</button>
                      <Link href={`/panel/productos/${encodeURIComponent(p.id)}`} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">Editar</Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-ink-soft">Las existencias bajan solas cuando se confirma el pago de un pedido. Un producto agotado se ve en la app, pero no se puede comprar.</p>
        </div>
      ) : (
        <div className="mt-10">
          <p className="font-semibold">Esta sucursal todavía no vende productos</p>
          <p className="mt-1 max-w-prose">Agrega el primero con su foto, precio y existencias; aparece en la tienda de la app para recoger aquí.</p>
        </div>
      )}

      <Moves branchId={activeBranch.id} />

      {adjusting ? <AdjustDialog product={adjusting} onClose={() => setAdjusting(null)} onDone={(t) => { setAdjusting(null); setNotice(t) }} /> : null}
    </div>
  )
}

// RF-W20: every change of stock, newest first.
function Moves({ branchId, productId }: { branchId?: string; productId?: string }) {
  const s = useShopStore()
  const [all, setAll] = useState(false)
  const list = s.moves.filter((m) => (productId ? m.productId === productId : m.productId.startsWith(`${branchId}:`))).sort((a, b) => b.on.getTime() - a.on.getTime())
  const nameOf = (id: string) => {
    const p = s.products.find((x) => x.id === id)
    return p ? productLabel(p) : ''
  }
  const shown = all ? list : list.slice(0, 8)
  return (
    <section className="mt-12" aria-labelledby="movimientos">
      <h2 id="movimientos" className="text-lg font-semibold">Movimientos de inventario</h2>
      {list.length ? (
        <>
          <ul className="mt-3 max-w-2xl">
            {shown.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-4 border-b border-divider py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="text-[15px]">{productId ? m.reason : `${nameOf(m.productId)} · ${m.reason}`}</p>
                  <p className="text-sm text-ink-soft">{longDate(m.on)}, {timeOfDay(m.on)}</p>
                </div>
                <span className="tabular shrink-0 font-semibold">{m.change > 0 ? `+${m.change}` : `−${Math.abs(m.change)}`}</span>
              </li>
            ))}
          </ul>
          {list.length > 8 ? <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 min-h-11 font-medium underline underline-offset-4">{all ? 'Ver menos' : `Ver los ${list.length}`}</button> : null}
        </>
      ) : (
        <p className="mt-3 text-ink-soft">Todavía no hay movimientos.</p>
      )}
    </section>
  )
}

const REASONS = ['Llegó mercancía', 'Corrección de conteo', 'Merma o producto dañado']

function AdjustDialog({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: (text: string) => void }) {
  const [value, setValue] = useState(String(product.stock))
  const [reason, setReason] = useState(REASONS[0])
  const [error, setError] = useState<string | null>(null)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)
  const n = Number(value)
  const valid = /^\d+$/.test(value.trim())
  const submit = async () => {
    if (!valid) return setError('Escribe cuántas piezas hay, en número entero.')
    if (n === product.stock) return setError('Es la misma cantidad que ya tiene.')
    setBusy(true)
    setFailure(null)
    try {
      await adjustStock(product.id, n, reason)
      onDone(`${productLabel(product)} quedó con ${n} ${n === 1 ? 'pieza' : 'piezas'}.`)
    } catch (err) {
      setFailure(err as ApiError)
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Ajustar existencias de ${productLabel(product)}`}
      actions={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit} loading={busy}>Guardar</Button></>}
    >
      <p>Hoy hay {product.stock} {product.stock === 1 ? 'pieza' : 'piezas'}.</p>
      <TextField label="Piezas que hay ahora" inputMode="numeric" value={value} onChange={(e) => { setValue(e.target.value); setError(null) }} error={error} hint={valid && n !== product.stock ? `Cambio: ${n > product.stock ? '+' : '−'}${Math.abs(n - product.stock)}` : undefined} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="adj-reason" className="text-sm font-medium">Motivo</label>
        <select id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-11 rounded-control border-2 border-transparent bg-sunken px-3 text-[15px] outline-none focus:border-ink-soft">
          {REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      {failure ? <Note title={networkMessage(failure).title}>No se guardó el ajuste. Intenta de nuevo.</Note> : null}
    </Dialog>
  )
}

type ProductDraft = { name: string; size: string; price: string; stock: string; description: string; howTo: string; photo: string | null }
const EMPTY: ProductDraft = { name: '', size: '', price: '', stock: '', description: '', howTo: '', photo: null }

function ProductEditor() {
  const { productId } = useParams<{ productId: string }>()
  const { activeBranch } = useBranchPanel()
  const s = useShopStore()
  const router = useRouter()
  const isNew = productId === 'nuevo'
  const existing = isNew ? null : s.products.find((p) => p.id === decodeURIComponent(productId))
  const [form, setForm] = useState<ProductDraft>(() => (existing ? { name: existing.name, size: existing.size, description: existing.description, howTo: existing.howTo, photo: existing.photo, price: String(existing.price), stock: String(existing.stock) } : EMPTY))
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({})
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  if (!isNew && (!existing || existing.branchId !== activeBranch.id)) {
    return (
      <div className="max-w-xl">
        <BackLink />
        <h1 className="mt-6 text-[28px] font-bold leading-tight">No encontramos este producto</h1>
        <p className="mt-2">Puede que sea de otra sucursal; cámbiala en el selector del menú.</p>
      </div>
    )
  }

  const set = (k: keyof ProductDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); setSaved(false) }
  const pick = (file: File | undefined) => {
    if (!file) return
    const problem = imageProblem(file) // RNF-W05
    setErrors((x) => ({ ...x, photo: problem }))
    if (!problem) { setForm((f) => ({ ...f, photo: URL.createObjectURL(file) })); setSaved(false) }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    const price = Number(form.price.replace(/[$,\s]/g, ''))
    if (!form.name.trim()) next.name = 'Escribe el nombre del producto.'
    if (!Number.isFinite(price) || price <= 0) next.price = 'Escribe el precio en pesos, mayor que cero.'
    if (isNew && !/^\d+$/.test(String(form.stock).trim())) next.stock = 'Escribe cuántas piezas hay, en número entero (puede ser 0).'
    setErrors(next)
    setFailure(null)
    if (Object.keys(next).length) return
    setBusy(true)
    const data = { ...(existing ?? {}), name: form.name.trim(), size: form.size.trim(), price, description: form.description.trim(), howTo: form.howTo.trim(), photo: form.photo, stock: isNew || !existing ? Number(form.stock) : existing.stock }
    try {
      await saveProduct(activeBranch.id, data)
      if (isNew) router.replace('/panel/productos')
      else setSaved(true)
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <BackLink />
      <h1 className="mt-6 text-[28px] font-bold leading-tight">{isNew || !existing ? 'Agregar producto' : productLabel(existing)}</h1>
      <p className="mt-1 text-ink-soft">{activeBranch.name}</p>

      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-5">
          <Thumb p={form} size={112} />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
                <UploadSimple size={18} aria-hidden="true" />
                {form.photo ? 'Cambiar foto' : 'Subir foto'}
              </Button>
              {form.photo ? <Button type="button" variant="secondary" onClick={() => setForm((f) => ({ ...f, photo: null }))}>Quitar foto</Button> : null}
            </div>
            <p className="text-sm text-ink-soft">JPG o PNG de hasta {MAX_IMAGE_MB} MB, con el producto sobre un fondo liso.</p>
            <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </div>
        </div>
        {errors.photo ? <p className="text-sm font-medium" role="alert">{errors.photo}</p> : null}

        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <TextField label="Nombre" value={form.name} onChange={set('name')} error={errors.name} />
          <TextField label="Presentación" value={form.size} onChange={set('size')} hint="Por ejemplo: 100 g o 30 ml." />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Precio" prefix="$" inputMode="decimal" value={form.price} onChange={set('price')} error={errors.price} />
          {isNew ? (
            <TextField label="Existencias iniciales" inputMode="numeric" value={form.stock} onChange={set('stock')} error={errors.stock} hint="Piezas que hay hoy en esta sucursal." />
          ) : (
            <div>
              <p className="text-[15px] font-medium">Existencias</p>
              <p className="tabular mt-3"><StockText stock={existing?.stock ?? 0} /></p>
              <p className="mt-1 text-sm text-ink-soft">Se cambian con «Ajustar existencias» en la lista.</p>
            </div>
          )}
        </div>
        <TextArea label="Descripción" rows={3} value={form.description} onChange={set('description')} hint="Para qué sirve; aparece en la ficha del producto en la app." />
        <TextArea label="Cómo se usa" rows={2} value={form.howTo} onChange={set('howTo')} />

        {failure ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
        {saved ? <Note tone="done" title="Producto guardado. Ya se ve así en la tienda de la app." /> : null}
        <Button type="submit" loading={busy} className="self-start">{isNew ? 'Agregar a la tienda' : 'Guardar cambios'}</Button>
      </form>

      {!isNew && existing ? <Moves productId={existing.id} /> : null}
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/panel/productos" className="inline-flex min-h-11 items-center gap-2 font-medium hover:underline">
      <ArrowLeft size={18} aria-hidden="true" />
      Productos e inventario
    </Link>
  )
}

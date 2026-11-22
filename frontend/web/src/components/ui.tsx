'use client'

// Base pieces of the SNIPP web panel: grayscale, no boxes around blocks,
// separation by space and a sunken tone. Focus is always visible.
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import Link from 'next/link'
import { CheckCircle, Eye, EyeSlash, WarningCircle, XCircle } from '@phosphor-icons/react'
const isotipo = '/brand/snipp-isotipo.png'
const wordmark = '/brand/snipp-wordmark.png'

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="SNIPP">
      <img src={isotipo} alt="" width={size} height={size} />
      <img src={wordmark} alt="" style={{ height: size * 0.42, width: 'auto' }} />
    </span>
  )
}

const base = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed'
const variants: Record<'primary' | 'secondary', string> = {
  primary: 'bg-ink text-white hover:bg-ink-pressed disabled:bg-gray-light disabled:text-white',
  secondary: 'bg-sunken text-ink ring-1 ring-inset ring-divider hover:bg-sunken-pressed disabled:text-ink-soft',
}

// `busyLabel` is the text while it works ("Guardando..."); `result` turns it
// green with a check ("Guardado") or red with a cross ("No se pudo
// guardar") for about 1.5 s (SRS v1.2, 4.2; see lib/useAction.ts).
type ButtonResult = { tone: 'verde' | 'rojo'; label: string } | null
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; loading?: boolean; busyLabel?: string; result?: ButtonResult }
export function Button({ variant = 'primary', loading, busyLabel, result, children, className = '', disabled, ...props }: ButtonProps) {
  // Dark tones of green and red keep white text above 4.5:1.
  const look = result ? (result.tone === 'verde' ? 'bg-verde-text text-white' : 'bg-rojo-text text-white') : variants[variant]
  return (
    <button
      className={`${base} ${look} ${className}`}
      {...props}
      disabled={loading || !!result || disabled}
      aria-busy={loading || undefined}
      aria-live="polite"
    >
      {result ? (
        <>
          {result.tone === 'verde' ? <CheckCircle size={18} weight="fill" aria-hidden="true" /> : <XCircle size={18} weight="fill" aria-hidden="true" />}
          {result.label}
        </>
      ) : loading ? (
        <>
          <Spinner />
          {busyLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  )
}

type TextLinkProps = { to?: string; children: ReactNode; className?: string; onClick?: () => void }
export function TextLink({ to, children, className = '', ...props }: TextLinkProps) {
  const cls = `font-medium text-ink underline underline-offset-4 decoration-1 hover:decoration-2 ${className}`
  return to ? <Link href={to} className={cls} {...props}>{children}</Link> : <button type="button" className={cls} {...props}>{children}</button>
}

function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
}

// Labelled input on a light gray fill with a gray border. Focus darkens the
// border; an error turns it red and adds a red message with an icon (SRS
// v1.2, 4.2 "Errores de formulario"). `secure` adds the show/hide control.
// Every field has a length limit (Fase 3); a screen passes its own
// maxLength from shared/validators.ts LIMITS, otherwise these apply.
const FIELD_MAX = 120
const AREA_MAX = 500
type FieldBase = { label: ReactNode; hint?: ReactNode; error?: ReactNode; className?: string }
type TextFieldProps = FieldBase & Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & { secure?: boolean; prefix?: ReactNode }
export function TextField({ label, hint, error, secure, prefix, className = '', ...props }: TextFieldProps) {
  const id = useId()
  const [hidden, setHidden] = useState(true)
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[15px] font-medium">{label}</label>
      <div
        className={`flex min-h-12 items-center rounded-control border-2 bg-sunken pl-4 transition-colors focus-within:bg-raised ${
          error ? 'border-rojo' : 'border-divider focus-within:border-ink-soft'
        }`}
      >
        {prefix ? <span className="tabular mr-2 text-ink-soft">{prefix}</span> : null}
        <input
          id={id}
          type={secure && hidden ? 'password' : props.type ?? 'text'}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className="min-h-11 flex-1 bg-transparent pr-4 text-base text-ink outline-none placeholder:text-ink-soft"
          maxLength={FIELD_MAX}
          {...props}
        />
        {secure ? (
          <button
            type="button"
            onClick={() => setHidden((h) => !h)}
            className="flex size-11 items-center justify-center text-ink-soft"
            aria-label={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            {hidden ? <Eye size={22} /> : <EyeSlash size={22} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-2 text-sm font-medium text-rojo-text" role="alert">
          <WarningCircle size={18} weight="fill" className="mt-px shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">{hint}</p>
      ) : null}
    </div>
  )
}

// Red message with an icon under a field or a group (SRS v1.2, 4.2).
export function FieldError({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-sm font-medium text-rojo-text ${className}`} role="alert">
      <WarningCircle size={18} weight="fill" className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  )
}

// Inline message with a bar: a failed request (error) in red or a done
// action (done) in green, each with the light fill of its color, its bar and
// icon; the text stays in ink so it is easy to read (SRS v1.2, 4.1).
type NoteProps = { tone?: 'error' | 'done'; title: ReactNode; children?: ReactNode; action?: ReactNode }
export function Note({ tone = 'error', title, children, action }: NoteProps) {
  const done = tone === 'done'
  const Icon = done ? CheckCircle : WarningCircle
  return (
    <div className={`flex gap-3 rounded-control py-3 pr-4 ${done ? 'bg-verde-soft' : 'bg-rojo-soft'}`} role={done ? 'status' : 'alert'}>
      <span className={`w-[3px] shrink-0 rounded-full ${done ? 'bg-verde' : 'bg-rojo'}`} />
      <div className="flex flex-col gap-1">
        <p className={`flex items-start gap-1.5 font-semibold ${done ? '' : 'text-rojo-text'}`}>
          <Icon size={18} weight="fill" className={`mt-0.5 shrink-0 ${done ? 'text-verde-text' : ''}`} />
          {title}
        </p>
        {children ? <p className="text-sm">{children}</p> : null}
        {action}
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`block animate-pulse rounded-md bg-sunken ${className}`} aria-hidden="true" />
}

// Multi-line field with the same look and messages as TextField.
type TextAreaProps = FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>
export function TextArea({ label, hint, error, className = '', rows = 4, ...props }: TextAreaProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[15px] font-medium">{label}</label>
      <textarea
        id={id}
        rows={rows}
        maxLength={AREA_MAX}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy}
        className={`rounded-control border-2 bg-sunken px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-soft focus:bg-raised ${
          error ? 'border-rojo' : 'border-divider focus:border-ink-soft'
        }`}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-2 text-sm font-medium text-rojo-text" role="alert">
          <WarningCircle size={18} weight="fill" className="mt-px shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">{hint}</p>
      ) : null}
    </div>
  )
}

// Checkbox with its label on the right; the box is drawn in ink when checked.
type CheckboxProps = { label: ReactNode; hint?: ReactNode; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>
export function Checkbox({ label, hint, className = '', ...props }: CheckboxProps) {
  const id = useId()
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input id={id} type="checkbox" className="mt-0.5 size-5 shrink-0 accent-ink" aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      <div>
        <label htmlFor={id} className="text-[15px] font-medium">{label}</label>
        {hint ? <p id={`${id}-hint`} className="text-sm text-ink-soft">{hint}</p> : null}
      </div>
    </div>
  )
}

// Modal confirmation. Uses the native <dialog>, so focus stays inside and Esc closes it.
type DialogProps = { open: boolean; title: ReactNode; children?: ReactNode; onClose: () => void; actions?: ReactNode }
export function Dialog({ open, title, children, onClose, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-[14px] bg-raised p-0 text-ink backdrop:bg-ink/40"
      aria-labelledby="dialog-title"
    >
      <div className="p-6 sm:p-7">
        <h2 id="dialog-title" className="text-xl font-bold leading-snug">{title}</h2>
        <div className="mt-3 flex flex-col gap-3">{children}</div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{actions}</div>
      </div>
    </dialog>
  )
}

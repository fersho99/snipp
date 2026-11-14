// Base pieces of the SNIPP web panel: grayscale, no boxes around blocks,
// separation by space and a sunken tone. Focus is always visible.
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle, Eye, EyeSlash, WarningCircle } from '@phosphor-icons/react'
import isotipo from '../assets/brand/snipp-isotipo.png'
import wordmark from '../assets/brand/snipp-wordmark.png'

export function Logo({ size = 36 }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="SNIPP">
      <img src={isotipo} alt="" width={size} height={size} />
      <img src={wordmark} alt="" style={{ height: size * 0.42, width: 'auto' }} />
    </span>
  )
}

const base = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed'
const variants = {
  primary: 'bg-ink text-white hover:bg-ink-pressed disabled:bg-gray-light disabled:text-white',
  secondary: 'bg-sunken text-ink hover:bg-sunken-pressed disabled:text-ink-soft',
}

export function Button({ variant = 'primary', loading, children, className = '', ...props }) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading || props.disabled} aria-busy={loading || undefined} {...props}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}

export function TextLink({ to, children, className = '', ...props }) {
  const cls = `font-medium text-ink underline underline-offset-4 decoration-1 hover:decoration-2 ${className}`
  return to ? <Link to={to} className={cls} {...props}>{children}</Link> : <button type="button" className={cls} {...props}>{children}</button>
}

function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
}

// Labelled input on a sunken fill. Focus adds a gray ring; an error an ink
// ring plus icon and message. `secure` adds the show/hide control.
export function TextField({ label, hint, error, secure, prefix, className = '', ...props }) {
  const id = useId()
  const [hidden, setHidden] = useState(true)
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[15px] font-medium">{label}</label>
      <div
        className={`flex min-h-12 items-center rounded-control border-2 bg-sunken pl-4 transition-colors focus-within:bg-raised ${
          error ? 'border-ink' : 'border-transparent focus-within:border-ink-soft'
        }`}
      >
        {prefix ? <span className="tabular mr-2 text-ink-soft">{prefix}</span> : null}
        <input
          id={id}
          type={secure && hidden ? 'password' : props.type ?? 'text'}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className="min-h-11 flex-1 bg-transparent pr-4 text-base text-ink outline-none placeholder:text-ink-soft"
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
        <p id={`${id}-error`} className="flex items-start gap-2 text-sm font-medium text-ink" role="alert">
          <WarningCircle size={18} className="mt-px shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">{hint}</p>
      ) : null}
    </div>
  )
}

// Inline message with a 3 px bar: a failed request (error) or a done action (done).
export function Note({ tone = 'error', title, children, action }) {
  const Icon = tone === 'done' ? CheckCircle : WarningCircle
  return (
    <div className="flex gap-3" role={tone === 'error' ? 'alert' : 'status'}>
      <span className="w-[3px] shrink-0 rounded-full bg-ink" />
      <div className="flex flex-col gap-1">
        <p className="flex items-start gap-1.5 font-semibold">
          <Icon size={18} weight="fill" className="mt-0.5 shrink-0" />
          {title}
        </p>
        {children ? <p className="text-sm">{children}</p> : null}
        {action}
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <span className={`block animate-pulse rounded-md bg-sunken ${className}`} aria-hidden="true" />
}

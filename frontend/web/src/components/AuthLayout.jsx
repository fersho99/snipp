import { Link } from 'react-router'
import { Logo } from './ui'
import interior from '../assets/photos/barberia-interior.jpg'
import fade from '../assets/photos/trabajo-fade.jpg'

const PHOTOS = {
  interior: { src: interior, alt: 'Dos sillones de barbero de piel frente al espejo largo de Barbería Los Compas', caption: 'Barbería Los Compas, Av. Obregón y Calle 5' },
  fade: { src: fade, alt: 'Barbero haciendo un fade con máquina en la nuca de un cliente', caption: 'Luis Ortega, fade en Barbería Los Compas' },
}

// Split screen for access and sign-up: a real photo of a business on the
// left, the form on the right. Under 768 px the photo is left out.
export default function AuthLayout({ photo = 'interior', children }) {
  const p = PHOTOS[photo]
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <figure className="relative hidden md:sticky md:top-0 md:block md:h-dvh">
        <img src={p.src} alt={p.alt} className="absolute inset-0 size-full object-cover" />
        <figcaption className="absolute bottom-0 left-0 right-0 bg-ink/75 px-8 py-4 text-sm text-white">
          {p.caption}
        </figcaption>
      </figure>
      <main className="flex min-h-dvh flex-col px-4 py-6 sm:px-10 md:py-10 lg:px-16">
        <Link to="/entrar" className="self-start rounded-control" aria-label="SNIPP, ir a Entrar">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center py-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  )
}

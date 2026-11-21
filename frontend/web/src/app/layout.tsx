import type { Metadata, Viewport } from 'next'
import { Montserrat, Onest } from 'next/font/google'
import ClientOnly from '@/components/ClientOnly'
import Toaster from '@/components/Toaster'
import './globals.css'

const montserrat = Montserrat({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-montserrat' })
const onest = Onest({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-onest' })

export const metadata: Metadata = {
  title: 'SNIPP',
  icons: { icon: '/favicon.png' },
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${montserrat.variable} ${onest.variable}`}>
      <body>
        <ClientOnly>
          {children}
          <Toaster />
        </ClientOnly>
      </body>
    </html>
  )
}

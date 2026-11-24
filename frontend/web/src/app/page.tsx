import { redirect } from 'next/navigation'

// "/" opens the panel: with a session it shows the panel of that account,
// without one the panel sends to Entrar. The index of every screen is in
// /pantallas (development only).
export default function Page() {
  redirect('/panel')
}

import { Navigate, useNavigate } from 'react-router'
import { Button, Logo } from '../components/ui'
import { currentSession, logout } from '../services/auth'
import { ROLE_LABEL } from '../data/demo'

// Landing after sign-in. Batch W2 replaces it with the panel shell (menu per
// role, branch selector, subscription notices). For W1 it proves the session
// opens with the right role and can be closed (RF-W03, RF-W04).
export default function PanelEntry() {
  const navigate = useNavigate()
  const s = currentSession()
  if (!s) return <Navigate to="/entrar" replace />

  const where = s.role === 'admin'
    ? 'Administras la plataforma SNIPP.'
    : s.business
      ? `${ROLE_LABEL[s.role]} de ${s.business}.`
      : 'Todavía no trabajas en ningún negocio.'

  return (
    <div className="min-h-dvh px-4 py-6 sm:px-10">
      <Logo />
      <main className="mt-16 max-w-xl">
        <h1 className="text-[28px] font-bold leading-tight">Entraste como {s.name}</h1>
        <p className="mt-2">{where}</p>
        <p className="mt-1 text-ink-soft">{s.email}</p>
        <Button variant="secondary" className="mt-8" onClick={() => { logout(); navigate('/entrar', { replace: true }) }}>
          Cerrar sesión
        </Button>
      </main>
    </div>
  )
}

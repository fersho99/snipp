import { Navigate } from '@/lib/navigation'

// Any unknown address goes to Entrar.
export default function NotFound() {
  return <Navigate to="/entrar" replace />
}

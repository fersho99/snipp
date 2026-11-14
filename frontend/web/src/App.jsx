import { Navigate, Route, Routes, useLocation } from 'react-router'
import DevIndex from './pages/DevIndex'
import Login from './pages/Login'
import Recover from './pages/Recover'
import ResetPassword from './pages/ResetPassword'
import RegisterBusiness from './pages/RegisterBusiness'
import RegisterEmployee from './pages/RegisterEmployee'
import PanelEntry from './pages/PanelEntry'

// Remounts each screen when its query changes, so the screen index can jump
// between states (?estado=...) of the same page.
function Keyed({ children }) {
  const { search } = useLocation()
  return <div key={search}>{children}</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DevIndex />} />
      <Route path="/entrar" element={<Keyed><Login /></Keyed>} />
      <Route path="/recuperar" element={<Keyed><Recover /></Keyed>} />
      <Route path="/restablecer" element={<Keyed><ResetPassword /></Keyed>} />
      <Route path="/registro/negocio" element={<Keyed><RegisterBusiness /></Keyed>} />
      <Route path="/registro/empleado" element={<Keyed><RegisterEmployee /></Keyed>} />
      <Route path="/panel" element={<PanelEntry />} />
      <Route path="*" element={<Navigate to="/entrar" replace />} />
    </Routes>
  )
}

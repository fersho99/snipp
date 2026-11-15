import { Navigate, Route, Routes, useLocation } from 'react-router'
import DevIndex from './pages/DevIndex'
import Login from './pages/Login'
import Recover from './pages/Recover'
import ResetPassword from './pages/ResetPassword'
import RegisterBusiness from './pages/RegisterBusiness'
import RegisterEmployee from './pages/RegisterEmployee'
import PanelLayout from './components/PanelLayout'
import Section, { PanelHome } from './pages/panel/Section'
import OverduePayment from './pages/OverduePayment'

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
      <Route path="/panel" element={<PanelLayout />}>
        <Route index element={<PanelHome />} />
        <Route path=":section" element={<Section />} />
        <Route path="sucursales/nueva" element={<Section id="sucursales" sub="nueva" />} />
        <Route path="sucursales/:branchId" element={<Section id="sucursales" sub="editar" />} />
      </Route>
      <Route path="/pago-pendiente" element={<OverduePayment />} />
      <Route path="*" element={<Navigate to="/entrar" replace />} />
    </Routes>
  )
}

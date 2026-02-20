import { Routes, Route } from 'react-router-dom'
import Join from './pages/Join'

export default function App() {
  return (
    <Routes>
      <Route path="/join/:orderId" element={<Join />} />
      <Route path="*" element={<div style={{ padding: 24, textAlign: 'center' }}>Usa el enlace que te pasaron para unirte a un pedido.</div>} />
    </Routes>
  )
}

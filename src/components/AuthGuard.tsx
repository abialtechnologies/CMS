import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader } from 'lucide-react'

export function AuthGuard() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'hsl(220 18% 7%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        color: 'hsl(220 15% 55%)', fontSize: '0.875rem',
      }}>
        <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Loading...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeCode } from '../lib/googleAuth'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const service = (params.get('state') || sessionStorage.getItem('oauth_service') || 'gsc') as 'gsc' | 'ga4'
    const error = params.get('error')

    if (error) { setStatus('error'); setMsg(error); return }
    if (!code) { setStatus('error'); setMsg('No auth code received'); return }

    exchangeCode(code, service)
      .then(() => {
        setStatus('success')
        setMsg(`${service === 'gsc' ? 'Google Search Console' : 'Google Analytics 4'} connected!`)
        setTimeout(() => navigate('/settings?tab=integrations'), 2000)
      })
      .catch(e => {
        setStatus('error')
        setMsg(e.message || 'Connection failed')
      })
  }, [])

  const Icon = status === 'loading' ? Loader : status === 'success' ? CheckCircle : XCircle
  const color = status === 'loading' ? 'var(--text-muted)' : status === 'success' ? '#22c55e' : '#ef4444'

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 18% 7%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 380 }}>
        <Icon size={48} color={color} style={{ marginBottom: '1rem', animation: status === 'loading' ? 'spin 1s linear infinite' : 'none' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          {status === 'loading' ? 'Connecting…' : status === 'success' ? 'Connected!' : 'Error'}
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{msg || 'Processing OAuth response…'}</p>
        {status === 'error' && (
          <button onClick={() => navigate('/settings?tab=integrations')} className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
            Back to Settings
          </button>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

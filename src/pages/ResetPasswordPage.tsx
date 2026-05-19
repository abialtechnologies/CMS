import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',   color: '#ef4444' }
  if (score <= 3) return { score, label: 'Fair',   color: '#f97316' }
  if (score === 4) return { score, label: 'Good',   color: '#eab308' }
  return               { score, label: 'Strong', color: '#22c55e' }
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPw, setShowPw]             = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [ready, setReady]               = useState(false)   // session from recovery link
  const [done, setDone]                 = useState(false)

  // Supabase sends the recovery token as a URL fragment or query param
  // onAuthStateChange fires with event='PASSWORD_RECOVERY' when valid
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Also check if we already have a session (user arrived with valid token)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const strength = getStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (strength.score < 2) {
      setError('Password is too weak. Add uppercase letters, numbers or symbols.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message || 'Failed to update password. Try again.')
      return
    }

    setDone(true)
    toast.success('Password updated! Please log in with your new password.')
    // Sign out so the session doesn't auto-redirect to dashboard
    await supabase.auth.signOut()
    setTimeout(() => navigate('/login', { replace: true }), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(220 18% 7%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{ position:'absolute', top:'-10%', left:'50%', transform:'translateX(-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,hsla(0,80%,55%,0.06) 0%,transparent 70%)', pointerEvents:'none' }} />

      <div style={{
        width: '100%', maxWidth: 420,
        background: 'hsl(220 18% 10%)',
        border: '1px solid hsl(220 15% 18%)',
        borderRadius: '1.25rem', padding: '2.5rem 2rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '1rem', margin: '0 auto 1rem',
            background: done
              ? 'linear-gradient(135deg,#22c55e,#16a34a)'
              : 'linear-gradient(135deg,hsl(0,80%,55%),hsl(25,95%,53%))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: done ? '0 8px 24px rgba(34,197,94,0.35)' : '0 8px 24px hsla(0,80%,55%,0.35)',
            transition: 'all 0.4s',
          }}>
            {done ? <CheckCircle size={24} color="white" /> : <ShieldCheck size={24} color="white" />}
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'hsl(0 0% 98%)', marginBottom: 4 }}>
            {done ? 'Password Updated!' : 'Set New Password'}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'hsl(220 15% 55%)', lineHeight: 1.5 }}>
            {done
              ? 'Redirecting you to login…'
              : 'Choose a strong password for your CMS account'}
          </p>
        </div>

        {/* ── SUCCESS STATE ── */}
        {done && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '0.875rem', color: '#22c55e', fontWeight: 600, marginBottom: 8 }}>
              ✓ Your password has been changed
            </div>
            <div style={{ fontSize: '0.78rem', color: 'hsl(220 15% 50%)' }}>
              Taking you back to login in a moment…
            </div>
          </div>
        )}

        {/* ── NOT READY (invalid/expired link) ── */}
        {!done && !ready && (
          <div style={{
            background: 'hsla(0,80%,55%,0.07)', border: '1px solid hsla(0,80%,55%,0.2)',
            borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center',
          }}>
            <AlertCircle size={20} color="hsl(0,80%,65%)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(0,80%,65%)', marginBottom: 6 }}>
              Invalid or Expired Link
            </div>
            <div style={{ fontSize: '0.78rem', color: 'hsl(220 15% 55%)', lineHeight: 1.6, marginBottom: '1rem' }}>
              This reset link has expired or is invalid. Please request a new one.
            </div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '0.65rem', border: 'none',
                background: 'linear-gradient(135deg,hsl(0,80%,55%),hsl(25,95%,53%))',
                color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Back to Login
            </button>
          </div>
        )}

        {/* ── RESET FORM ── */}
        {!done && ready && (
          <form onSubmit={handleSubmit} noValidate>

            {/* New Password */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'hsl(220 15% 60%)', marginBottom:6 }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'hsl(220 15% 45%)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Minimum 8 characters"
                  required
                  style={{
                    width:'100%', padding:'0.75rem 2.75rem 0.75rem 2.5rem',
                    background:'hsl(220 18% 13%)',
                    border:`1px solid ${error ? 'hsla(0,80%,55%,0.5)' : 'hsl(220 15% 20%)'}`,
                    borderRadius:'0.75rem', color:'hsl(0 0% 95%)', fontSize:'0.875rem',
                    outline:'none', boxSizing:'border-box',
                  }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'hsl(220 15% 45%)', padding:2 }}>
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {/* Strength bar */}
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:99, background: i <= strength.score ? strength.color : 'hsl(220 15% 20%)', transition:'background 0.3s' }} />
                    ))}
                  </div>
                  <div style={{ fontSize:'0.7rem', color: strength.color, fontWeight:600 }}>{strength.label}</div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'hsl(220 15% 60%)', marginBottom:6 }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'hsl(220 15% 45%)' }} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError('') }}
                  placeholder="Re-enter your password"
                  required
                  style={{
                    width:'100%', padding:'0.75rem 2.75rem 0.75rem 2.5rem',
                    background:'hsl(220 18% 13%)',
                    border:`1px solid ${confirm && confirm !== password ? 'hsla(0,80%,55%,0.5)' : confirm && confirm === password ? 'hsla(142,76%,36%,0.4)' : 'hsl(220 15% 20%)'}`,
                    borderRadius:'0.75rem', color:'hsl(0 0% 95%)', fontSize:'0.875rem',
                    outline:'none', boxSizing:'border-box',
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'hsl(220 15% 45%)', padding:2 }}>
                  {showConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {confirm && confirm === password && (
                <div style={{ fontSize:'0.72rem', color:'#22c55e', marginTop:5, display:'flex', alignItems:'center', gap:4 }}>
                  <CheckCircle size={11}/> Passwords match
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background:'hsla(0,80%,55%,0.08)', border:'1px solid hsla(0,80%,55%,0.25)',
                borderRadius:'0.65rem', padding:'0.65rem 0.875rem', marginBottom:'1rem',
                display:'flex', alignItems:'flex-start', gap:8,
              }}>
                <AlertCircle size={14} color="hsl(0,80%,65%)" style={{ marginTop:1, flexShrink:0 }}/>
                <span style={{ fontSize:'0.8rem', color:'hsl(0,80%,65%)', lineHeight:1.5 }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width:'100%', padding:'0.875rem', border:'none', borderRadius:'0.75rem',
                background: loading ? 'hsl(220 15% 20%)' : 'linear-gradient(135deg,hsl(0,80%,55%),hsl(25,95%,53%))',
                color:'white', fontSize:'0.9rem', fontWeight:700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow: loading ? 'none' : '0 4px 16px hsla(0,80%,55%,0.3)',
              }}
            >
              {loading ? <><Loader size={16} style={{ animation:'spin 1s linear infinite' }}/> Updating…</> : 'Update Password'}
            </button>
          </form>
        )}

        {/* Security badge */}
        <div style={{ marginTop:'2rem', paddingTop:'1rem', borderTop:'1px solid hsl(220 15% 15%)', textAlign:'center' }}>
          <p style={{ fontSize:'0.7rem', color:'hsl(220 15% 38%)', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <ShieldCheck size={11}/>
            Secured with Supabase Auth · CMS Access Only
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}

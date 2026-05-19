import { useState, useEffect, useRef, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, AlertCircle, CheckCircle, ArrowLeft, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

// ─── Security Config ────────────────────────────────────────────────────────
const ALLOWED_EMAIL  = (import.meta.env.VITE_ALLOWED_EMAIL || '').toLowerCase().trim()
const CMS_URL        = import.meta.env.VITE_CMS_URL || 'https://cms.abial.ai'
const MAX_ATTEMPTS   = 5
const LOCKOUT_MS     = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_KEY    = 'cms_lockout'
const ATTEMPTS_KEY   = 'cms_attempts'

// ─── Lockout helpers ─────────────────────────────────────────────────────────
function getLockoutRemaining(): number {
  const lockedAt = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10)
  if (!lockedAt) return 0
  const elapsed = Date.now() - lockedAt
  return elapsed < LOCKOUT_MS ? Math.ceil((LOCKOUT_MS - elapsed) / 1000) : 0
}

function getAttempts(): number {
  return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10)
}

function recordFailedAttempt(): number {
  const attempts = getAttempts() + 1
  localStorage.setItem(ATTEMPTS_KEY, String(attempts))
  if (attempts >= MAX_ATTEMPTS) {
    localStorage.setItem(LOCKOUT_KEY, String(Date.now()))
  }
  return attempts
}

function clearAttempts() {
  localStorage.removeItem(LOCKOUT_KEY)
  localStorage.removeItem(ATTEMPTS_KEY)
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Main LoginPage ───────────────────────────────────────────────────────────
type View = 'login' | 'forgot' | 'reset-sent'

export function LoginPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lockoutSecs, setLockoutSecs] = useState(getLockoutRemaining())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // If already logged in → go straight to dashboard
  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  // Clear any stale lockout on mount (in case of dev restart)
  useEffect(() => {
    // If ALLOWED_EMAIL env is set and lockout is stale, auto-clear
    if (!ALLOWED_EMAIL) {
      clearAttempts() // Dev mode: no env = no lockout
    }
  }, [])

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSecs > 0) {
      timerRef.current = setInterval(() => {
        const remaining = getLockoutRemaining()
        setLockoutSecs(remaining)
        if (remaining <= 0) {
          clearAttempts()
          if (timerRef.current) clearInterval(timerRef.current)
        }
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [lockoutSecs])

  const resetError = () => setError('')

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Lockout check
    const remaining = getLockoutRemaining()
    if (remaining > 0) {
      setLockoutSecs(remaining)
      setError(`Too many failed attempts. Try again in ${formatTime(remaining)}.`)
      return
    }

    // Whitelist check — give GENERIC error (don't reveal which field is wrong)
    const inputEmail = email.toLowerCase().trim()
    if (!inputEmail || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email: inputEmail, password })
    setLoading(false)

    if (authError) {
      // Record failed attempt regardless of reason
      const attempts = recordFailedAttempt()
      const lockRemaining = getLockoutRemaining()

      if (lockRemaining > 0) {
        setLockoutSecs(lockRemaining)
        setError(`Too many failed attempts. Account locked for ${formatTime(lockRemaining)}.`)
      } else {
        const left = MAX_ATTEMPTS - attempts
        setError(`Invalid credentials.${left > 0 ? ` ${left} attempt${left !== 1 ? 's' : ''} remaining.` : ''}`)
      }
      return
    }

    clearAttempts()
    toast.success('Welcome back! 👋')
    navigate('/', { replace: true })
  }

  // ── Forgot Password ──────────────────────────────────────────────────────
  const handleForgot = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const inputEmail = email.toLowerCase().trim()

    // Strict whitelist — error if not the allowed email
    if (inputEmail !== ALLOWED_EMAIL) {
      setError('This email is not authorized to reset the password.')
      return
    }

    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(inputEmail, {
      redirectTo: `${CMS_URL}/reset-password`,   // Always points to CMS
    })
    setLoading(false)

    if (resetError) {
      setError('Failed to send reset email. Please try again.')
      return
    }

    setView('reset-sent')
  }

  const attemptsLeft = MAX_ATTEMPTS - getAttempts()
  const isLockedOut = lockoutSecs > 0

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(220 18% 7%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(0,80%,55%,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-5%', right: '-5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(25,95%,53%,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 420,
        background: 'hsl(220 18% 10%)',
        border: '1px solid hsl(220 15% 18%)',
        borderRadius: '1.25rem',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        position: 'relative', zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '1rem', margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, hsl(0,80%,55%), hsl(25,95%,53%))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px hsla(0,80%,55%,0.35)',
          }}>
            {view === 'login' ? <Lock size={24} color="white" /> : <ShieldCheck size={24} color="white" />}
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'hsl(0 0% 98%)', marginBottom: 4 }}>
            {view === 'login' ? 'CMS Login' : view === 'forgot' ? 'Reset Password' : 'Check Your Email'}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'hsl(220 15% 55%)', lineHeight: 1.5 }}>
            {view === 'login'
              ? 'Secure access — authorized personnel only'
              : view === 'forgot'
              ? 'Enter the registered email address'
              : 'Password reset link has been sent'}
          </p>
        </div>

        {/* ── LOCKOUT BANNER ── */}
        {isLockedOut && (
          <div style={{
            background: 'hsla(0,80%,55%,0.08)', border: '1px solid hsla(0,80%,55%,0.25)',
            borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AlertCircle size={16} color="hsl(0,80%,65%)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(0,80%,65%)' }}>Account Temporarily Locked</div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(220 15% 55%)', marginTop: 2 }}>
                Try again in <span style={{ color: 'hsl(0,80%,65%)', fontWeight: 700, fontFamily: 'monospace' }}>{formatTime(lockoutSecs)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── RESET SENT VIEW ── */}
        {view === 'reset-sent' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'hsla(142,76%,36%,0.1)',
              border: '1px solid hsla(142,76%,36%,0.25)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <CheckCircle size={26} color="hsl(142,76%,46%)" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'hsl(220 15% 65%)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              A password reset link has been sent to<br />
              <span style={{ color: 'hsl(0 0% 98%)', fontWeight: 600 }}>{email}</span>.<br />
              Check your inbox and follow the instructions.
            </p>
            <button
              onClick={() => { setView('login'); setEmail(''); setError('') }}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: 'none',
                background: 'hsl(220 18% 15%)', color: 'hsl(0 0% 85%)',
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <ArrowLeft size={15} /> Back to Login
            </button>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {view === 'login' && (
          <form onSubmit={handleLogin} autoComplete="on" noValidate>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'hsl(220 15% 60%)', marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'hsl(220 15% 45%)' }} />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); resetError() }}
                  disabled={isLockedOut || loading}
                  placeholder="your@email.com"
                  required
                  style={{
                    width: '100%', padding: '0.75rem 0.875rem 0.75rem 2.5rem',
                    background: 'hsl(220 18% 13%)', border: `1px solid ${error ? 'hsla(0,80%,55%,0.5)' : 'hsl(220 15% 20%)'}`,
                    borderRadius: '0.75rem', color: 'hsl(0 0% 95%)', fontSize: '0.875rem',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                    opacity: isLockedOut ? 0.5 : 1,
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'hsl(220 15% 60%)', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'hsl(220 15% 45%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); resetError() }}
                  disabled={isLockedOut || loading}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '0.75rem 2.75rem 0.75rem 2.5rem',
                    background: 'hsl(220 18% 13%)', border: `1px solid ${error ? 'hsla(0,80%,55%,0.5)' : 'hsl(220 15% 20%)'}`,
                    borderRadius: '0.75rem', color: 'hsl(0 0% 95%)', fontSize: '0.875rem',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                    opacity: isLockedOut ? 0.5 : 1,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220 15% 45%)', padding: 2 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Forgot link */}
            <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => { setView('forgot'); setError(''); setPassword('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'hsl(0,80%,60%)', fontWeight: 600, padding: 0 }}
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'hsla(0,80%,55%,0.08)', border: '1px solid hsla(0,80%,55%,0.25)',
                borderRadius: '0.65rem', padding: '0.65rem 0.875rem', marginBottom: '1rem',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <AlertCircle size={14} color="hsl(0,80%,65%)" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'hsl(0,80%,65%)', lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            {/* Attempts warning */}
            {!isLockedOut && getAttempts() > 0 && getAttempts() < MAX_ATTEMPTS && !error && (
              <div style={{ fontSize: '0.75rem', color: 'hsl(35,90%,55%)', marginBottom: '0.875rem', textAlign: 'center' }}>
                ⚠ {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before lockout
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isLockedOut}
              style={{
                width: '100%', padding: '0.875rem',
                background: loading || isLockedOut ? 'hsl(220 15% 20%)' : 'linear-gradient(135deg, hsl(0,80%,55%), hsl(25,95%,53%))',
                border: 'none', borderRadius: '0.75rem', color: 'white',
                fontSize: '0.9rem', fontWeight: 700, cursor: loading || isLockedOut ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s', boxShadow: loading || isLockedOut ? 'none' : '0 4px 16px hsla(0,80%,55%,0.3)',
              }}
            >
              {loading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</> : isLockedOut ? `Locked — ${formatTime(lockoutSecs)}` : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD FORM ── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} noValidate>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'hsl(220 15% 60%)', marginBottom: 6 }}>
                Registered Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'hsl(220 15% 45%)' }} />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); resetError() }}
                  disabled={loading}
                  placeholder="your@email.com"
                  required
                  style={{
                    width: '100%', padding: '0.75rem 0.875rem 0.75rem 2.5rem',
                    background: 'hsl(220 18% 13%)', border: `1px solid ${error ? 'hsla(0,80%,55%,0.5)' : 'hsl(220 15% 20%)'}`,
                    borderRadius: '0.75rem', color: 'hsl(0 0% 95%)', fontSize: '0.875rem',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'hsla(0,80%,55%,0.08)', border: '1px solid hsla(0,80%,55%,0.25)',
                borderRadius: '0.65rem', padding: '0.65rem 0.875rem', marginBottom: '1rem',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <AlertCircle size={14} color="hsl(0,80%,65%)" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'hsl(0,80%,65%)', lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.875rem', marginBottom: '0.75rem',
                background: loading ? 'hsl(220 15% 20%)' : 'linear-gradient(135deg, hsl(0,80%,55%), hsl(25,95%,53%))',
                border: 'none', borderRadius: '0.75rem', color: 'white',
                fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 16px hsla(0,80%,55%,0.3)',
              }}
            >
              {loading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</> : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => { setView('login'); setError('') }}
              style={{
                width: '100%', padding: '0.7rem', border: 'none', background: 'none',
                color: 'hsl(220 15% 55%)', fontSize: '0.825rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 500,
              }}
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
          </form>
        )}

        {/* Security badge */}
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid hsl(220 15% 15%)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: 'hsl(220 15% 38%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ShieldCheck size={11} />
            Secured with Supabase Auth · Authorized access only
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: hsl(0,80%,55%) !important; box-shadow: 0 0 0 3px hsla(0,80%,55%,0.1); }
      `}</style>
    </div>
  )
}

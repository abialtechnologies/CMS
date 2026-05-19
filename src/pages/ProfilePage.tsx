import { useState, useEffect, FormEvent } from 'react'
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, Save, AlertCircle, CheckCircle, Camera, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const ALLOWED_EMAIL = (import.meta.env.VITE_ALLOWED_EMAIL || '').toLowerCase().trim()

function Section({ icon: Icon, title, sub, children }: { icon: any; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem', paddingBottom: '0.875rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '0.625rem', background: 'linear-gradient(135deg,hsla(0,80%,55%,0.15),hsla(25,95%,53%,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color="var(--accent)" />
        </div>
        <div>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{sub}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'hsl(220 15% 60%)', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(220 15% 45%)' }} />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '••••••••'}
        disabled={disabled}
        className="input"
        style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
      />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220 15% 45%)', padding: 2 }}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

// ── Avatar section ────────────────────────────────────────────────────────────
function AvatarSection({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase()
  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, hsl(0,80%,55%), hsl(25,95%,53%))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 800, color: 'white',
          boxShadow: '0 4px 20px hsla(0,80%,55%,0.35)',
        }}>{initials}</div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Camera size={11} color="var(--text-muted)" />
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{email.split('@')[0]}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{email}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, padding: '2px 8px', borderRadius: 99, background: 'hsla(142,76%,36%,0.12)', border: '1px solid hsla(142,76%,36%,0.25)' }}>
          <ShieldCheck size={11} color="#22c55e" />
          <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 600 }}>Admin · Verified</span>
        </div>
      </div>
    </div>
  )
}

// ── Email Change ──────────────────────────────────────────────────────────────
function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newEmail.toLowerCase().trim()
    if (!trimmed) { toast.error('Enter new email'); return }
    if (trimmed === currentEmail) { toast.error('Same as current email'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ email: trimmed })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setSent(true)
    toast.success('Confirmation email sent to new address!')
  }

  return (
    <Section icon={Mail} title="Email Address" sub="Update your login email">
      {sent ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.875rem', background: 'hsla(142,76%,36%,0.08)', border: '1px solid hsla(142,76%,36%,0.2)', borderRadius: '0.75rem' }}>
          <CheckCircle size={16} color="#22c55e" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#22c55e' }}>Confirmation sent!</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>Check <strong>{newEmail}</strong> to confirm the email change.</div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Field label="Current Email">
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(220 15% 45%)' }} />
              <input className="input" value={currentEmail} disabled style={{ paddingLeft: '2.25rem', width: '100%', boxSizing: 'border-box', opacity: 0.6 }} />
            </div>
          </Field>
          <Field label="New Email" hint="A confirmation link will be sent to the new email.">
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(220 15% 45%)' }} />
              <input type="email" className="input" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="new@email.com" style={{ paddingLeft: '2.25rem', width: '100%', boxSizing: 'border-box' }} />
            </div>
          </Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0.875rem', background: 'hsla(0,80%,55%,0.06)', border: '1px solid hsla(0,80%,55%,0.15)', borderRadius: '0.625rem', marginBottom: '1rem' }}>
            <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.72rem', color: 'hsl(220 15% 55%)' }}>
              Note: After email change, <code style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>VITE_ALLOWED_EMAIL</code> in <code style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>.env</code> must also be updated.
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ gap: 6 }}>
              {loading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</> : <><Save size={14} /> Update Email</>}
            </button>
          </div>
        </form>
      )}
    </Section>
  )
}

// ── Password Change ───────────────────────────────────────────────────────────
function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = (p: string) => {
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^a-zA-Z0-9]/.test(p)) s++
    return s
  }
  const str = strength(newPass)
  const strLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][str]
  const strColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][str]

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!current) { toast.error('Enter current password'); return }
    if (newPass.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (newPass !== confirm) { toast.error('Passwords do not match'); return }

    setLoading(true)
    // Re-authenticate first
    const { data: { user } } = await supabase.auth.getUser()
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: current })
    if (reAuthErr) { toast.error('Current password is incorrect'); setLoading(false); return }

    const { error } = await supabase.auth.updateUser({ password: newPass })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password updated successfully! 🔒')
    setCurrent(''); setNewPass(''); setConfirm('')
  }

  return (
    <Section icon={Lock} title="Change Password" sub="Use a strong, unique password">
      <form onSubmit={handleSubmit}>
        <Field label="Current Password">
          <PasswordInput value={current} onChange={setCurrent} placeholder="Enter current password" />
        </Field>
        <Field label="New Password">
          <PasswordInput value={newPass} onChange={setNewPass} placeholder="Min. 8 characters" />
          {newPass && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= str ? strColor : 'var(--bg-secondary)', transition: 'background 0.3s' }} />
                ))}
              </div>
              <span style={{ fontSize: '0.7rem', color: strColor, fontWeight: 600 }}>{strLabel}</span>
            </div>
          )}
        </Field>
        <Field label="Confirm New Password">
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Repeat new password" />
          {confirm && newPass !== confirm && (
            <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={11} /> Passwords do not match
            </p>
          )}
          {confirm && newPass === confirm && (
            <p style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={11} /> Passwords match
            </p>
          )}
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ gap: 6 }}>
            {loading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</> : <><ShieldCheck size={14} /> Update Password</>}
          </button>
        </div>
      </form>
    </Section>
  )
}

// ── Security Info ─────────────────────────────────────────────────────────────
function SecuritySection({ user }: { user: any }) {
  return (
    <Section icon={ShieldCheck} title="Security Info" sub="Account access details">
      <div style={{ display: 'grid', gap: 10 }}>
        {[
          { label: 'User ID',         value: user?.id?.slice(0, 18) + '…' },
          { label: 'Last Sign In',    value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—' },
          { label: 'Account Created', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : '—' },
          { label: 'Auth Provider',   value: 'Email / Password' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', background: 'var(--bg-tertiary)', borderRadius: '0.625rem', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.label}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: r.label === 'User ID' ? 'monospace' : 'inherit' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
export function ProfilePage() {
  const { user } = useAuth()
  const email = user?.email || ''

  return (
    <div className="animate-fade-in" style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>Profile Settings</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage your account credentials and security.</p>
      </div>

      <AvatarSection email={email} />
      <EmailSection currentEmail={email} />
      <PasswordSection />
      <SecuritySection user={user} />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

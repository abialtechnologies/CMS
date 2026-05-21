import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { PenTool, FileText, Plus, Settings, BarChart3, Menu, X, LogOut, LayoutDashboard, Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'All Posts', path: '/posts' },
  { icon: Plus, label: 'New Post', path: '/new' },
  { icon: ImageIcon, label: 'Media Library', path: '/media' },
]

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
]

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="cms-layout">
      {/* Mobile Overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`cms-sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, hsl(0,80%,55%), hsl(25,95%,53%))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(239,68,68,0.3)'
            }}>
              <PenTool size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Blog CMS</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 600, marginTop: -2 }}>Abial Technologies</div>
            </div>
          </Link>
          <button className="btn-ghost" onClick={() => setMobileOpen(false)} style={{ display: 'none', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.75rem', marginBottom: '0.5rem' }}>
              Content
            </div>
            {navItems.map(item => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 0.875rem', borderRadius: '0.625rem',
                    textDecoration: 'none', marginBottom: '0.25rem',
                    transition: 'all 0.2s',
                    background: isActive ? 'linear-gradient(90deg, hsla(0,80%,55%,0.12), hsla(25,95%,53%,0.06))' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  <item.icon size={18} />
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.75rem', marginBottom: '0.5rem' }}>
              Analytics
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0.875rem', borderRadius: '0.625rem',
              color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500,
              opacity: 0.5, cursor: 'not-allowed',
            }}>
              <BarChart3 size={18} />
              <span>SEO Reports</span>
              <span className="badge badge-blue" style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>Soon</span>
            </div>
            {bottomItems.map(item => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 0.875rem', borderRadius: '0.625rem',
                    textDecoration: 'none', marginBottom: '0.25rem',
                    transition: 'all 0.2s',
                    background: isActive ? 'linear-gradient(90deg, hsla(0,80%,55%,0.12), hsla(25,95%,53%,0.06))' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  <item.icon size={18} />
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer — Profile Card */}
        <div style={{ padding: '0.875rem', borderTop: '1px solid var(--border)' }}>
          {user && (
            <Link
              to="/profile"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '0.625rem 0.75rem', borderRadius: '0.75rem', marginBottom: '0.5rem',
                textDecoration: 'none', border: '1px solid var(--border)',
                background: 'var(--bg-tertiary)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'var(--border)' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, hsl(0,80%,55%), hsl(25,95%,53%))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800, color: 'white',
              }}>
                {user.email?.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email?.split('@')[0]}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </Link>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '0.55rem 0.875rem', borderRadius: '0.625rem', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'hsla(0,80%,55%,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(0,80%,65%)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsla(0,80%,55%,0.3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
          >
            <LogOut size={14} /> Sign Out
          </button>
          <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem', opacity: 0.6 }}>© 2026 Abial Technologies</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg-hidden" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 35,
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1rem', display: 'none', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button className="btn-ghost" onClick={() => setMobileOpen(true)} style={{ padding: 6 }}><Menu size={20} /></button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Blog CMS</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Main Content */}
      <main className="cms-main">
        <div className="cms-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

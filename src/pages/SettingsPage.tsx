import { useState, useEffect } from 'react'
import { Settings, Tag, Globe, Trash2, Plus, Save, Edit2, X, Check, AlertCircle, Link2, Unlink, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { startOAuthFlow, isConnected, clearTokens, getConfig, saveConfig } from '../lib/googleAuth'
import toast from 'react-hot-toast'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
}

function generateSlug(str: string) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

// ─── Section wrapper ───────────────────────────────────────────────────
function Section({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem', paddingBottom: '0.875rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 34, height: 34, borderRadius: '0.5rem', background: 'linear-gradient(135deg, hsla(0,80%,55%,0.15), hsla(25,95%,53%,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color="var(--accent)" />
        </div>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── Categories Section ────────────────────────────────────────────────
function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCategories() }, [])

  const fetchCategories = async () => {
    setLoading(true)
    const { data } = await supabase.from('blog_categories').select('*').order('name')
    setCategories(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const slug = newSlug || generateSlug(newName)
    const { error } = await supabase.from('blog_categories').insert({ name: newName.trim(), slug, description: newDesc.trim() || null })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Category added!')
    setNewName(''); setNewSlug(''); setNewDesc(''); setAdding(false)
    fetchCategories()
    setSaving(false)
  }

  const handleEdit = async (id: string) => {
    if (!editName.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const { error } = await supabase.from('blog_categories').update({ name: editName.trim(), slug: editSlug, description: editDesc.trim() || null }).eq('id', id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Category updated!')
    setEditId(null)
    fetchCategories()
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Posts in this category will be uncategorized.`)) return
    const { error } = await supabase.from('blog_categories').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Category deleted')
    fetchCategories()
  }

  const startEdit = (cat: Category) => {
    setEditId(cat.id); setEditName(cat.name); setEditSlug(cat.slug); setEditDesc(cat.description || '')
  }

  return (
    <Section icon={Tag} title="Categories">
      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary" style={{ gap: 6, fontSize: '0.8rem', padding: '0.45rem 0.875rem' }} onClick={() => setAdding(a => !a)}>
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* Add Form */}
      {adding && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--accent)', borderRadius: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name *</label>
              <input className="input" value={newName} onChange={e => { setNewName(e.target.value); if (!newSlug) setNewSlug(generateSlug(e.target.value)) }} placeholder="Category name" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Slug</label>
              <input className="input" value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="auto-generated" />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Description</label>
            <input className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Short description (optional)" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => { setAdding(false); setNewName(''); setNewSlug(''); setNewDesc('') }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}><X size={14} /> Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}><Check size={14} /> Save</button>
          </div>
        </div>
      )}

      {/* Category list */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>Loading...</div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>No categories yet. Add your first one!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ background: 'var(--bg-tertiary)', borderRadius: 10, border: '1px solid var(--border)', padding: '0.75rem 1rem' }}>
              {editId === cat.id ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <input className="input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }} />
                    <input className="input" value={editSlug} onChange={e => setEditSlug(e.target.value)} placeholder="Slug" style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }} />
                  </div>
                  <input className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem', marginBottom: 8, width: '100%' }} />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setEditId(null)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}><X size={12} /></button>
                    <button className="btn btn-primary" onClick={() => handleEdit(cat.id)} disabled={saving} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}><Check size={12} /> Save</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{cat.name}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      /{cat.slug} {cat.description && `· ${cat.description}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" onClick={() => startEdit(cat)} style={{ padding: '0.35rem 0.6rem' }} title="Edit"><Edit2 size={13} /></button>
                    <button className="btn btn-ghost" onClick={() => handleDelete(cat.id, cat.name)} style={{ padding: '0.35rem 0.6rem', color: 'var(--red)' }} title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ─── General Settings Section ──────────────────────────────────────────
function GeneralSection() {
  const [blogName, setBlogName] = useState('Abial Blog')
  const [blogUrl, setBlogUrl] = useState('https://abial.ai/blog')
  const [blogDesc, setBlogDesc] = useState('Expert insights on digital marketing, AI, and business growth.')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // Save to localStorage for now (no DB table for settings yet)
    localStorage.setItem('cms_blog_name', blogName)
    localStorage.setItem('cms_blog_url', blogUrl)
    localStorage.setItem('cms_blog_desc', blogDesc)
    await new Promise(r => setTimeout(r, 500))
    toast.success('Settings saved!')
    setSaving(false)
  }

  useEffect(() => {
    setBlogName(localStorage.getItem('cms_blog_name') || 'Abial Blog')
    setBlogUrl(localStorage.getItem('cms_blog_url') || 'https://abial.ai/blog')
    setBlogDesc(localStorage.getItem('cms_blog_desc') || 'Expert insights on digital marketing, AI, and business growth.')
  }, [])

  return (
    <Section icon={Globe} title="General Settings">
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Blog Name</label>
          <input className="input" value={blogName} onChange={e => setBlogName(e.target.value)} placeholder="My Blog" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Blog URL</label>
          <input className="input" value={blogUrl} onChange={e => setBlogUrl(e.target.value)} placeholder="https://yourdomain.com/blog" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Blog Description</label>
          <textarea className="input" value={blogDesc} onChange={e => setBlogDesc(e.target.value)} placeholder="Short description of your blog" rows={3} style={{ resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 6 }}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </Section>
  )
}

// ─── SEO Defaults Section ──────────────────────────────────────────────
function SeoDefaultsSection() {
  const [titleTemplate, setTitleTemplate] = useState('%s | Abial Blog')
  const [defaultDesc, setDefaultDesc] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitleTemplate(localStorage.getItem('cms_title_template') || '%s | Abial Blog')
    setDefaultDesc(localStorage.getItem('cms_default_desc') || '')
  }, [])

  const handleSave = async () => {
    setSaving(true)
    localStorage.setItem('cms_title_template', titleTemplate)
    localStorage.setItem('cms_default_desc', defaultDesc)
    await new Promise(r => setTimeout(r, 500))
    toast.success('SEO defaults saved!')
    setSaving(false)
  }

  return (
    <Section icon={Settings} title="SEO Defaults">
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            Title Template
            <span style={{ fontWeight: 400, marginLeft: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Use %s for post title</span>
          </label>
          <input className="input" value={titleTemplate} onChange={e => setTitleTemplate(e.target.value)} placeholder="%s | My Blog" />
          <div style={{ marginTop: 6, fontSize: '0.73rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '0.4rem 0.6rem', borderRadius: 6 }}>
            Preview: <span style={{ color: 'var(--accent)' }}>{titleTemplate.replace('%s', 'How to Master SEO in 2026')}</span>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Default Meta Description</label>
          <textarea className="input" value={defaultDesc} onChange={e => setDefaultDesc(e.target.value)} placeholder="Used when a post has no meta description set..." rows={3} style={{ resize: 'vertical' }} />
          <div style={{ fontSize: '0.72rem', color: defaultDesc.length > 160 ? 'var(--red)' : 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            {defaultDesc.length > 160 && <AlertCircle size={11} />}
            {defaultDesc.length}/160 characters recommended
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 6 }}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Defaults'}
          </button>
        </div>
      </div>
    </Section>
  )
}

// ─── Integrations Section ─────────────────────────────────────────────
function IntegrationsSection() {
  const [clientId, setClientId] = useState(getConfig('client_id'))
  const [clientSecret, setClientSecret] = useState(getConfig('client_secret'))
  const [siteUrl, setSiteUrl] = useState(getConfig('gsc_site_url'))
  const [ga4PropId, setGa4PropId] = useState(getConfig('ga4_property_id'))
  const [gscOk, setGscOk] = useState(isConnected('gsc'))
  const [ga4Ok, setGa4Ok] = useState(isConnected('ga4'))
  const [saving, setSaving] = useState(false)

  const handleSaveCredentials = () => {
    if (!clientId.trim() || !clientSecret.trim()) { toast.error('Client ID & Secret required'); return }
    saveConfig('client_id', clientId.trim())
    saveConfig('client_secret', clientSecret.trim())
    saveConfig('gsc_site_url', siteUrl.trim())
    saveConfig('ga4_property_id', ga4PropId.trim())
    toast.success('Credentials saved!')
  }

  const connectGsc = async () => {
    if (!getConfig('client_id')) { toast.error('Save Google credentials first'); return }
    if (!siteUrl.trim()) { toast.error('Enter your GSC site URL first'); return }
    saveConfig('gsc_site_url', siteUrl.trim())
    try { await startOAuthFlow('gsc') } catch (e: any) { toast.error(e.message) }
  }

  const connectGa4 = async () => {
    if (!getConfig('client_id')) { toast.error('Save Google credentials first'); return }
    if (!ga4PropId.trim()) { toast.error('Enter GA4 Property ID first'); return }
    saveConfig('ga4_property_id', ga4PropId.trim())
    try { await startOAuthFlow('ga4') } catch (e: any) { toast.error(e.message) }
  }

  const disconnect = (service: 'gsc' | 'ga4') => {
    clearTokens(service)
    if (service === 'gsc') setGscOk(false)
    else setGa4Ok(false)
    toast.success(`${service === 'gsc' ? 'Search Console' : 'Analytics'} disconnected`)
  }

  return (
    <Section icon={Link2} title="Integrations">

      {/* Step 1 — Google Credentials */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
          Google Cloud Credentials
        </div>
        <div style={{ background: 'hsla(220,15%,14%,0.8)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', marginBottom: 10 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.875rem', lineHeight: 1.6 }}>
            Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Google Cloud Console <ExternalLink size={10} style={{ verticalAlign: 'middle' }}/></a> → Create OAuth 2.0 Client ID → Web Application → Add <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>{window.location.origin}/oauth-callback</code> as redirect URI.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client ID</label>
              <input className="input" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxxx.apps.googleusercontent.com" style={{ fontSize: '0.78rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client Secret</label>
              <input className="input" type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="GOCSPX-xxxx" style={{ fontSize: '0.78rem' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSaveCredentials} style={{ fontSize: '0.78rem', padding: '0.4rem 0.875rem', gap: 5 }}>
              <Save size={12} /> Save Credentials
            </button>
          </div>
        </div>
      </div>

      {/* Step 2 — GSC */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
          Google Search Console
          {gscOk && <span style={{ marginLeft: 4, fontSize: '0.68rem', color: '#22c55e', fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: 'hsla(142,76%,36%,0.12)', border: '1px solid hsla(142,76%,36%,0.2)' }}>● Connected</span>}
        </div>
        <div style={{ background: 'hsla(220,15%,14%,0.8)', border: `1px solid ${gscOk ? 'hsla(142,76%,36%,0.3)' : 'var(--border)'}`, borderRadius: 10, padding: '1rem' }}>
          {!gscOk ? (
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.875rem', lineHeight: 1.6 }}>
                Connect to see real <strong style={{ color: 'var(--text-secondary)' }}>impressions, clicks, CTR & top queries</strong> from Search Console.
              </p>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Site URL (as it appears in GSC)</label>
                <input className="input" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://abial.ai/" style={{ fontSize: '0.78rem' }} />
              </div>
              <button className="btn btn-primary" onClick={connectGsc} style={{ gap: 6, fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}>
                🔍 Connect with Google Search Console
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#22c55e' }}>✓ Search Console Connected</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{siteUrl || getConfig('gsc_site_url')}</div>
              </div>
              <button onClick={() => disconnect('gsc')} className="btn btn-ghost" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', gap: 5 }}>
                <Unlink size={12} /> Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Step 3 — GA4 */}
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
          Google Analytics 4
          {ga4Ok && <span style={{ marginLeft: 4, fontSize: '0.68rem', color: '#22c55e', fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: 'hsla(142,76%,36%,0.12)', border: '1px solid hsla(142,76%,36%,0.2)' }}>● Connected</span>}
        </div>
        <div style={{ background: 'hsla(220,15%,14%,0.8)', border: `1px solid ${ga4Ok ? 'hsla(142,76%,36%,0.3)' : 'var(--border)'}`, borderRadius: 10, padding: '1rem' }}>
          {!ga4Ok ? (
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.875rem', lineHeight: 1.6 }}>
                Connect to see real <strong style={{ color: 'var(--text-secondary)' }}>visitors, sessions & device data</strong> from GA4.
              </p>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>GA4 Property ID <span style={{ opacity: 0.6 }}>(e.g. 123456789)</span></label>
                <input className="input" value={ga4PropId} onChange={e => setGa4PropId(e.target.value)} placeholder="123456789" style={{ fontSize: '0.78rem' }} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Find it in GA4 → Admin → Property Settings → Property ID</p>
              </div>
              <button className="btn btn-primary" onClick={connectGa4} style={{ gap: 6, fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}>
                📊 Connect with Google Analytics 4
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#22c55e' }}>✓ Analytics 4 Connected</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Property ID: {ga4PropId || getConfig('ga4_property_id')}</div>
              </div>
              <button onClick={() => disconnect('ga4')} className="btn btn-ghost" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', gap: 5 }}>
                <Unlink size={12} /> Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

// ─── Connection Info Section ────────────────────────────────────
function ConnectionSection() {
  const url = import.meta.env.VITE_SUPABASE_URL || '—'
  return (
    <Section icon={Settings} title="Database Connection">
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '1rem', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supabase Project URL</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{url}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</span>
          <span style={{ fontSize: '0.8rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Connected
          </span>
        </div>
      </div>
    </Section>
  )
}

// ─── Main Settings Page ────────────────────────────────────────────────
export function SettingsPage() {
  const [tab, setTab] = useState<'general' | 'categories' | 'seo' | 'integrations' | 'connection'>('general')

  const tabs = [
    { id: 'general',      label: 'General' },
    { id: 'categories',   label: 'Categories' },
    { id: 'seo',          label: 'SEO Defaults' },
    { id: 'integrations', label: '🔗 Integrations' },
    { id: 'connection',   label: 'Connection' },
  ] as const

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage your blog configuration, categories, and SEO defaults.</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: 4, borderRadius: 12, border: '1px solid var(--border)', width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '0.45rem 1rem', borderRadius: 8, fontSize: '0.825rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              transition: 'all 0.2s',
              background: tab === t.id ? 'linear-gradient(135deg, hsl(0,80%,55%), hsl(25,95%,53%))' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--text-muted)',
              boxShadow: tab === t.id ? '0 2px 8px rgba(239,68,68,0.25)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'general'      && <GeneralSection />}
      {tab === 'categories'   && <CategoriesSection />}
      {tab === 'seo'          && <SeoDefaultsSection />}
      {tab === 'integrations' && <IntegrationsSection />}
      {tab === 'connection'   && <ConnectionSection />}
    </div>
  )
}

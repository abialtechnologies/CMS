import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isConnected, getConfig, inspectUrl, requestIndexing } from '../lib/googleAuth'
import { countWords, readingTime, formatDate, extractFirstImage } from '../lib/utils'
import {
  FileText, Plus, Search, Eye, Edit3, Trash2, Calendar, Tag,
  Clock, ChevronDown, BarChart3, Loader2, CheckCircle2, Zap, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Post {
  id: string
  title: string
  slug: string
  status: string
  featured_image: string | null
  focus_keyword: string | null
  seo_score: number | null
  content: string
  created_at: string
  published_at: string | null
  blog_categories: { id: string; name: string } | null
}

const statusBadge: Record<string, string> = {
  published: 'badge-green',
  draft: 'badge-yellow',
  scheduled: 'badge-blue',
}

function scoreColor(s: number) {
  if (s >= 71) return 'var(--green)'
  if (s >= 41) return 'var(--yellow)'
  return 'var(--red)'
}

function scoreBg(s: number) {
  if (s >= 71) return 'hsla(152,70%,48%,0.1)'
  if (s >= 41) return 'hsla(45,95%,55%,0.1)'
  return 'hsla(0,74%,52%,0.1)'
}

export function BlogListPage() {
  const nav = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [dbReady, setDbReady] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    try {
      // Use select('*') to avoid column-not-found errors
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Query error:', error)
        setDbReady(false)
        setLoading(false)
        return
      }

      // Map data safely — fill missing fields with defaults
      const safePosts: Post[] = (data || []).map((p: Record<string, unknown>) => ({
        id: (p.id as string) || '',
        title: (p.title as string) || 'Untitled',
        slug: (p.slug as string) || '',
        status: (p.status as string) || 'draft',
        featured_image: (p.featured_image as string) || null,
        focus_keyword: (p.focus_keyword as string) || null,
        seo_score: (p.seo_score as number) || null,
        content: (p.content as string) || '',
        created_at: (p.created_at as string) || new Date().toISOString(),
        published_at: (p.published_at as string) || null,
        blog_categories: null, // skip join, keep it simple
      }))
      setPosts(safePosts)
    } catch (err) {
      console.error('Load error:', err)
      setDbReady(false)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this post?')) return
    setDeleting(id)
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id)
      if (error) toast.error('Delete failed')
      else {
        setPosts(p => p.filter(x => x.id !== id))
        toast.success('Deleted')
      }
    } catch {
      toast.error('Delete failed')
    }
    setDeleting(null)
  }

  const filtered = useMemo(() => {
    return posts.filter(p => {
      const matchSearch = !search ||
        (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.focus_keyword || '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [posts, search, statusFilter])

  const stats = useMemo(() => ({
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    drafts: posts.filter(p => p.status === 'draft').length,
    avgScore: posts.length
      ? Math.round(posts.reduce((s, p) => s + (p.seo_score || 0), 0) / posts.length)
      : 0,
  }), [posts])

  // ─── LOADING STATE ───
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  // ─── DB NOT READY ───
  if (!dbReady) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 600, margin: '4rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '2.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-orange))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <FileText size={28} color="white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Database Setup Required</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 20 }}>
            Blog tables need to be created in Supabase first.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
            Open <strong style={{ color: 'var(--text-primary)' }}>Supabase → SQL Editor</strong> and run:
          </p>
          <code style={{
            display: 'block', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)',
            borderRadius: 8, fontSize: '0.8rem', color: 'var(--green)',
            border: '1px solid var(--border)', marginBottom: 24, wordBreak: 'break-all',
          }}>
            blog-cms/create_blog_tables.sql
          </code>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  // ─── MAIN LIST ───
  return (
    <div className="animate-fade-in">
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileText size={28} color="var(--accent)" /> Blog Posts
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Create and manage articles with SEO scoring
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => nav('/new')}>
          <Plus size={16} /> New Post
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total" value={stats.total} icon={<FileText size={20} color="var(--border-light)" />} color="var(--text-primary)" />
        <StatCard label="Published" value={stats.published} icon={<Eye size={20} color="var(--border-light)" />} color="var(--green)" />
        <StatCard label="Drafts" value={stats.drafts} icon={<Edit3 size={20} color="var(--border-light)" />} color="var(--yellow)" />
        <StatCard label="Avg SEO" value={`${stats.avgScore}/100`} icon={<BarChart3 size={20} color="var(--border-light)" />} color={scoreColor(stats.avgScore)} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 400 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="input" placeholder="Search posts..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <select
            className="select" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ paddingRight: 36, minWidth: 140 }}
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <ChevronDown size={16} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Posts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ color: 'var(--text-muted)' }}>
              {search ? 'No posts match your search' : 'No blog posts yet'}
            </p>
            {!search && (
              <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => nav('/new')}>
                Create your first post
              </button>
            )}
          </div>
        ) : (
          filtered.map(post => (
            <PostRow
              key={post.id}
              post={post}
              deleting={deleting}
              onEdit={() => nav(`/edit/${post.id}`)}
              onDelete={() => handleDelete(post.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Sub-components to keep render clean ───

function StatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color: string
}) {
  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>{label}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color, marginTop: 4 }}>{value}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}

function PostRow({ post, deleting, onEdit, onDelete }: {
  post: Post; deleting: string | null; onEdit: () => void; onDelete: () => void
}) {
  const wc = countWords(post.content || '')
  const rt = readingTime(post.content || '')
  const [imgError, setImgError] = useState(false)
  const [indexStatus, setIndexStatus] = useState<'unknown'|'checking'|'indexed'|'not_indexed'|'error'>('unknown')
  const [indexing, setIndexing] = useState(false)

  const imageSrc = !imgError ? (post.featured_image || extractFirstImage(post.content)) : null
  const postUrl = `https://abial.ai/blog/${post.slug}`

  async function checkIndex(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setIndexStatus('checking')
    try {
      const siteUrl = getConfig('gsc_site_url') || 'https://abial.ai/'
      const result = await inspectUrl(postUrl, siteUrl)
      setIndexStatus(result.isIndexed ? 'indexed' : 'not_indexed')
    } catch {
      setIndexStatus('error')
    }
  }

  async function handleRequestIndex(e: React.MouseEvent) {
    e.stopPropagation()
    setIndexing(true)
    try {
      await requestIndexing(postUrl)
      toast.success('Indexing request sent to Google!')
      // Recheck after a short delay
      setTimeout(() => checkIndex(), 3000)
    } catch (err: any) {
      toast.error(err.message || 'Indexing request failed')
    }
    setIndexing(false)
  }

  const indexBadge = () => {
    if (post.status !== 'published') return null
    if (!isConnected('gsc')) return null

    switch (indexStatus) {
      case 'unknown':
        return (
          <button
            onClick={checkIndex}
            style={{ fontSize:'0.6rem', padding:'2px 7px', borderRadius:99, fontWeight:600,
              color:'var(--text-muted)', background:'var(--bg-tertiary)', border:'1px solid var(--border)',
              cursor:'pointer', display:'inline-flex', alignItems:'center', gap:3, transition:'border-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <Search size={8}/> Check Index
          </button>
        )
      case 'checking':
        return (
          <span style={{ fontSize:'0.62rem', padding:'2px 6px', borderRadius:99, fontWeight:600,
            color:'#94A3B8', background:'hsla(220,13%,69%,0.1)', border:'1px solid hsla(220,13%,69%,0.2)',
            display:'inline-flex', alignItems:'center', gap:3 }}>
            <Loader2 size={9} style={{ animation:'spin 1s linear infinite' }}/> Checking
          </span>
        )
      case 'indexed':
        return (
          <span style={{ fontSize:'0.62rem', padding:'2px 6px', borderRadius:99, fontWeight:600,
            color:'#22c55e', background:'hsla(142,76%,36%,0.1)', border:'1px solid hsla(142,76%,36%,0.2)',
            display:'inline-flex', alignItems:'center', gap:3 }}>
            <CheckCircle2 size={9}/> Indexed
          </span>
        )
      case 'not_indexed':
        return (
          <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
            <span style={{ fontSize:'0.62rem', padding:'2px 6px', borderRadius:99, fontWeight:600,
              color:'#f59e0b', background:'hsla(38,92%,50%,0.1)', border:'1px solid hsla(38,92%,50%,0.2)' }}>
              Not Indexed
            </span>
            <button
              onClick={handleRequestIndex}
              disabled={indexing}
              style={{ fontSize:'0.6rem', padding:'2px 7px', borderRadius:99, fontWeight:700,
                color:'white', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', border:'none',
                cursor:'pointer', display:'inline-flex', alignItems:'center', gap:3,
                opacity: indexing ? 0.6 : 1, transition:'opacity 0.2s' }}>
              {indexing
                ? <><Loader2 size={8} style={{ animation:'spin 1s linear infinite' }}/> Sending…</>
                : <><Zap size={8}/> Index Now</>
              }
            </button>
          </span>
        )
      case 'error':
        return (
          <button
            onClick={checkIndex}
            style={{ fontSize:'0.6rem', padding:'2px 7px', borderRadius:99, fontWeight:600,
              color:'#94A3B8', background:'hsla(220,13%,69%,0.08)', border:'1px solid hsla(220,13%,69%,0.15)',
              cursor:'pointer', display:'inline-flex', alignItems:'center', gap:3 }}>
            <RefreshCw size={8}/> Retry Check
          </button>
        )
      default:
        return null
    }
  }

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      onClick={onEdit}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0.875rem 1rem' }}>
        {/* Thumbnail */}
        {imageSrc ? (
          <div style={{ width: 72, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
            <img src={imageSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
          </div>
        ) : (
          <div style={{
            width: 72, height: 50, borderRadius: 8, background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            <FileText size={20} color="var(--text-muted)" />
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {post.title || 'Untitled'}
            </span>
            <span className={`badge ${statusBadge[post.status] || 'badge-yellow'}`}>{post.status}</span>
            {indexBadge()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {post.created_at && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} />{formatDate(post.created_at)}
              </span>
            )}
            {post.blog_categories && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tag size={12} />{post.blog_categories.name}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} />{rt} min
            </span>
            <span>{wc} words</span>
          </div>
        </div>

        {/* SEO Score */}
        <div style={{
          flexShrink: 0, width: 48, height: 48, borderRadius: 12,
          background: scoreBg(post.seo_score || 0),
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: scoreColor(post.seo_score || 0) }}>
            {post.seo_score || 0}
          </span>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: -2 }}>SEO</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost" style={{ padding: 8 }} onClick={onEdit} title="Edit">
            <Edit3 size={16} />
          </button>
          <button
            className="btn btn-ghost" style={{ padding: 8, color: 'var(--red)' }}
            onClick={onDelete} disabled={deleting === post.id} title="Delete"
          >
            {deleting === post.id
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <Trash2 size={16} />
            }
          </button>
        </div>
      </div>
    </div>
  )
}

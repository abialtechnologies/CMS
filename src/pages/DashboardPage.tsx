import { useState, useEffect } from 'react'
import { TrendingUp, Eye, MousePointerClick, Search, FileText, CheckCircle, Clock, Tag, ArrowUpRight, Globe, RefreshCw, Monitor, Smartphone, Tablet, Link2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isConnected, getConfig, fetchGscData, fetchGa4Data } from '../lib/googleAuth'

interface PostStats { total: number; published: number; draft: number; categories: number }
interface TopPost   { id: string; title: string; slug: string; published_at: string; category_name: string | null }
interface GscStats  { impressions: number; clicks: number; ctr: number; position: number }
interface GscRow    { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }
interface Ga4Stats  { users: number; sessions: number; pageViews: number }
interface DeviceSplit { desktop: number; mobile: number; tablet: number }

// ── "Not Connected" empty state ───────────────────────────────────────────────
function NotConnectedState({ service }: { service: 'gsc' | 'ga4' }) {
  const label = service === 'gsc' ? 'Google Search Console' : 'Google Analytics 4'
  const desc  = service === 'gsc'
    ? 'Connect to see real impressions, clicks, CTR and top search queries.'
    : 'Connect to see real visitors, sessions and device breakdown.'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'2.5rem 1rem', gap:12, textAlign:'center' }}>
      <div style={{ width:52, height:52, borderRadius:'50%', background:'hsla(0,80%,55%,0.08)', border:'1px dashed hsla(0,80%,55%,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Link2 size={22} color="hsl(0,80%,55%)" />
      </div>
      <div>
        <div style={{ fontSize:'0.88rem', fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{label} Not Connected</div>
        <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', lineHeight:1.6, maxWidth:320 }}>{desc}</div>
      </div>
      <a href="/settings" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'0.5rem 1.25rem', borderRadius:'0.625rem', background:'linear-gradient(135deg,hsl(0,80%,55%),hsl(25,95%,53%))', color:'white', textDecoration:'none', fontSize:'0.82rem', fontWeight:700, boxShadow:'0 4px 14px hsla(0,80%,55%,0.3)' }}>
        <Link2 size={13} /> Connect → Settings › Integrations
      </a>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string|number; sub?: string; color: string }) {
  return (
    <div className="card" style={{ padding:'1.125rem' }}>
      <div style={{ width:36, height:36, borderRadius:'0.625rem', display:'flex', alignItems:'center', justifyContent:'center', background:`${color}18`, border:`1px solid ${color}28`, marginBottom:10 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:3 }}>{label}</div>
      {sub && <div style={{ fontSize:'0.68rem', color, marginTop:2, fontWeight:600 }}>{sub}</div>}
    </div>
  )
}

// ── Mini SVG Sparkline ────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null
  const max = Math.max(...data), min = Math.min(...data)
  const W = 300, H = 70
  const pts = data.map((v,i) => {
    const x = (i/(data.length-1))*W
    const y = H - ((v-min)/(max-min||1))*(H-10)-5
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width:'100%', height:70 }}>
      <defs>
        <linearGradient id={`sg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#sg${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ label, pct, color, icon: Icon }: { label:string; pct:number; color:string; icon:any }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Icon size={13} color={color}/> <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)' }}>{label}</span>
        </div>
        <span style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-primary)' }}>{pct}%</span>
      </div>
      <div style={{ background:'var(--bg-secondary)', borderRadius:99, height:5 }}>
        <div style={{ width:`${pct}%`, height:5, borderRadius:99, background:`linear-gradient(90deg,${color},${color}88)` }}/>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const [stats, setStats]           = useState<PostStats>({ total:0, published:0, draft:0, categories:0 })
  const [recentPosts, setRecentPosts] = useState<TopPost[]>([])
  const [loading, setLoading]       = useState(true)

  const [gscConnected]   = useState(() => isConnected('gsc'))
  const [ga4Connected]   = useState(() => isConnected('ga4'))
  const [gscStats, setGscStats]   = useState<GscStats|null>(null)
  const [gscQueries, setGscQueries] = useState<GscRow[]>([])
  const [gscChart, setGscChart]   = useState<number[]>([])
  const [gscLoading, setGscLoading] = useState(gscConnected)
  const [gscError, setGscError]   = useState('')

  // GA4 state
  const [ga4Stats, setGa4Stats] = useState<Ga4Stats|null>(null)
  const [ga4Devices, setGa4Devices] = useState<DeviceSplit>({ desktop:0, mobile:0, tablet:0 })
  const [ga4Chart, setGa4Chart] = useState<number[]>([])
  const [ga4Loading, setGa4Loading] = useState(ga4Connected)
  const [ga4Error, setGa4Error] = useState('')

  useEffect(() => { loadContent(); if (gscConnected) loadGsc(); if (ga4Connected) loadGa4() }, [])

  const loadContent = async () => {
    setLoading(true)
    const [{ data: posts }, { data: cats }] = await Promise.all([
      supabase.from('blog_posts').select('id,title,slug,status,published_at,blog_categories(name)'),
      supabase.from('blog_categories').select('id'),
    ])
    const all = posts || []
    setStats({ total:all.length, published:all.filter((p:any)=>p.status==='published').length, draft:all.filter((p:any)=>p.status==='draft').length, categories:(cats||[]).length })
    setRecentPosts(
      all.filter((p:any)=>p.status==='published')
        .sort((a:any,b:any)=>new Date(b.published_at).getTime()-new Date(a.published_at).getTime())
        .slice(0,6)
        .map((p:any)=>({ id:p.id, title:p.title, slug:p.slug, published_at:p.published_at, category_name:p.blog_categories?.name||null }))
    )
    setLoading(false)
  }

  const loadGsc = async () => {
    setGscLoading(true); setGscError('')
    try {
      const { analytics, queries } = await fetchGscData(getConfig('gsc_site_url'))
      const n = analytics.length || 1
      const tot = analytics.reduce((a:any,r:any) => ({ impressions:a.impressions+r.impressions, clicks:a.clicks+r.clicks, ctr:a.ctr+r.ctr, position:a.position+r.position }), { impressions:0, clicks:0, ctr:0, position:0 })
      setGscStats({ impressions:tot.impressions, clicks:tot.clicks, ctr:+(tot.ctr/n*100).toFixed(1), position:+(tot.position/n).toFixed(1) })
      setGscQueries(queries.slice(0,8))
      setGscChart(analytics.slice(-30).map((r:any)=>r.impressions))
    } catch(e:any) { setGscError(e.message||'Failed to load data') }
    setGscLoading(false)
  }

  const loadGa4 = async () => {
    setGa4Loading(true); setGa4Error('')
    try {
      const propId = getConfig('ga4_property_id')
      if (!propId) throw new Error('GA4 Property ID not set')
      const data = await fetchGa4Data(propId)
      const rows = data.rows || []

      // Aggregate totals
      let totalUsers = 0, totalSessions = 0, totalPageViews = 0
      let deviceCounts: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 }
      let dailyUsers: Record<string, number> = {}

      rows.forEach((row: any) => {
        const date = row.dimensionValues?.[0]?.value || ''
        const device = (row.dimensionValues?.[1]?.value || 'desktop').toLowerCase()
        const users = parseInt(row.metricValues?.[0]?.value || '0')
        const sessions = parseInt(row.metricValues?.[1]?.value || '0')
        const views = parseInt(row.metricValues?.[2]?.value || '0')

        totalUsers += users
        totalSessions += sessions
        totalPageViews += views

        if (device in deviceCounts) deviceCounts[device] += sessions
        else deviceCounts['desktop'] += sessions

        dailyUsers[date] = (dailyUsers[date] || 0) + users
      })

      setGa4Stats({ users: totalUsers, sessions: totalSessions, pageViews: totalPageViews })

      const totalDeviceSessions = deviceCounts.desktop + deviceCounts.mobile + deviceCounts.tablet || 1
      setGa4Devices({
        desktop: Math.round((deviceCounts.desktop / totalDeviceSessions) * 100),
        mobile: Math.round((deviceCounts.mobile / totalDeviceSessions) * 100),
        tablet: Math.round((deviceCounts.tablet / totalDeviceSessions) * 100),
      })

      // Sort dates and get last 30 days for chart
      const sortedDates = Object.keys(dailyUsers).sort()
      setGa4Chart(sortedDates.slice(-30).map(d => dailyUsers[d]))
    } catch(e:any) { setGa4Error(e.message||'Failed to load GA4 data') }
    setGa4Loading(false)
  }

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:'1.35rem', fontWeight:800, color:'var(--text-primary)', marginBottom:2 }}>Dashboard</h1>
          <p style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Real-time site performance & SEO data</p>
        </div>
        <button onClick={() => { loadContent(); if(gscConnected) loadGsc(); if(ga4Connected) loadGa4() }} className="btn btn-ghost" style={{ padding:'0.4rem 0.75rem', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:6 }}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* ── Content Stats (always live) ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem', marginBottom:'1.25rem' }}>
        <StatCard icon={FileText}    label="Total Posts"  value={loading?'…':stats.total}      sub="All time"   color="#a855f7"/>
        <StatCard icon={CheckCircle} label="Published"    value={loading?'…':stats.published}   sub="Live posts" color="#22c55e"/>
        <StatCard icon={Clock}       label="Drafts"       value={loading?'…':stats.draft}        sub="In progress" color="#f59e0b"/>
        <StatCard icon={Tag}         label="Categories"   value={loading?'…':stats.categories}  sub="Active"    color="#06b6d4"/>
      </div>

      {/* ── Google Search Console ── */}
      <div className="card" style={{ padding:'1.25rem', marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: gscConnected ? '1rem' : 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Search size={16} color="var(--accent)"/>
            <h2 style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--text-primary)' }}>Google Search Console</h2>
            <span style={{ fontSize:'0.68rem', padding:'1px 7px', borderRadius:99, fontWeight:600,
              color: gscConnected ? '#22c55e' : '#ef4444',
              background: gscConnected ? 'hsla(142,76%,36%,0.12)' : 'hsla(0,80%,55%,0.08)',
              border: `1px solid ${gscConnected ? 'hsla(142,76%,36%,0.2)' : 'hsla(0,80%,55%,0.2)'}`,
            }}>
              {gscConnected ? '● Live Data' : '● Not Connected'}
            </span>
          </div>
          {gscConnected && (
            <button onClick={loadGsc} className="btn btn-ghost" style={{ fontSize:'0.72rem', padding:'0.3rem 0.6rem', display:'flex', alignItems:'center', gap:4 }}>
              <RefreshCw size={11}/> Refresh
            </button>
          )}
        </div>

        {!gscConnected && <NotConnectedState service="gsc"/>}

        {gscConnected && gscLoading && (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.82rem' }}>Fetching Search Console data…</div>
        )}

        {gscConnected && gscError && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0.875rem 1rem', background:'hsla(0,80%,55%,0.06)', borderRadius:8, border:'1px solid hsla(0,80%,55%,0.15)' }}>
            <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:'0.8rem', color:'#ef4444' }}>{gscError} — </span>
            <a href="/settings" style={{ fontSize:'0.8rem', color:'var(--accent)', textDecoration:'none' }}>Re-connect in Settings</a>
          </div>
        )}

        {gscConnected && !gscLoading && !gscError && gscStats && (
          <>
            {/* KPI cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'0.875rem', marginBottom:'1.25rem' }}>
              <StatCard icon={Eye}              label="Impressions" value={gscStats.impressions.toLocaleString()} sub="Last 90 days" color="#ef4444"/>
              <StatCard icon={MousePointerClick} label="Clicks"      value={gscStats.clicks.toLocaleString()}      sub="Organic"    color="#f97316"/>
              <StatCard icon={TrendingUp}        label="Avg. CTR"    value={`${gscStats.ctr}%`}                     sub="Click-through" color="#22c55e"/>
              <StatCard icon={Search}            label="Avg. Position" value={gscStats.position}                    sub="Google rank" color="#3b82f6"/>
            </div>
            {/* Sparkline */}
            {gscChart.length > 0 && (
              <div style={{ marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginBottom:6, fontWeight:500 }}>Impressions — Last 30 days</div>
                <Sparkline data={gscChart} color="#ef4444"/>
              </div>
            )}
            {/* Top queries table */}
            {gscQueries.length > 0 && (
              <>
                <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text-primary)', marginBottom:'0.625rem' }}>Top Search Queries</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
                  <thead>
                    <tr>{['Query','Clicks','Impressions','CTR','Position'].map(h=>(
                      <th key={h} style={{ textAlign:'left', padding:'0.4rem 0.625rem', color:'var(--text-muted)', fontWeight:600, fontSize:'0.7rem', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {gscQueries.map((r,i)=>(
                      <tr key={i} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.15s' }}
                        onMouseEnter={e=>(e.currentTarget as any).style.background='var(--bg-tertiary)'}
                        onMouseLeave={e=>(e.currentTarget as any).style.background='transparent'}>
                        <td style={{ padding:'0.5rem 0.625rem', color:'var(--text-primary)', fontWeight:500 }}>{r.keys?.[0]||'—'}</td>
                        <td style={{ padding:'0.5rem 0.625rem', color:'#f97316', fontWeight:700 }}>{r.clicks}</td>
                        <td style={{ padding:'0.5rem 0.625rem', color:'var(--text-secondary)' }}>{r.impressions.toLocaleString()}</td>
                        <td style={{ padding:'0.5rem 0.625rem', color:'#22c55e', fontWeight:600 }}>{(r.ctr*100).toFixed(1)}%</td>
                        <td style={{ padding:'0.5rem 0.625rem' }}>
                          <span style={{ padding:'2px 7px', borderRadius:4, fontSize:'0.7rem', fontWeight:700, background:r.position<5?'hsla(142,76%,36%,0.15)':'hsla(0,80%,55%,0.1)', color:r.position<5?'#22c55e':'#ef4444' }}>
                            {r.position.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Google Analytics 4 ── */}
      <div className="card" style={{ padding:'1.25rem', marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: ga4Connected ? '1rem' : 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Globe size={16} color="var(--accent)"/>
            <h2 style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--text-primary)' }}>Google Analytics 4</h2>
            <span style={{ fontSize:'0.68rem', padding:'1px 7px', borderRadius:99, fontWeight:600,
              color: ga4Connected ? '#22c55e' : '#ef4444',
              background: ga4Connected ? 'hsla(142,76%,36%,0.12)' : 'hsla(0,80%,55%,0.08)',
              border: `1px solid ${ga4Connected ? 'hsla(142,76%,36%,0.2)' : 'hsla(0,80%,55%,0.2)'}`,
            }}>
              {ga4Connected ? '● Live Data' : '● Not Connected'}
            </span>
          </div>
          {ga4Connected && (
            <button onClick={loadGa4} className="btn btn-ghost" style={{ fontSize:'0.72rem', padding:'0.3rem 0.6rem', display:'flex', alignItems:'center', gap:4 }}>
              <RefreshCw size={11}/> Refresh
            </button>
          )}
        </div>

        {!ga4Connected && <NotConnectedState service="ga4"/>}

        {ga4Connected && ga4Loading && (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.82rem' }}>Fetching Analytics data…</div>
        )}

        {ga4Connected && ga4Error && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0.875rem 1rem', background:'hsla(0,80%,55%,0.06)', borderRadius:8, border:'1px solid hsla(0,80%,55%,0.15)' }}>
            <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:'0.8rem', color:'#ef4444' }}>{ga4Error} — </span>
            <a href="/settings" style={{ fontSize:'0.8rem', color:'var(--accent)', textDecoration:'none' }}>Re-connect in Settings</a>
          </div>
        )}

        {ga4Connected && !ga4Loading && !ga4Error && ga4Stats && (
          <>
            {/* KPI cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'0.875rem', marginBottom:'1.25rem' }}>
              <StatCard icon={Eye}              label="Total Users"    value={ga4Stats.users.toLocaleString()}     sub="Last 90 days" color="#8b5cf6"/>
              <StatCard icon={MousePointerClick} label="Sessions"      value={ga4Stats.sessions.toLocaleString()} sub="All devices"  color="#f97316"/>
              <StatCard icon={TrendingUp}        label="Page Views"    value={ga4Stats.pageViews.toLocaleString()} sub="Total views"  color="#06b6d4"/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'1rem' }}>
              {/* Users Sparkline */}
              <div>
                {ga4Chart.length > 0 && (
                  <>
                    <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginBottom:6, fontWeight:500 }}>Users — Last 30 days</div>
                    <Sparkline data={ga4Chart} color="#8b5cf6"/>
                  </>
                )}
              </div>

              {/* Device Split */}
              <div>
                <div style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:'0.875rem' }}>Device Split</div>
                <ProgressBar label="Desktop" pct={ga4Devices.desktop} color="#8b5cf6" icon={Monitor}/>
                <ProgressBar label="Mobile"  pct={ga4Devices.mobile}  color="#f97316" icon={Smartphone}/>
                <ProgressBar label="Tablet"  pct={ga4Devices.tablet}  color="#3b82f6" icon={Tablet}/>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Recent Posts ── */}
      <div className="card" style={{ padding:'1.25rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
          <h2 style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--text-primary)' }}>Recent Published Posts</h2>
          <a href="/new" style={{ fontSize:'0.78rem', color:'var(--accent)', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
            <ArrowUpRight size={13}/> New Post
          </a>
        </div>
        {loading
          ? <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>Loading...</div>
          : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'0.875rem' }}>
              {recentPosts.map(post=>(
                <a key={post.id} href={`/edit/${post.id}`}
                  style={{ textDecoration:'none', display:'block', background:'var(--bg-tertiary)', borderRadius:'0.75rem', padding:'0.875rem', border:'1px solid var(--border)', transition:'all 0.2s' }}
                  onMouseEnter={e=>{ (e.currentTarget as any).style.borderColor='var(--accent)'; (e.currentTarget as any).style.transform='translateY(-1px)' }}
                  onMouseLeave={e=>{ (e.currentTarget as any).style.borderColor='var(--border)'; (e.currentTarget as any).style.transform='translateY(0)' }}>
                  {post.category_name && <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{post.category_name}</div>}
                  <div style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-primary)', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{post.title}</div>
                  <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:6 }}>
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'No date'}
                  </div>
                </a>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}

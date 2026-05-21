import { useState, useEffect } from 'react'
import { isConnected, getConfig, fetchSeoReportData } from '../lib/googleAuth'
import { BarChart3, Search, AlertCircle, FileText, Globe, Smartphone, MousePointerClick, Eye, TrendingUp, Hash } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

interface GscRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export function SeoReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [pages, setPages] = useState<GscRow[]>([])
  const [queries, setQueries] = useState<GscRow[]>([])
  const [devices, setDevices] = useState<GscRow[]>([])
  const [countries, setCountries] = useState<GscRow[]>([])

  const gscConnected = isConnected('gsc')

  useEffect(() => {
    if (gscConnected) loadData()
    else setLoading(false)
  }, [gscConnected])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const siteUrl = getConfig('gsc_site_url')
      if (!siteUrl) throw new Error('Site URL not configured')

      const data = await fetchSeoReportData(siteUrl)
      setPages(data.pages)
      setQueries(data.queries)
      setDevices(data.devices)
      setCountries(data.countries)
    } catch (err: any) {
      setError(err.message || 'Failed to load SEO report data')
      toast.error('GSC Error: ' + err.message)
    }
    setLoading(false)
  }

  if (!gscConnected) {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
        <BarChart3 size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>SEO Reports</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Connect your Google Search Console account to view deep SEO insights.</p>
        <Link to="/settings" className="btn btn-primary">Go to Settings</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Analyzing search data (Last 30 Days)...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: 12, background: 'hsla(0,74%,52%,0.05)' }}>
        <AlertCircle size={24} color="var(--red)" />
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--red)' }}>Report Error</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{error}</p>
        </div>
      </div>
    )
  }

  const maxPageClicks = Math.max(...pages.map(p => p.clicks), 1)
  const maxQueryClicks = Math.max(...queries.map(q => q.clicks), 1)
  const maxCountryClicks = Math.max(...countries.map(c => c.clicks), 1)

  const renderProgress = (value: number, max: number, color: string) => (
    <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 99, overflow: 'hidden', width: 60 }}>
      <div style={{ height: '100%', background: color, width: `${(value / max) * 100}%` }} />
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart3 size={28} color="var(--accent)" /> SEO Report
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          Deep dive into your Search Console data (Last 30 Days)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Top Queries */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Top Search Queries</h2>
          </div>
          <div style={{ padding: '0.5rem', flex: 1, overflowY: 'auto', maxHeight: 400 }}>
            {queries.length === 0 ? <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>No data yet.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Query</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Clicks</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.map((q, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>{q.keys[0]}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          {q.clicks}
                          {renderProgress(q.clicks, maxQueryClicks, 'var(--accent)')}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <span className="badge badge-yellow">{q.position.toFixed(1)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top Pages */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Top Performing Pages</h2>
          </div>
          <div style={{ padding: '0.5rem', flex: 1, overflowY: 'auto', maxHeight: 400 }}>
            {pages.length === 0 ? <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>No data yet.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Page Path</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Clicks</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Impr.</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p, i) => {
                    const url = new URL(p.keys[0])
                    const path = url.pathname === '/' ? 'Home' : url.pathname
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.keys[0]}>
                          {path}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            {p.clicks}
                            {renderProgress(p.clicks, maxPageClicks, 'var(--blue)')}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {p.impressions.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Devices */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Device Distribution (Clicks)</h2>
          </div>
          <div style={{ padding: '1.25rem', flex: 1 }}>
            {devices.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No data yet.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {devices.map((d, i) => {
                  const maxDev = Math.max(...devices.map(x => x.clicks), 1)
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{d.keys[0].toLowerCase()}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{d.clicks} clicks</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-orange))', width: `${(d.clicks / maxDev) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Countries */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Top Countries (Clicks)</h2>
          </div>
          <div style={{ padding: '0.5rem', flex: 1, overflowY: 'auto', maxHeight: 300 }}>
            {countries.length === 0 ? <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>No data yet.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <tbody>
                  {countries.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span style={{ padding: '2px 6px', background: 'var(--bg-elevated)', borderRadius: 4, marginRight: 8, border: '1px solid var(--border)', fontSize: '0.7rem' }}>
                          {c.keys[0].toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          {c.clicks}
                          {renderProgress(c.clicks, maxCountryClicks, 'var(--green)')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

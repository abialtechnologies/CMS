import { useMemo, useState } from 'react'
import { calculateSEOScore, type SEOInput, type SEOCheck } from '../lib/seo-scorer'
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Target, Award, Type, BookOpen, TrendingUp } from 'lucide-react'

interface Props { title: string; content: string; focusKeyword: string; seoTitle: string; seoDescription: string; slug: string }

const catInfo: Record<string, { label: string; Icon: typeof Target }> = {
  basic: { label: 'Basic SEO', Icon: Target },
  additional: { label: 'Additional SEO', Icon: TrendingUp },
  title_readability: { label: 'Title Readability', Icon: Type },
  content_readability: { label: 'Content Readability', Icon: BookOpen },
}
const stCfg = {
  pass: { Icon: CheckCircle2, color: 'var(--green)', bg: 'hsla(152,70%,48%,0.08)', border: 'hsla(152,70%,48%,0.18)' },
  warning: { Icon: AlertTriangle, color: 'var(--yellow)', bg: 'hsla(45,95%,55%,0.08)', border: 'hsla(45,95%,55%,0.18)' },
  fail: { Icon: XCircle, color: 'var(--red)', bg: 'hsla(0,74%,52%,0.08)', border: 'hsla(0,74%,52%,0.18)' },
}
function scoreColor(p: number) { return p >= 71 ? 'var(--green)' : p >= 41 ? 'var(--yellow)' : 'var(--red)' }
function ringStroke(p: number) { return p >= 71 ? '#22c55e' : p >= 41 ? '#eab308' : '#ef4444' }
function gradeLabel(g: string) { return g === 'good' ? 'Good' : g === 'needs_improvement' ? 'Needs Work' : 'Poor' }
function gradeBg(p: number) { return p >= 71 ? 'linear-gradient(135deg,#22c55e,#10b981)' : p >= 41 ? 'linear-gradient(135deg,#eab308,#f97316)' : 'linear-gradient(135deg,#ef4444,#f43f5e)' }

function Ring({ pct }: { pct: number }) {
  const r = 52, c = 2 * Math.PI * r, off = c - (pct / 100) * c
  return (
    <div style={{ position: 'relative', width: 128, height: 128 }}>
      <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={ringStroke(pct)} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: scoreColor(pct) }}>{pct}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: -2 }}>/100</span>
      </div>
    </div>
  )
}

function CheckItem({ check }: { check: SEOCheck }) {
  const cfg = stCfg[check.status], { Icon } = cfg
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.65rem', borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}`, transition: 'all 0.2s' }}>
      <Icon size={15} color={cfg.color} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{check.label}</span>
          <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: cfg.color }}>{check.points}/{check.maxPoints}</span>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{check.message}</p>
      </div>
    </div>
  )
}

export function SEOScorePanel({ title, content, focusKeyword, seoTitle, seoDescription, slug }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ basic: true, additional: true, title_readability: false, content_readability: false })
  const input: SEOInput = useMemo(() => ({ title, content, focusKeyword, seoTitle, seoDescription, slug }), [title, content, focusKeyword, seoTitle, seoDescription, slug])
  const result = useMemo(() => calculateSEOScore(input), [input])
  const grouped = useMemo(() => {
    const g: Record<string, SEOCheck[]> = {}
    result.checks.forEach(c => { if (!g[c.category]) g[c.category] = []; g[c.category].push(c) })
    return g
  }, [result.checks])
  const pc = result.checks.filter(c => c.status === 'pass').length
  const wc = result.checks.filter(c => c.status === 'warning').length
  const fc = result.checks.filter(c => c.status === 'fail').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Score Circle */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Award size={20} color="var(--accent)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>SEO Score</h3>
        </div>
        <Ring pct={result.percentage} />
        <div style={{ marginTop: 12, padding: '0.35rem 1rem', borderRadius: 99, fontSize: '0.8rem', fontWeight: 700, color: 'white', background: gradeBg(result.percentage) }}>
          {gradeLabel(result.grade)}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={14} color="var(--green)" /><b style={{ color: 'var(--green)' }}>{pc}</b></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={14} color="var(--yellow)" /><b style={{ color: 'var(--yellow)' }}>{wc}</b></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={14} color="var(--red)" /><b style={{ color: 'var(--red)' }}>{fc}</b></span>
        </div>
      </div>

      {!focusKeyword && (
        <div style={{ padding: 12, borderRadius: 10, background: 'hsla(45,95%,55%,0.08)', border: '1px solid hsla(45,95%,55%,0.2)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--yellow)' }}>⚡ Enter a Focus Keyword</p>
          <p style={{ fontSize: '0.7rem', color: 'hsla(45,95%,55%,0.6)', marginTop: 2 }}>Unlock all SEO checks.</p>
        </div>
      )}

      {/* Categories */}
      {Object.entries(grouped).map(([cat, checks]) => {
        const ci = catInfo[cat]; if (!ci) return null
        const { Icon } = ci, isOpen = expanded[cat]
        const pts = checks.reduce((s, c) => s + c.points, 0), mx = checks.reduce((s, c) => s + c.maxPoints, 0)
        const pct = mx > 0 ? Math.round((pts / mx) * 100) : 0
        return (
          <div key={cat} className="card" style={{ overflow: 'hidden' }}>
            <button onClick={() => setExpanded(p => ({ ...p, [cat]: !p[cat] }))}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={16} color="var(--accent)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ci.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: scoreColor(pct) }}>{pts}/{mx}</span>
                {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </div>
            </button>
            {isOpen && <div style={{ padding: '0 0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>{checks.map(ch => <CheckItem key={ch.id} check={ch} />)}</div>}
          </div>
        )
      })}
    </div>
  )
}

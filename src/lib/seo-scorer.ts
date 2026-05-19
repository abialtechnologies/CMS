export interface SEOCheck {
  id: string; category: 'basic' | 'additional' | 'title_readability' | 'content_readability'
  label: string; status: 'pass' | 'warning' | 'fail'; message: string; points: number; maxPoints: number
}
export interface SEOResult { score: number; maxScore: number; percentage: number; grade: 'poor' | 'needs_improvement' | 'good'; checks: SEOCheck[] }
export interface SEOInput { title: string; content: string; focusKeyword: string; seoTitle: string; seoDescription: string; slug: string }

const POWER_WORDS = ['ultimate','proven','secret','powerful','exclusive','essential','incredible','amazing','stunning','brilliant','epic','best','complete','definitive','comprehensive','master','expert','guaranteed','instant','free','new','easy','simple','fast','quick','smart','top','effective','surprising','shocking','mind-blowing','unbelievable','insane','crazy','massive','huge','critical','urgent','important','warning','danger','breakthrough','revolutionary','game-changing','life-changing']
const SENTIMENT = { pos: ['best','great','awesome','amazing','perfect','wonderful','excellent','fantastic','brilliant','outstanding','superb','incredible','love','beautiful'], neg: ['worst','terrible','horrible','awful','bad','never','avoid','stop','mistake','wrong','fail','dangerous','warning','risk','scam'] }

function strip(h: string) { return String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }
function wc(h: string) { const t = strip(h); return t ? t.split(/\s+/).filter(w => w.length > 0).length : 0 }
function firstPara(h: string) { const m = String(h || '').match(/<p[^>]*>([\s\S]*?)<\/p>/i); return m ? strip(m[1]) : '' }
function subheadings(h: string) { return Array.from(String(h || '').matchAll(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/gi)).map(m => strip(m[1])) }
function imgAlts(h: string) { return Array.from(String(h || '').matchAll(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi)).map(m => m[1]) }
function imgCount(h: string) { return (String(h || '').match(/<img[^>]*>/gi) || []).length }
function links(h: string) { return Array.from(String(h || '').matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi)).map(m => m[1]) }
function paraWC(h: string) { return (String(h || '').match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []).map(p => wc(strip(p))) }
function density(h: string, kw: string) { const t = strip(h).toLowerCase(), tw = wc(h); if (!tw || !kw) return 0; const r = new RegExp(String(kw || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); return ((t.match(r) || []).length / tw) * 100 }

export function calculateSEOScore(input: SEOInput): SEOResult {
  const checks: SEOCheck[] = []
  const { title = '', content = '', focusKeyword = '', seoTitle = '', seoDescription = '', slug = '' } = input
  const kw = String(focusKeyword || '').toLowerCase().trim(), hasKw = kw.length > 0

  // BASIC SEO (40pts)
  if (hasKw) {
    const tl = (seoTitle || title).toLowerCase(); checks.push({ id: 'kw_title', category: 'basic', label: 'Focus Keyword in SEO Title', status: tl.includes(kw) ? 'pass' : 'fail', message: tl.includes(kw) ? 'Focus keyword is in SEO title.' : 'Add focus keyword to SEO title.', points: tl.includes(kw) ? 8 : 0, maxPoints: 8 })
    const dl = (seoDescription || '').toLowerCase(); checks.push({ id: 'kw_desc', category: 'basic', label: 'Focus Keyword in Meta Description', status: dl.includes(kw) ? 'pass' : 'fail', message: dl.includes(kw) ? 'Found in meta description.' : 'Add keyword to meta description.', points: dl.includes(kw) ? 6 : 0, maxPoints: 6 })
    const sl = (slug || '').toLowerCase().replace(/-/g, ' '); checks.push({ id: 'kw_slug', category: 'basic', label: 'Focus Keyword in URL', status: sl.includes(kw) ? 'pass' : 'fail', message: sl.includes(kw) ? 'Keyword in URL slug.' : 'Add keyword to URL slug.', points: sl.includes(kw) ? 6 : 0, maxPoints: 6 })
    const fp = firstPara(content).toLowerCase(); checks.push({ id: 'kw_intro', category: 'basic', label: 'Focus Keyword in Introduction', status: fp.includes(kw) ? 'pass' : 'fail', message: fp.includes(kw) ? 'Found in first paragraph.' : 'Add keyword to opening paragraph.', points: fp.includes(kw) ? 5 : 0, maxPoints: 5 })
    checks.push({ id: 'kw_h1', category: 'basic', label: 'Focus Keyword in Post Title', status: title.toLowerCase().includes(kw) ? 'pass' : 'fail', message: title.toLowerCase().includes(kw) ? 'Found in post title.' : 'Add keyword to title.', points: title.toLowerCase().includes(kw) ? 5 : 0, maxPoints: 5 })
  }
  const tw = wc(content), lok = tw >= 600, lw = tw >= 300
  checks.push({ id: 'length', category: 'basic', label: 'Content Length', status: lok ? 'pass' : lw ? 'warning' : 'fail', message: `${tw} words. ${lok ? 'Great!' : 'Aim for 600+.'}`, points: lok ? 5 : lw ? 2 : 0, maxPoints: 5 })
  const tt = seoTitle || title, tl2 = tt.length, tok = tl2 >= 50 && tl2 <= 60
  checks.push({ id: 'title_len', category: 'basic', label: 'SEO Title Length', status: tok ? 'pass' : tl2 >= 30 ? 'warning' : 'fail', message: `${tl2} chars. ${tok ? 'Perfect!' : tl2 > 60 ? 'Keep under 60.' : 'Aim for 50-60.'}`, points: tok ? 5 : tl2 >= 30 ? 3 : 0, maxPoints: 5 })

  // ADDITIONAL SEO (25pts)
  if (hasKw) {
    const d = density(content, kw), dok = d >= 1 && d <= 1.5, dw = (d >= 0.5 && d < 1) || (d > 1.5 && d <= 2.5)
    checks.push({ id: 'density', category: 'additional', label: 'Keyword Density', status: dok ? 'pass' : dw ? 'warning' : 'fail', message: `${d.toFixed(1)}%. ${dok ? 'Optimal!' : d > 2.5 ? 'Too high!' : 'Aim for 1-1.5%.'}`, points: dok ? 5 : dw ? 2 : 0, maxPoints: 5 })
    const sh = subheadings(content), shf = sh.some(h => h.toLowerCase().includes(kw))
    checks.push({ id: 'kw_sub', category: 'additional', label: 'Keyword in Subheading', status: shf ? 'pass' : 'fail', message: shf ? 'Found in subheading.' : 'Add keyword to an H2/H3.', points: shf ? 5 : 0, maxPoints: 5 })
  }
  const ic = imgCount(content)
  if (hasKw && ic > 0) { const alts = imgAlts(content), af = alts.some(a => a.toLowerCase().includes(kw)), aa = alts.some(a => a.length > 0); checks.push({ id: 'img_alt', category: 'additional', label: 'Image Alt with Keyword', status: af ? 'pass' : aa ? 'warning' : 'fail', message: af ? 'Image alt has keyword.' : aa ? 'Alt text exists but no keyword.' : 'Add alt text with keyword.', points: af ? 5 : aa ? 2 : 0, maxPoints: 5 }) }
  else checks.push({ id: 'img_alt', category: 'additional', label: 'Image Alt with Keyword', status: 'fail', message: 'No images found.', points: 0, maxPoints: 5 })
  const lnks = links(content), il = lnks.filter(l => l.startsWith('/') || l.includes('abial.ai')), el = lnks.filter(l => l.startsWith('http') && !l.includes('abial.ai'))
  checks.push({ id: 'int_links', category: 'additional', label: 'Internal Links', status: il.length > 0 ? 'pass' : 'fail', message: il.length > 0 ? `${il.length} internal link(s).` : 'Add internal links.', points: il.length > 0 ? 5 : 0, maxPoints: 5 })
  checks.push({ id: 'ext_links', category: 'additional', label: 'External Links', status: el.length > 0 ? 'pass' : 'fail', message: el.length > 0 ? `${el.length} external link(s).` : 'Add external links.', points: el.length > 0 ? 5 : 0, maxPoints: 5 })

  // TITLE READABILITY (15pts)
  checks.push({ id: 't_num', category: 'title_readability', label: 'Number in Title', status: /\d+/.test(tt) ? 'pass' : 'warning', message: /\d+/.test(tt) ? 'Has number. +CTR!' : 'Add a number for better CTR.', points: /\d+/.test(tt) ? 3 : 0, maxPoints: 3 })
  const tlw = tt.toLowerCase(), pw = POWER_WORDS.filter(w => tlw.includes(w))
  checks.push({ id: 't_pow', category: 'title_readability', label: 'Power Words', status: pw.length > 0 ? 'pass' : 'warning', message: pw.length > 0 ? `Uses: "${pw.slice(0,2).join('", "')}"` : 'Add power words.', points: pw.length > 0 ? 4 : 0, maxPoints: 4 })
  const hp = SENTIMENT.pos.some(w => tlw.includes(w)), hn = SENTIMENT.neg.some(w => tlw.includes(w))
  checks.push({ id: 't_sent', category: 'title_readability', label: 'Sentiment', status: hp||hn ? 'pass' : 'warning', message: hp||hn ? `${hp?'Positive':'Negative'} sentiment. +CTR!` : 'Add emotional sentiment.', points: hp||hn ? 4 : 0, maxPoints: 4 })
  if (hasKw) { const ts = tt.toLowerCase().substring(0, Math.ceil(tt.length*0.4)); checks.push({ id: 't_kwstart', category: 'title_readability', label: 'Keyword at Start', status: ts.includes(kw)?'pass':'warning', message: ts.includes(kw)?'Keyword near beginning.':'Move keyword to start.', points: ts.includes(kw)?4:0, maxPoints: 4 }) }

  // CONTENT READABILITY (20pts)
  const pl = paraWC(content), lp = pl.filter(l => l > 150)
  checks.push({ id: 'para_len', category: 'content_readability', label: 'Paragraph Length', status: lp.length===0?'pass':lp.length<=2?'warning':'fail', message: lp.length===0?'All paragraphs OK.':`${lp.length} long paragraph(s).`, points: lp.length===0?5:lp.length<=2?3:0, maxPoints: 5 })
  checks.push({ id: 'media', category: 'content_readability', label: 'Has Media', status: ic>0?'pass':'fail', message: ic>0?`${ic} image(s).`:'Add images.', points: ic>0?5:0, maxPoints: 5 })
  const shs = subheadings(content)
  checks.push({ id: 'structure', category: 'content_readability', label: 'Content Structure', status: shs.length>=2?'pass':shs.length>=1?'warning':'fail', message: shs.length>=2?`${shs.length} subheadings.`:'Add H2/H3 subheadings.', points: shs.length>=2?5:shs.length>=1?3:0, maxPoints: 5 })
  const ddl = (seoDescription||'').length, ddok = ddl>=120&&ddl<=160
  checks.push({ id: 'desc_len', category: 'content_readability', label: 'Meta Description Length', status: ddok?'pass':ddl>=50?'warning':'fail', message: ddl===0?'Empty. Write 120-160 chars.':ddok?`${ddl} chars. Perfect!`:ddl>160?`${ddl} chars. Keep under 160.`:`${ddl} chars. Aim for 120-160.`, points: ddok?5:ddl>=50?3:0, maxPoints: 5 })

  const tp = checks.reduce((s,c)=>s+c.points,0), mp = checks.reduce((s,c)=>s+c.maxPoints,0), pct = mp>0?Math.round((tp/mp)*100):0
  return { score: tp, maxScore: mp, percentage: pct, grade: pct>=71?'good':pct>=41?'needs_improvement':'poor', checks }
}

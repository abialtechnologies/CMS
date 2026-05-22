// ── Google OAuth2 PKCE Utilities ─────────────────────────────────────────────

const STORAGE_PREFIX = 'cms_google_'

// Generate PKCE code verifier + challenge
async function generatePKCE() {
  const verifier = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return { verifier, challenge }
}

// ── Token Storage (localStorage) ──────────────────────────────────────────────
export function saveTokens(service: 'gsc' | 'ga4', tokens: Record<string, any>) {
  localStorage.setItem(`${STORAGE_PREFIX}${service}_tokens`, JSON.stringify({ ...tokens, saved_at: Date.now() }))
}

export function getTokens(service: 'gsc' | 'ga4'): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${service}_tokens`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearTokens(service: 'gsc' | 'ga4') {
  localStorage.removeItem(`${STORAGE_PREFIX}${service}_tokens`)
}

export function isConnected(service: 'gsc' | 'ga4'): boolean {
  const t = getTokens(service)
  if (!t) return false
  if (t.refresh_token) return true
  const age = (Date.now() - (t.saved_at || 0)) / 1000
  return age < 3500
}

export async function refreshGoogleToken(service: 'gsc' | 'ga4') {
  const tokens = getTokens(service)
  if (!tokens || !tokens.refresh_token) throw new Error('No refresh token available')

  const clientId = getConfig('client_id')
  const clientSecret = getConfig('client_secret')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  
  if (!res.ok) {
    clearTokens(service)
    throw new Error('Failed to refresh token')
  }
  
  const newTokens = await res.json()
  if (!newTokens.refresh_token) newTokens.refresh_token = tokens.refresh_token
  
  saveTokens(service, newTokens)
  return newTokens
}

export async function getValidTokens(service: 'gsc' | 'ga4') {
  const t = getTokens(service)
  if (!t) return null
  
  const age = (Date.now() - (t.saved_at || 0)) / 1000
  if (age > 3500 && t.refresh_token) {
    try {
      return await refreshGoogleToken(service)
    } catch {
      return null
    }
  }
  return t
}

// ── Config Storage ─────────────────────────────────────────────────────────────
export function saveConfig(key: string, value: string) {
  localStorage.setItem(`${STORAGE_PREFIX}config_${key}`, value)
}
export function getConfig(key: string): string {
  return localStorage.getItem(`${STORAGE_PREFIX}config_${key}`) || ''
}

// ── OAuth2 Login Flow ──────────────────────────────────────────────────────────
export async function startOAuthFlow(service: 'gsc' | 'ga4') {
  const clientId = getConfig('client_id')
  if (!clientId) throw new Error('Google Client ID not configured')

  const { verifier, challenge } = await generatePKCE()
  sessionStorage.setItem('pkce_verifier', verifier)
  sessionStorage.setItem('oauth_service', service)

  const scopes: Record<string, string> = {
    gsc: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/indexing',
    ga4: 'https://www.googleapis.com/auth/analytics.readonly',
  }

  const redirectUri = `${window.location.origin}/oauth-callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes[service],
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
    state: service,
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Token Exchange (requires client secret → use backend or store in env) ─────
export async function exchangeCode(code: string, service: 'gsc' | 'ga4') {
  const clientId = getConfig('client_id')
  const clientSecret = getConfig('client_secret')
  const verifier = sessionStorage.getItem('pkce_verifier') || ''
  const redirectUri = `${window.location.origin}/oauth-callback`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  })
  if (!res.ok) throw new Error('Token exchange failed')
  const tokens = await res.json()
  saveTokens(service, tokens)
  sessionStorage.removeItem('pkce_verifier')
  return tokens
}

// ── GSC API ───────────────────────────────────────────────────────────────────
export async function fetchGscData(siteUrl: string) {
  const tokens = await getValidTokens('gsc')
  if (!tokens) throw new Error('Not connected')

  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

  const [analyticsRes, queriesRes] = await Promise.all([
    fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions: ['date'], rowLimit: 90 }),
    }),
    fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 10 }),
    }),
  ])

  if (!analyticsRes.ok) throw new Error('GSC API error: ' + (await analyticsRes.text()))
  const analytics = await analyticsRes.json()
  const queries = await queriesRes.json()
  return { analytics: analytics.rows || [], queries: queries.rows || [] }
}

export async function fetchSeoReportData(siteUrl: string) {
  const tokens = await getValidTokens('gsc')
  if (!tokens) throw new Error('Not connected')

  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] // last 30 days

  const headers = { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' }
  const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`

  const fetchDimension = async (dim: string, limit: number) => {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ startDate, endDate, dimensions: [dim], rowLimit: limit }),
    })
    if (!res.ok) throw new Error(`GSC API error fetching ${dim}`)
    const data = await res.json()
    return data.rows || []
  }

  const [pages, queries, devices, countries] = await Promise.all([
    fetchDimension('page', 20),
    fetchDimension('query', 50),
    fetchDimension('device', 3),
    fetchDimension('country', 10),
  ])

  return { pages, queries, devices, countries }
}

// ── URL Inspection API (check if a URL is indexed) ────────────────────────────
export async function inspectUrl(url: string, siteUrl: string): Promise<{ isIndexed: boolean; verdict: string; lastCrawl: string | null }> {
  const tokens = await getValidTokens('gsc')
  if (!tokens) throw new Error('GSC not connected')

  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error('Inspection failed: ' + errText)
  }

  const data = await res.json()
  const result = data.inspectionResult?.indexStatusResult || {}
  const verdict = result.verdict || 'VERDICT_UNSPECIFIED'
  const isIndexed = verdict === 'PASS'
  const lastCrawl = result.lastCrawlTime || null

  return { isIndexed, verdict, lastCrawl }
}

// ── Google Indexing API (request instant indexing) ────────────────────────────
export async function requestIndexing(url: string): Promise<void> {
  const tokens = await getValidTokens('gsc')
  if (!tokens) throw new Error('GSC not connected')

  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  })

  if (!res.ok) {
    const errText = await res.text()
    // If Indexing API fails, fall back to ping methods
    console.warn('Indexing API failed, using ping fallback:', errText)
  }

  // Also ping Google to crawl (multiple signals)
  await Promise.allSettled([
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(url)}`, { mode: 'no-cors' }),
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(url.replace(/\/[^/]*$/, '/sitemap.xml'))}`, { mode: 'no-cors' }),
  ])
}

// ── GA4 API ───────────────────────────────────────────────────────────────────
export async function fetchGa4Data(propertyId: string) {
  const tokens = await getValidTokens('ga4')
  if (!tokens) throw new Error('Not connected')

  const endDate = 'today'
  const startDate = '90daysAgo'

  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }, { name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    }),
  })
  if (!res.ok) throw new Error('GA4 API error: ' + (await res.text()))
  return await res.json()
}

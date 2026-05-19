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
  // Check expiry (access token valid for 1 hour)
  const age = (Date.now() - (t.saved_at || 0)) / 1000
  return age < 3500
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
    gsc: 'https://www.googleapis.com/auth/webmasters.readonly',
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
  const tokens = getTokens('gsc')
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

// ── GA4 API ───────────────────────────────────────────────────────────────────
export async function fetchGa4Data(propertyId: string) {
  const tokens = getTokens('ga4')
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

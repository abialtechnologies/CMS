export function generateSlug(title: string): string {
  return (title || '').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}
export function extractExcerpt(html: string, max = 160): string {
  const t = String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : t.substring(0, max).replace(/\s\S*$/, '') + '...'
}
export function countWords(html: unknown): number {
  const str = String(html || '')
  const t = str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return t ? t.split(/\s+/).filter(w => w.length > 0).length : 0
}
export function readingTime(html: unknown): number {
  return Math.max(1, Math.ceil(countWords(html) / 200))
}
export function formatDate(d: string): string {
  if (!d) return 'Unknown'
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return 'Unknown'
  }
}

export function extractFirstImage(html: unknown): string | null {
  const match = String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i)
  return match ? match[1] : null
}

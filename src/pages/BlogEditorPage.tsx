import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BlogEditor } from '../components/BlogEditor'
import { SEOScorePanel } from '../components/SEOScorePanel'
import { supabase } from '../lib/supabase'
import { generateSlug, extractExcerpt } from '../lib/utils'
import { calculateSEOScore } from '../lib/seo-scorer'
import { Save, Send, ArrowLeft, Globe, Search, FileText, Image as ImageIcon, Loader2, UploadCloud, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import toast from 'react-hot-toast'

interface Category { id: string; name: string; slug: string }

export function BlogEditorPage() {
  const nav = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const [saving, setSaving] = useState(false)
  const [loadingPost, setLoadingPost] = useState(isEditing)
  const [categories, setCategories] = useState<Category[]>([])
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('draft')
  const [focusKeyword, setFocusKeyword] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load categories
  useEffect(() => {
    supabase.from('blog_categories').select('*').order('name').then(({ data }) => setCategories(data || []))
  }, [])

  // Load existing post
  useEffect(() => {
    if (!id) return
    supabase.from('blog_posts').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { toast.error('Post not found'); nav('/'); return }
      setTitle(data.title || ''); setSlug(data.slug || ''); setContent(data.content || '')
      setExcerpt(data.excerpt || ''); setFeaturedImage(data.featured_image || '')
      setCategoryId(data.category_id || ''); setStatus(data.status || 'draft')
      setFocusKeyword(data.focus_keyword || ''); setSeoTitle(data.seo_title || '')
      setSeoDescription(data.seo_description || ''); setCanonicalUrl(data.canonical_url || '')
      setSlugEdited(true); setLoadingPost(false)
    })
  }, [id, nav])

  // Auto slug from title
  useEffect(() => { if (!slugEdited && title) setSlug(generateSlug(title)) }, [title, slugEdited])
  useEffect(() => { if (!seoTitle && title) setSeoTitle(title) }, [title, seoTitle])

  const handleContent = useCallback((html: string) => setContent(html), [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingImage(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('blog-media')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('blog-media')
        .getPublicUrl(fileName)

      setFeaturedImage(publicUrl)
      toast.success('Image uploaded successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image. Ensure blog-media bucket exists and is public.')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = async () => {
    if (!featuredImage) return
    
    // If it's a Supabase hosted image, delete it from storage
    if (featuredImage.includes('supabase.co/storage/v1/object/public/blog-media/')) {
      const fileName = featuredImage.split('blog-media/')[1]?.split('?')[0]
      if (fileName) {
        setUploadingImage(true)
        try {
          await supabase.storage.from('blog-media').remove([fileName])
          toast.success('Image deleted from cloud')
        } catch (err) {
          console.error('Failed to delete from storage:', err)
        } finally {
          setUploadingImage(false)
        }
      }
    }
    setFeaturedImage('')
  }

  const createCategory = async () => {
    if (!newCatName.trim()) return
    const { data, error } = await supabase.from('blog_categories').insert({ name: newCatName, slug: generateSlug(newCatName) }).select().single()
    if (error) { toast.error('Failed'); return }
    setCategories(p => [...p, data]); setCategoryId(data.id); setNewCatName(''); setShowNewCat(false); toast.success('Category created')
  }

  const handleSave = async (pubStatus?: string) => {
    if (!title.trim()) { toast.error('Title required'); return }
    if (!slug.trim()) { toast.error('Slug required'); return }
    setSaving(true)
    const finalStatus = pubStatus || status
    const seo = calculateSEOScore({ title, content, focusKeyword, seoTitle: seoTitle || title, seoDescription, slug })
    
    // Only include columns that exist in the DB - exclude updated_at if it causes issues
    const postData: Record<string, unknown> = {
      title,
      slug,
      content,
      excerpt: excerpt || extractExcerpt(content),
      featured_image: featuredImage || null,
      category_id: categoryId || null,
      status: finalStatus,
      focus_keyword: focusKeyword || null,
      seo_title: seoTitle || title,
      seo_description: seoDescription || null,
      seo_score: seo.percentage,
      seo_checks: seo.checks,
      canonical_url: canonicalUrl || null,
      og_image: featuredImage || null,
    }

    // Set published_at only when publishing for the first time
    if (finalStatus === 'published') {
      postData.published_at = new Date().toISOString()
    }

    try {
      if (isEditing) {
        const { error } = await supabase.from('blog_posts').update(postData).eq('id', id)
        if (error) {
          console.error('Update error:', error)
          throw new Error(error.message)
        }
      } else {
        const { data, error } = await supabase.from('blog_posts').insert(postData).select('id').single()
        if (error) {
          console.error('Insert error:', error)
          throw new Error(error.message)
        }
        if (data) nav(`/edit/${data.id}`, { replace: true })
      }
      // Update local status state to reflect the saved status
      setStatus(finalStatus)
      toast.success(finalStatus === 'published' ? '✅ Published successfully!' : '✅ Saved as draft!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      toast.error(`❌ ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  if (loadingPost) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} /></div>

  return (
    <div className="animate-fade-in">
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => nav('/')} style={{ gap: 6 }}>
          <ArrowLeft size={16} /> Back to Posts
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => handleSave('draft')} disabled={saving}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />} Save Draft
          </button>
          <button className="btn btn-primary" onClick={() => handleSave('published')} disabled={saving}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />} Publish
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Title */}
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter post title..."
            style={{ width: '100%', fontSize: '1.75rem', fontWeight: 800, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', padding: 0 }} />

          {/* Slug */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.875rem', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Globe size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>abial.ai/blog/</span>
            <input type="text" value={slug} onChange={e => { setSlugEdited(true); setSlug(generateSlug(e.target.value)) }}
              style={{ flex: 1, fontSize: '0.8rem', background: 'transparent', border: 'none', color: 'var(--green)', outline: 'none' }} />
          </div>

          {/* Editor */}
          <BlogEditor content={content} onChange={handleContent} />

          {/* Excerpt */}
          <div className="card" style={{ padding: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
              <FileText size={14} /> Excerpt
            </label>
            <textarea className="textarea" value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} placeholder="Auto-generated if empty..." />
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Publish Settings */}
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'published' ? 'var(--green)' : 'var(--yellow)' }} /> Publish
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
                <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Category</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="select" value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ flex: 1 }}>
                    <option value="">None</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', flexShrink: 0 }} onClick={() => setShowNewCat(!showNewCat)}>+</button>
                </div>
                {showNewCat && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input className="input" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Name" onKeyDown={e => e.key === 'Enter' && createCategory()} style={{ flex: 1 }} />
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={createCategory}>Add</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="card" style={{ padding: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
              <ImageIcon size={14} /> Featured Image
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={featuredImage} onChange={e => setFeaturedImage(e.target.value)} placeholder="Paste image URL..." style={{ flex: 1 }} />
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
              <button 
                className="btn btn-secondary" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploadingImage}
                style={{ padding: '0.5rem 0.75rem', flexShrink: 0 }}
                title="Upload Image"
              >
                {uploadingImage ? <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={16} />}
              </button>
            </div>
            {featuredImage && (
              <div style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                <img key={featuredImage} src={featuredImage} alt="Featured" style={{ width: '100%', height: 140, objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
                <button
                  className="btn btn-ghost"
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                  style={{
                    position: 'absolute', top: 8, right: 8, padding: 6,
                    background: 'rgba(0,0,0,0.6)', color: 'var(--red)',
                    borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(4px)'
                  }}
                  title="Remove Image"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* SEO Settings */}
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={14} color="var(--accent)" /> SEO Settings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Focus Keyword</label>
                <input className="input" value={focusKeyword} onChange={e => setFocusKeyword(e.target.value)} placeholder="e.g., digital marketing" />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  SEO Title <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>({(seoTitle || title).length}/60)</span>
                </label>
                <input className="input" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder={title || 'SEO Title'} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Meta Description <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>({seoDescription.length}/160)</span>
                </label>
                <textarea className="textarea" value={seoDescription} onChange={e => setSeoDescription(e.target.value)} rows={3} placeholder="Compelling description..." style={{ minHeight: 70 }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Canonical URL</label>
                <input className="input" value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            {/* Google Preview */}
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'hsla(0,0%,100%,0.02)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 6 }}>Google Preview</p>
              <p style={{ color: '#8ab4f8', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seoTitle || title || 'Post Title'}</p>
              <p style={{ color: '#bdc1c6', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>abial.ai/blog/{slug || 'post-slug'}</p>
              <p style={{ color: '#969ba1', fontSize: '0.7rem', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {seoDescription || 'Add a meta description to preview.'}
              </p>
            </div>
          </div>

          {/* SEO Score */}
          <SEOScorePanel title={title} content={content} focusKeyword={focusKeyword} seoTitle={seoTitle || title} seoDescription={seoDescription} slug={slug} />
        </div>
      </div>
    </div>
  )
}

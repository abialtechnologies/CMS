import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Image as ImageIcon, Upload, Trash2, Copy, HardDrive, CheckCircle2, Loader2, X, Crop as CropIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '../lib/cropImage'

interface MediaFile {
  id: string
  name: string
  size: number
  created_at: string
  url: string
}

export function MediaLibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [totalSize, setTotalSize] = useState(0)

  // Cropper State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMedia()
  }, [])

  const loadMedia = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.storage.from('blog-media').list('', {
        sortBy: { column: 'created_at', order: 'desc' },
        limit: 1000
      })
      
      if (error) throw error

      let sum = 0
      const mediaFiles = data
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => {
          sum += f.metadata?.size || 0
          const { data: { publicUrl } } = supabase.storage.from('blog-media').getPublicUrl(f.name)
          return {
            id: f.id,
            name: f.name,
            size: f.metadata?.size || 0,
            created_at: f.created_at,
            url: publicUrl
          }
        })
      
      setTotalSize(sum)
      setFiles(mediaFiles)
    } catch (err: any) {
      toast.error('Failed to load media: ' + err.message)
    }
    setLoading(false)
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) {
        toast.error('Only images are allowed')
        return
      }
      setSelectedFile(file)
      const reader = new FileReader()
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null))
      reader.readAsDataURL(file)
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleUploadCroppedImage = async () => {
    if (!imageSrc || !selectedFile || !croppedAreaPixels) return

    setUploading(true)
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      
      // Generate filename
      const ext = 'webp' // getCroppedImg converts to webp
      const fileName = `${Date.now()}-${selectedFile.name.replace(/\.[^/.]+$/, "")}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('blog-media')
        .upload(fileName, croppedImageBlob, { contentType: 'image/webp', upsert: true })

      if (uploadError) throw uploadError

      toast.success('Image uploaded successfully')
      
      // Close cropper & refresh list
      setImageSrc(null)
      setSelectedFile(null)
      loadMedia()
      
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message)
    }
    setUploading(false)
  }

  const handleDelete = async (name: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return
    try {
      const { error } = await supabase.storage.from('blog-media').remove([name])
      if (error) throw error
      toast.success('Deleted successfully')
      setFiles(prev => prev.filter(f => f.name !== name))
      // update size roughly
      const file = files.find(f => f.name === name)
      if (file) setTotalSize(prev => prev - file.size)
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message)
    }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('URL copied to clipboard')
  }

  // Quota (assuming 1GB limit for free tier)
  const QUOTA_BYTES = 1024 * 1024 * 1024 // 1GB
  const pctUsed = Math.min(100, (totalSize / QUOTA_BYTES) * 100)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
            <ImageIcon size={28} color="var(--accent)" /> Media Library
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Manage images for your blog posts with built-in cropping
          </p>
        </div>
        
        <div>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            style={{ display: 'none' }} 
          />
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload Image
          </button>
        </div>
      </div>

      {/* Storage Quota Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'hsla(220,13%,25%,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <HardDrive size={24} color="var(--text-secondary)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Storage Used</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatBytes(totalSize)} / 1 GB</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              background: pctUsed > 80 ? 'var(--red)' : pctUsed > 60 ? 'var(--yellow)' : 'var(--accent)',
              width: `${pctUsed}%`,
              transition: 'width 0.5s ease-out'
            }} />
          </div>
        </div>
      </div>

      {/* Image Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={32} color="var(--accent)" className="animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <ImageIcon size={48} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No media files uploaded yet</p>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Upload your first image
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {files.map(file => (
            <div key={file.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 140, width: '100%', background: 'var(--bg-tertiary)', position: 'relative', overflow: 'hidden' }}>
                <img 
                  src={file.url} 
                  alt={file.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  loading="lazy"
                />
              </div>
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.name}>
                  {file.name}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {formatBytes(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                  <button 
                    onClick={() => copyUrl(file.url)}
                    className="btn btn-ghost" 
                    style={{ flex: 1, padding: '0.3rem', fontSize: '0.7rem', gap: 4, justifyContent: 'center' }}
                  >
                    <Copy size={12} /> Copy URL
                  </button>
                  <button 
                    onClick={() => handleDelete(file.name)}
                    className="btn btn-ghost" 
                    style={{ padding: '0.3rem', color: 'var(--red)' }}
                    title="Delete Image"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cropper Modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="card w-full max-w-3xl" style={{ display: 'flex', flexDirection: 'column', height: '80vh', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CropIcon size={18} /> Crop & Optimize Image
              </h3>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setImageSrc(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ flex: 1, position: 'relative', background: '#111' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9} // Standard blog header aspect ratio
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Zoom</span>
                <input 
                  type="range" 
                  min={1} 
                  max={3} 
                  step={0.1} 
                  value={zoom} 
                  onChange={(e) => setZoom(Number(e.target.value))} 
                  style={{ flex: 1, maxWidth: 200 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setImageSrc(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleUploadCroppedImage} disabled={uploading}>
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {uploading ? 'Uploading...' : 'Crop & Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

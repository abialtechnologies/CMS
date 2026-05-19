import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { EditorToolbar } from './EditorToolbar'
import { useCallback, useRef } from 'react'
import { countWords } from '../lib/utils'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface Props { content: string; onChange: (html: string) => void }

export function BlogEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2,3,4,5,6] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
      Image.configure({ HTMLAttributes: { class: 'editor-img' } }),
      Underline, Highlight.configure({ multicolor: true }), TextStyle, Color,
      TextAlign.configure({ types: ['heading','paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing your article...' }),
      Table.configure({ resizable: true }), TableRow, TableCell, TableHeader,
    ],
    content: content || '',
    editorProps: { attributes: { class: 'editor-content' } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    
    const loadingToast = toast.loading('Uploading image...')
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

      editor.chain().focus().setImage({ src: publicUrl }).run()
      toast.success('Image added!', { id: loadingToast })
    } catch (err: any) {
      toast.error(err.message || 'Upload failed. Ensure blog-media bucket exists and is public.', { id: loadingToast })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const addImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const addLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt('Enter URL:', editor.getAttributes('link').href)
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) return null

  const wc = countWords(editor.getHTML())

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleEditorImageUpload} style={{ display: 'none' }} />
      <EditorToolbar editor={editor} onAddImage={addImage} onAddLink={addLink} onAddTable={addTable} />
      <div className="editor-body"><EditorContent editor={editor} /></div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem',
        borderTop: '1px solid var(--border)', background: 'var(--bg-primary)',
        fontSize: '0.75rem', color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>{wc} words</span>
          <span>{editor.getHTML().replace(/<[^>]*>/g,'').length} chars</span>
        </div>
        <span>{Math.max(1, Math.ceil(wc / 200))} min read</span>
      </div>

      <style>{`
        .editor-content { color: var(--text-primary); font-size: 16px; line-height: 1.8; min-height: 500px; padding: 1.5rem; outline: none; }
        .editor-content h2 { font-size: 1.75rem; font-weight: 700; margin: 2rem 0 1rem; color: white; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
        .editor-content h3 { font-size: 1.375rem; font-weight: 600; margin: 1.5rem 0 0.75rem; }
        .editor-content h4 { font-size: 1.125rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
        .editor-content p { margin-bottom: 1rem; }
        .editor-content ul, .editor-content ol { padding-left: 1.5rem; margin-bottom: 1rem; }
        .editor-content ul { list-style-type: disc; }
        .editor-content ol { list-style-type: decimal; }
        .editor-content li { margin-bottom: 0.25rem; }
        .editor-content blockquote { border-left: 3px solid var(--accent); padding: 1rem; margin: 1.5rem 0; background: var(--bg-tertiary); border-radius: 0 0.5rem 0.5rem 0; font-style: italic; color: var(--text-secondary); }
        .editor-content code { background: var(--bg-elevated); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.9em; color: hsl(340,80%,65%); }
        .editor-content pre { background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; margin: 1rem 0; overflow-x: auto; }
        .editor-content pre code { background: none; padding: 0; color: var(--text-secondary); }
        .editor-content hr { border-color: var(--border); margin: 2rem 0; }
        .editor-img { max-width: 100%; height: auto; border-radius: 0.75rem; margin: 1rem 0; }
        .editor-link { color: var(--accent); text-decoration: underline; }
        .editor-content table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        .editor-content table td, .editor-content table th { border: 1px solid var(--border-light); padding: 0.5rem 0.75rem; min-width: 100px; }
        .editor-content table th { background: var(--bg-elevated); font-weight: 600; }
        .editor-content mark { background: hsl(48,90%,50%); color: black; border-radius: 2px; padding: 0 2px; }
        .editor-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: var(--text-muted); pointer-events: none; height: 0; }
      `}</style>
    </div>
  )
}

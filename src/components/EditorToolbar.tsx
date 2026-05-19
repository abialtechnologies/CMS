import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline as UIcon, Strikethrough,
  Heading2, Heading3, Heading4,
  List, ListOrdered, Quote,
  Link as LinkIcon, ImageIcon, Table as TableIcon,
  Code, FileCode2, Minus,
  Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Eraser,
} from 'lucide-react'

interface Props { editor: Editor; onAddImage: () => void; onAddLink: () => void; onAddTable: () => void }

function Btn({ onClick, active, disabled, title, children }: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      style={{
        padding: 8, borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'hsla(0,80%,55%,0.15)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        opacity: disabled ? 0.3 : 1,
      }}
      onMouseEnter={e => { if (!active && !disabled) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'hsla(0,0%,100%,0.05)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' } }}
    >{children}</button>
  )
}
function Sep() { return <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} /> }

export function EditorToolbar({ editor, onAddImage, onAddLink, onAddTable }: Props) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2,
      padding: '8px 12px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UIcon size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><Highlighter size={16} /></Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().toggleHeading({level:2}).run()} active={editor.isActive('heading',{level:2})} title="H2"><Heading2 size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({level:3}).run()} active={editor.isActive('heading',{level:3})} title="H3"><Heading3 size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({level:4}).run()} active={editor.isActive('heading',{level:4})} title="H4"><Heading4 size={16} /></Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List"><List size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List"><ListOrdered size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote size={16} /></Btn>
      <Sep />
      <Btn onClick={onAddLink} active={editor.isActive('link')} title="Link"><LinkIcon size={16} /></Btn>
      <Btn onClick={onAddImage} title="Image"><ImageIcon size={16} /></Btn>
      <Btn onClick={onAddTable} title="Table"><TableIcon size={16} /></Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><Code size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block"><FileCode2 size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule"><Minus size={16} /></Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({textAlign:'left'})} title="Left"><AlignLeft size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({textAlign:'center'})} title="Center"><AlignCenter size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({textAlign:'right'})} title="Right"><AlignRight size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({textAlign:'justify'})} title="Justify"><AlignJustify size={16} /></Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo2 size={16} /></Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo2 size={16} /></Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting"><Eraser size={16} /></Btn>
    </div>
  )
}

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function seedContent(value: string): string {
  if (!value) return '';
  if (value.includes('<')) return value;
  const lines = value.split('\n').filter(l => l.trim());
  if (!lines.length) return '';
  return '<ul>' + lines.map(l => `<li>${l.replace(/^[•\-\*]\s*/, '')}</li>`).join('') + '</ul>';
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 120 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }),
      Underline,
    ],
    content: seedContent(value),
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: { class: 'tiptap-editor' },
      handleKeyDown(_view, event) {
        if (event.key === 'Tab') {
          event.preventDefault();
          if (editor?.isActive('listItem')) {
            editor.chain().focus().sinkListItem('listItem').run();
          } else {
            editor?.chain().focus().insertContent('    ').run();
          }
          return true;
        }
        return false;
      },
    },
  });

  if (!editor) return null;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: 24,
    height: 24,
    borderRadius: 5,
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 700,
    background: active ? '#e0e7ff' : 'transparent',
    color: active ? '#4f46e5' : '#475569',
  });

  const sep: React.CSSProperties = {
    width: 1,
    height: 16,
    background: '#e2e8f0',
    margin: '0 4px',
    alignSelf: 'center',
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '6px 8px',
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap' as const,
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 4, fontWeight: 500 }}>Normal</span>
        <div style={sep} />
        <button type="button" style={btnStyle(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">B</button>
        <button type="button" style={{ ...btnStyle(editor.isActive('italic')), fontStyle: 'italic' as const }} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">I</button>
        <button type="button" style={{ ...btnStyle(editor.isActive('underline')), textDecoration: 'underline' as const }} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">U</button>
        <button type="button" style={{ ...btnStyle(editor.isActive('strike')), textDecoration: 'line-through' as const }} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">S</button>
        <div style={sep} />
        <button type="button" style={btnStyle(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">•</button>
        <button type="button" style={btnStyle(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list">1.</button>
        <div style={sep} />
        <button type="button" style={btnStyle(false)} onClick={() => editor.chain().focus().sinkListItem('listItem').run()} title="Indent">→</button>
        <button type="button" style={btnStyle(false)} onClick={() => editor.chain().focus().liftListItem('listItem').run()} title="Outdent">←</button>
        <div style={sep} />
        <button type="button" style={btnStyle(false)} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">✕</button>
      </div>

      {/* Editor area */}
      <div style={{ padding: '8px 10px', minHeight, fontSize: 11, color: '#1e293b', lineHeight: 1.6 }}
           data-placeholder={placeholder}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

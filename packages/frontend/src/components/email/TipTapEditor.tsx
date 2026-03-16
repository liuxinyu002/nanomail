import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

// Allowed URL schemes for security (prevent javascript: XSS)
const ALLOWED_URL_SCHEMES = ['http:', 'https:', 'mailto:'] as const

interface TipTapEditorProps {
  value: string
  onChange: (html: string, isEmpty: boolean) => void
  placeholder?: string
  disabled?: boolean
}

export function TipTapEditor({
  value,
  onChange,
  placeholder = 'Write your message here...',
  disabled = false,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          'before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none',
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        // min-h-full ensures it stretches; p-4 ensures text isn't flush with edges
        class: 'min-h-full p-4 outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.isEmpty)
    },
    editable: !disabled,
  })

  if (!editor) {
    return null
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL:', previousUrl)

    if (url === null) {
      return
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // Validate URL scheme for security (prevent javascript: XSS)
    let validatedUrl: string
    try {
      const parsedUrl = new URL(url)
      if (!ALLOWED_URL_SCHEMES.includes(parsedUrl.protocol as (typeof ALLOWED_URL_SCHEMES)[number])) {
        toast.error('Invalid URL. Only http, https, and mailto links are allowed.')
        return
      }
      // Use normalized URL for consistency
      validatedUrl = parsedUrl.href
    } catch {
      // Try prepending https:// for URLs without scheme
      try {
        const normalizedUrl = new URL(`https://${url}`)
        validatedUrl = normalizedUrl.href
      } catch {
        toast.error('Invalid URL format')
        return
      }
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: validatedUrl }).run()
  }

  return (
    <div
      data-testid="tiptap-editor-container"
      className="flex flex-col flex-1 min-h-[200px]"
    >
      {/* Toolbar - Sticky at top with z-20 for modal stacking */}
      <div
        data-testid="tiptap-toolbar"
        className="sticky top-0 z-20 bg-muted/50 rounded-md mx-4 my-2 p-2 flex flex-wrap items-center gap-1"
      >
        {/* Undo/Redo */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Headings */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={!editor.can().chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
          aria-label="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
          aria-label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={!editor.can().chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}
          aria-label="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Text Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-accent' : ''}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-accent' : ''}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-accent' : ''}
          aria-label="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'bg-accent' : ''}
          aria-label="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Lists, Quote, Alignment */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={!editor.can().chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-accent' : ''}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={!editor.can().chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-accent' : ''}
          aria-label="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={!editor.can().chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-accent' : ''}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'bg-accent' : ''}
          aria-label="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'bg-accent' : ''}
          aria-label="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'bg-accent' : ''}
          aria-label="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Link */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={setLink}
          className={editor.isActive('link') ? 'bg-accent' : ''}
          aria-label="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor - CRITICAL: prose class for styling, max-w-none for width */}
      <EditorContent
        editor={editor}
        className="flex-1 min-h-[200px] prose prose-sm max-w-none focus:outline-none"
      />
    </div>
  )
}
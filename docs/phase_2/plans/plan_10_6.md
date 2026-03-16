# Plan 10 - Phase 6: TipTapEditor Component

> **Status**: Ready for Implementation
> **Plan**: Plan 10 - Compose Email Feature
> **Phase**: 6 of 8

---

## Objective

Create a rich text editor component using TipTap with a formatting toolbar and proper Tailwind Typography styling.

---

## Context

The compose email modal needs a rich text editor for the email body. This component provides:
- Full formatting toolbar (bold, italic, headings, lists, links, etc.)
- Proper styling via Tailwind Typography plugin
- Empty state detection for validation
- Sticky toolbar behavior

---

## Target File

| File | Action |
|------|--------|
| `packages/frontend/src/components/email/TipTapEditor.tsx` | Create |
| `packages/frontend/src/components/email/index.ts` | Modify (export) |

---

## Props Interface

```typescript
interface TipTapEditorProps {
  value: string
  onChange: (html: string, isEmpty: boolean) => void  // CRITICAL: Expose isEmpty state
  placeholder?: string
  disabled?: boolean
}
```

---

## Dependencies to Install

```bash
pnpm --filter @nanomail/frontend add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-image

pnpm --filter @nanomail/frontend add -D @tailwindcss/typography
```

| Package | Purpose |
|---------|---------|
| `@tiptap/react` | React bindings |
| `@tiptap/pm` | ProseMirror core |
| `@tiptap/starter-kit` | Basic extensions (bold, italic, headings, lists) |
| `@tiptap/extension-underline` | Underline formatting |
| `@tiptap/extension-text-align` | Text alignment |
| `@tiptap/extension-link` | Link insertion |
| `@tiptap/extension-placeholder` | Placeholder text |
| `@tiptap/extension-image` | Image support (future use) |
| `@tailwindcss/typography` | **CRITICAL** - Provides `prose` class for proper styling |

---

## Tailwind Configuration

Update `tailwind.config.js` to include typography plugin:

```javascript
module.exports = {
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

**Why required**: Tailwind CSS Preflight strips default styles from `<h1>`, `<ul>`, `<ol>`, `<blockquote>` etc. Without this plugin, users won't see visual feedback when applying bold, headings, or lists.

---

## Implementation Details

### Editor Setup

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

function TipTapEditor({ value, onChange, placeholder = 'Write your message here...', disabled }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none'
      }),
      // Future: Image extension for attachment support
      // Image.configure({ inline: true, allowBase64: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      // CRITICAL: Pass both HTML and isEmpty state to parent
      // TipTap's isEmpty is reliable across browsers
      onChange(editor.getHTML(), editor.isEmpty)
    },
    editable: !disabled,
  })

  // ... render
}
```

### Layout Structure

```tsx
return (
  <div className="rounded-md border focus-within:ring-1 focus-within:ring-ring">
    {/* Toolbar - Sticky at top with z-20 for modal stacking */}
    <div className="sticky top-0 z-20 bg-background border-b p-2 flex flex-wrap gap-1">
      {/* Toolbar buttons */}
    </div>

    {/* Editor - CRITICAL: prose class for styling, max-w-none for width */}
    <EditorContent
      editor={editor}
      className="min-h-[200px] max-h-[400px] overflow-y-auto p-3 prose prose-sm max-w-none focus:outline-none"
    />
  </div>
)
```

### Toolbar Features

| Feature | Icon (lucide-react) | Extension |
|---------|---------------------|-----------|
| Bold | `Bold` | starter-kit |
| Italic | `Italic` | starter-kit |
| Underline | `Underline` | extension-underline |
| Strikethrough | `Strikethrough` | starter-kit |
| H1/H2/H3 | `Heading1/2/3` | starter-kit |
| Bullet list | `List` | starter-kit |
| Ordered list | `ListOrdered` | starter-kit |
| Link | `Link` | extension-link |
| Blockquote | `Quote` | starter-kit |
| Align left | `AlignLeft` | extension-text-align |
| Align center | `AlignCenter` | extension-text-align |
| Align right | `AlignRight` | extension-text-align |
| Undo | `Undo` | starter-kit |
| Redo | `Redo` | starter-kit |

### Toolbar Button Pattern

```tsx
<Button
  type="button"
  variant="ghost"
  size="icon"
  onClick={() => editor.chain().focus().toggleBold().run()}
  disabled={!editor?.can().chain().focus().toggleBold().run()}
  className={editor?.isActive('bold') ? 'bg-accent' : ''}
>
  <Bold className="h-4 w-4" />
</Button>
```

---

## Key Implementation Notes

1. **CRITICAL - `onChange` signature**: Passes `(html, isEmpty)` - use `isEmpty` for reliable empty-state detection, not string comparison
2. **`prose` class required**: Without it, formatting won't show visual distinction
3. **`max-w-none`**: Prevents width constraint from prose defaults
4. **Sticky toolbar with `z-20`**: Ensures proper layering within modal stacking contexts
5. **No internal border**: Use `focus-within:ring-1` on container for unified look
6. **Placeholder**: Shows "Write your message here..." when empty

---

## Verification

1. Verify all TipTap packages installed correctly
2. Verify `@tailwindcss/typography` plugin added to tailwind.config.js
3. Test bold, italic, headings show visual changes
4. Test lists (ordered and bullet) render correctly
5. Test placeholder shows when editor is empty
6. Test `onChange` correctly reports `isEmpty` state
7. Test toolbar stays visible when scrolling editor content
8. Test disabled state prevents editing

---

## Next Phase

After completing this phase, proceed to **Phase 7: ComposeEmailModal Component** to create the main compose modal.
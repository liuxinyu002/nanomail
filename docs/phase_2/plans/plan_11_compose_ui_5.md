# Plan 11 - Phase 5: TipTapEditor Refactoring

## Project Context

**Project**: NanoMail - Email client application
**Plan**: Compose Email Modal UI Optimization
**Goal**: Refactor the compose email modal UI to achieve a modern, immersive design with borderless inputs and improved visual hierarchy.

---

## Core Principles

1. **No new features** - Strictly UI restructuring, preserve all existing functionality
2. **Hybrid borderless approach**:
   - Input areas: White background + bottom border + inline layout
   - Toolbar: Light gray background + rounded corners
   - Body: No border, no focus ring
3. **Inline layout** - Labels and inputs on same row for better vertical space utilization

---

## Phase 5 Objective

Refactor `TipTapEditor` component to remove borders, reorder toolbar buttons, and implement a unified scrolling experience.

---

## Target File

`packages/frontend/src/components/email/TipTapEditor.tsx`

---

## Prerequisites

- **Phase 1** completed: Container structure with `overflow-y-auto` on parent wrapper

---

## Implementation Details

### 5.1 Container Styling

**Before**:
```tsx
<div className="rounded-md border focus-within:ring-1 focus-within:ring-ring">
```

**After**:
```tsx
<div className="flex flex-col flex-1 min-h-[200px]">
```

**Key Changes**:
- Remove `rounded-md border` - no outer border
- Remove `focus-within:ring-1 focus-within:ring-ring` - no focus ring
- Add `flex-1` to fill remaining space
- Add `flex flex-col` for toolbar + editor layout

### 5.2 Toolbar Styling

**Before**:
```tsx
<div className="sticky top-0 z-20 bg-background border-b p-2 flex flex-wrap gap-1">
```

**After**:
```tsx
<div className="sticky top-0 z-20 bg-muted/50 rounded-md mx-4 my-2 p-2 flex flex-wrap items-center gap-1">
```

**Key Changes**:
- `bg-muted/50` - light gray background
- `rounded-md` - rounded corners
- `mx-4 my-2` - margin from edges
- Remove `border-b` - no bottom border
- Add `items-center` for vertical alignment

### 5.3 Toolbar Button Order

**New Order**:
```
[Undo Redo] | [H1 H2 H3] | [Bold Italic Underline Strikethrough] | [BulletList OrderedList Quote AlignLeft AlignCenter AlignRight] | [Link]
```

**Implementation**:
```tsx
<div className="bg-muted/50 rounded-md mx-4 my-2 p-2 flex flex-wrap items-center gap-1">
  {/* Undo/Redo */}
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()}>
    <Undo className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()}>
    <Redo className="h-4 w-4" />
  </Button>

  <div className="w-px h-4 bg-border mx-1" />

  {/* Headings */}
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
    <Heading1 className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
    <Heading2 className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
    <Heading3 className="h-4 w-4" />
  </Button>

  <div className="w-px h-4 bg-border mx-1" />

  {/* Text Formatting */}
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()}>
    <Bold className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()}>
    <Italic className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()}>
    <Underline className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleStrike().run()}>
    <Strikethrough className="h-4 w-4" />
  </Button>

  <div className="w-px h-4 bg-border mx-1" />

  {/* Lists, Quote, Alignment */}
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()}>
    <List className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
    <ListOrdered className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
    <Quote className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('left').run()}>
    <AlignLeft className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('center').run()}>
    <AlignCenter className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('right').run()}>
    <AlignRight className="h-4 w-4" />
  </Button>

  <div className="w-px h-4 bg-border mx-1" />

  {/* Link */}
  <Button variant="ghost" size="icon" onClick={setLink}>
    <LinkIcon className="h-4 w-4" />
  </Button>
</div>
```

### 5.4 Toolbar Button Styling

Use shadcn's default `variant="ghost"` for toolbar buttons:

```tsx
<Button variant="ghost" size="icon" onClick={...}>
  <Icon className="h-4 w-4" />
</Button>
```

**Important**: Do NOT override with custom hover classes. The default hover state uses the `--accent` CSS variable, which is designed for toolbars. If the hover is too subtle, update `--accent` in global CSS instead of overriding individual buttons.

### 5.5 Editor Body Styling

**Before**:
```tsx
<EditorContent
  editor={editor}
  className="min-h-[200px] max-h-[400px] overflow-y-auto p-3 prose prose-sm max-w-none focus:outline-none"
/>
```

**After**:
```tsx
<EditorContent
  editor={editor}
  className="flex-1 min-h-[200px] prose prose-sm max-w-none focus:outline-none"
/>
```

**Critical Changes**:
- **Remove `overflow-y-auto`**: Let the parent container (Phase 1's wrapper) handle all scrolling
- **Remove `max-h-[400px]**: Editor should expand to fill available space
- **Remove `p-3`**: Move padding to TipTap configuration (see below)

### 5.6 Editor Configuration for Click-to-Focus

The `flex-1` on `<EditorContent>` only expands the outer container. For click-to-focus to work on empty areas, move padding from the wrapper to the TipTap configuration:

```tsx
const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    Link,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    // ... other extensions
  ],
  content: initialContent,
  editorProps: {
    attributes: {
      // min-h-full ensures it stretches; p-4 ensures text isn't flush with edges
      class: 'min-h-full p-4 outline-none'
    }
  },
  onUpdate: ({ editor }) => {
    onChange(editor.getHTML())
  }
})
```

**Why this matters**: This ensures users can click anywhere in the editor area to focus, providing an immersive writing experience even when content is minimal.

---

## Scrolling Paradigm

**Parent container** (Phase 1) handles all scrolling:
```tsx
<div className="flex-1 overflow-y-auto flex flex-col">
  {/* Recipients, Subject, Editor all inside */}
</div>
```

**Editor body** (this phase) should NOT have its own scroll:
```tsx
// ❌ Wrong - creates nested scrolling
<EditorContent className="overflow-y-auto" />

// ✅ Correct - parent handles scroll
<EditorContent className="flex-1" />
```

This creates a single, unified scroll experience where recipients and subject fields slide out of view as the user writes a long email.

---

## Required Imports

```tsx
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react'
```

---

## Dependencies

- **Phase 1**: Parent container with `overflow-y-auto` for unified scrolling
- **Phase 4**: Subject field positioned above editor

---

## Risks and Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Toolbar button reordering affects existing tests | Low | Update tests to match new button order |
| flex-1 on editor may cause height issues on small screens | Low | Test on various viewport sizes |
| Tailwind hover styles conflict with shadcn defaults | Medium | Use default `variant="ghost"` without custom hover overrides |
| Click-to-focus fails on empty editor area | Medium | Move padding from wrapper to `editorProps.attributes.class` with `min-h-full p-4 outline-none` |
| Nested scrolling conflict | High | Remove `overflow-y-auto` from `<EditorContent>`; let parent container handle all scrolling |

---

## Verification Checklist

- [ ] Editor container has no border
- [ ] Toolbar has light gray background with rounded corners
- [ ] Toolbar buttons are in correct order
- [ ] Toolbar dividers are visible
- [ ] Default `variant="ghost"` hover works correctly
- [ ] Editor body fills available space
- [ ] Click anywhere in editor area to focus
- [ ] Scrolling is handled by parent container
- [ ] Dark mode styling is correct
- [ ] All existing formatting features still work
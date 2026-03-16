# Plan 11: Compose Email Modal UI Optimization

## Overview

Refactor the compose email modal UI to achieve a modern, immersive design with borderless inputs and improved visual hierarchy.

---

## Requirements Restatement

### Core Principles
1. **No new features** - Strictly UI restructuring, preserve all existing functionality
2. **Hybrid borderless approach**:
   - Input areas: White background + bottom border + inline layout
   - Toolbar: Light gray background + rounded corners
   - Body: No border, no focus ring
3. **Inline layout** - Labels and inputs on same row for better vertical space utilization

### Functional Requirements (Unchanged)
- Sender email display
- Recipients (To, Cc, Bcc) with email chip input
- Subject input
- Rich text editing (bold, italic, underline, strikethrough, headings, lists, quote, link, alignment, undo/redo)
- Cancel with discard confirmation
- Send with validation and loading state

---

## Implementation Phases

### Phase 1: ComposeEmailModal Structure Refactoring

**File**: `packages/frontend/src/components/email/ComposeEmailModal.tsx`

#### 1.1 Dialog Container Structure

**Before**:
```tsx
<DialogContent className="max-w-2xl h-[80vh] flex flex-col">
  <DialogHeader className="flex-shrink-0 border-b pb-4">
    <DialogTitle>...</DialogTitle>
  </DialogHeader>
  <div className="flex-1 overflow-y-auto space-y-4 py-4">...</div>
  <DialogFooter className="flex-shrink-0 border-t pt-4">...</DialogFooter>
</DialogContent>
```

**After**:
```tsx
<DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
  {/* Header - Sender row */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
    <DialogTitle className="sr-only">New Message</DialogTitle>
    <span className="text-sm text-muted-foreground">
      发件人：{settings?.SMTP_USER}
    </span>
    {/* Use DialogClose to wrap custom close button for accessibility and Esc key support */}
    <DialogClose asChild>
      <button className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1">
        <X className="h-4 w-4" />
      </button>
    </DialogClose>
  </div>

  {/* Content - Scrollable */}
  <div className="flex-1 overflow-y-auto flex flex-col">
    {/* Recipients, Subject, Editor */}
  </div>

  {/* Footer - Fixed bottom */}
  <div className="flex justify-between items-center px-4 py-3 border-t border-border/50">
    {/* Trash icon left, Send button right */}
  </div>
</DialogContent>
```

#### 1.2 State Management for Cc/Bcc

**Add states**:
```tsx
const [isCcExpanded, setIsCcExpanded] = useState(false)
const [isBccExpanded, setIsBccExpanded] = useState(false)
```

**Derived visibility**:
```tsx
const showCcField = isCcExpanded || cc.length > 0
const showBccField = isBccExpanded || bcc.length > 0
```

#### 1.3 Footer Restructuring

**Before**:
```tsx
<DialogFooter className="flex-shrink-0 border-t pt-4">
  <Button variant="outline" onClick={handleCancel}>Cancel</Button>
  <Button onClick={handleSend}>Send</Button>
</DialogFooter>
```

**After**:
```tsx
<div className="flex justify-between items-center px-4 py-3 border-t border-border/50">
  <Button
    variant="ghost"
    size="icon"
    onClick={handleCancel}
    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
    disabled={sending}
  >
    <Trash2 className="h-5 w-5" />
  </Button>
  <Button onClick={handleSend} disabled={!isValid || sending}>
    {sending ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Sending...
      </>
    ) : (
      'Send'
    )}
  </Button>
</div>
```

---

### Phase 2: EmailChipInput Refactoring

**File**: `packages/frontend/src/components/email/EmailChipInput.tsx`

#### 2.1 Inline Layout Structure

**Before**:
```tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium">{label}</label>
  <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px]">
    {/* chips + input */}
  </div>
</div>
```

**After**:
```tsx
<div className="flex items-start min-h-[44px] border-b border-border/50 focus-within:bg-muted/20">
  <label htmlFor={id} className="text-sm text-muted-foreground min-w-[5rem] flex-shrink-0 px-4 py-3">
    {label}
  </label>
  <div className="flex-1 flex flex-wrap gap-1.5 py-2 pr-4">
    {/* chips + input */}
  </div>
  {trailingActions && (
    <div className="pr-4 py-3">
      {trailingActions}
    </div>
  )}
</div>
```

**Key improvements**:
- `min-w-[5rem]` provides better breathing room for i18n (e.g., "Recipients" needs ~90px)
- `focus-within:bg-muted/20` adds subtle visual feedback for keyboard navigation while maintaining borderless aesthetic
- `htmlFor={id}` links label to input for accessibility (click label to focus input, screen reader context)

#### 2.2 Input Styling Changes

- Remove outer border (`border rounded-md`)
- Remove background color (use transparent/white)
- Remove error border styling (use text color only)
- Input should have no border, just transparent background

**Input element styling**:
```tsx
<input
  id={id}
  className={cn(
    "flex-1 min-w-[150px] outline-none bg-transparent text-sm",
    inputError && "text-destructive",
    shake && "animate-shake"
  )}
/>
```

#### 2.3 New Props Interface

Add `id` prop for accessibility and optional `trailingActions`:
```tsx
interface EmailChipInputProps {
  emails: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label: string
  id: string  // Required for accessibility - link label to input
  // New: optional trailing action buttons
  trailingActions?: React.ReactNode
}
```

---

### Phase 3: Recipients Row Composition

**File**: `packages/frontend/src/components/email/ComposeEmailModal.tsx`

#### 3.1 To Field with Cc/Bcc Triggers

```tsx
<EmailChipInput
  id="to-input"
  emails={to}
  onChange={setTo}
  label="收件人"
  placeholder="可搜索邮箱、联系人..."
  disabled={sending}
  trailingActions={
    !showCcField && !showBccField && (
      <div className="flex gap-2 text-sm text-muted-foreground">
        {!showCcField && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsCcExpanded(true)
            }}
            className="hover:text-foreground"
          >
            抄送
          </button>
        )}
        {!showBccField && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsBccExpanded(true)
            }}
            className="hover:text-foreground"
          >
            密送
          </button>
        )}
      </div>
    )
  }
/>
```

#### 3.2 Conditional Cc/Bcc Fields

```tsx
{showCcField && (
  <EmailChipInput
    id="cc-input"
    emails={cc}
    onChange={setCc}
    label="抄送"
    placeholder="输入抄送邮箱..."
    disabled={sending}
  />
)}

{showBccField && (
  <EmailChipInput
    id="bcc-input"
    emails={bcc}
    onChange={setBcc}
    label="密送"
    placeholder="输入密送邮箱..."
    disabled={sending}
  />
)}
```

---

### Phase 4: Subject Field Refactoring

**File**: `packages/frontend/src/components/email/ComposeEmailModal.tsx`

**Before**:
```tsx
<div className="space-y-1.5">
  <Label htmlFor="subject">Subject</Label>
  <Input
    id="subject"
    value={subject}
    onChange={(e) => setSubject(e.target.value)}
    placeholder="Email subject"
    disabled={sending}
  />
</div>
```

**After**:
```tsx
<div className="flex items-start min-h-[44px] border-b border-border/50 focus-within:bg-muted/20">
  <label htmlFor="subject-input" className="text-sm text-muted-foreground min-w-[5rem] flex-shrink-0 px-4 py-3">
    主题
  </label>
  <input
    id="subject-input"
    type="text"
    value={subject}
    onChange={(e) => setSubject(e.target.value)}
    placeholder="邮件主题"
    disabled={sending}
    className="flex-1 py-3 pr-4 outline-none bg-transparent text-sm"
  />
</div>
```

**Key improvements**:
- `min-w-[5rem]` for better i18n support
- `focus-within:bg-muted/20` adds subtle visual feedback for keyboard navigation

---

### Phase 5: TipTapEditor Refactoring

**File**: `packages/frontend/src/components/email/TipTapEditor.tsx`

#### 5.1 Container Styling

**Before**:
```tsx
<div className="rounded-md border focus-within:ring-1 focus-within:ring-ring">
```

**After**:
```tsx
<div className="flex flex-col flex-1 min-h-[200px]">
```

#### 5.2 Toolbar Styling

**Before**:
```tsx
<div className="sticky top-0 z-20 bg-background border-b p-2 flex flex-wrap gap-1">
```

**After**:
```tsx
<div className="sticky top-0 z-20 bg-muted/50 rounded-md mx-4 my-2 p-2 flex flex-wrap gap-1">
```

#### 5.3 Toolbar Button Order

Reorder buttons to:
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
  {/* ... H2, H3 */}

  <div className="w-px h-4 bg-border mx-1" />

  {/* Text Formatting */}
  <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()}>
    <Bold className="h-4 w-4" />
  </Button>
  {/* ... Italic, Underline, Strikethrough */}

  <div className="w-px h-4 bg-border mx-1" />

  {/* Lists, Quote, Alignment */}
  {/* ... */}

  <div className="w-px h-4 bg-border mx-1" />

  {/* Link */}
  <Button variant="ghost" size="icon" onClick={setLink}>
    <LinkIcon className="h-4 w-4" />
  </Button>
</div>
```

#### 5.4 Toolbar Button Styling

Use shadcn's default `variant="ghost"` for toolbar buttons. The default hover state is designed for toolbars and uses the `--accent` CSS variable. Do not override with custom hover classes.

```tsx
<Button variant="ghost" size="icon" onClick={...}>
  <Icon className="h-4 w-4" />
</Button>
```

If the default hover is too subtle, update the `--accent` variable in your global CSS rather than overriding individual buttons.

#### 5.5 Editor Body Styling

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

**Important - Scrolling Paradigm**: Do NOT add `overflow-y-auto` to `<EditorContent>`. The parent container (Phase 1's `overflow-y-auto` wrapper) handles all scrolling. This creates a single, unified scroll experience where recipients and subject fields slide out of view as the user writes a long email.

**Critical**: The `flex-1` on `<EditorContent>` only expands the outer container. For click-to-focus to work on empty areas, you must move the padding from the wrapper to the TipTap configuration via `editorProps`:

```tsx
const editor = useEditor({
  // ...other config
  editorProps: {
    attributes: {
      // min-h-full ensures it stretches; p-4 ensures text isn't flush with edges
      class: 'min-h-full p-4 outline-none'
    }
  }
})
```

This ensures users can click anywhere in the editor area to focus, providing an immersive writing experience even when content is minimal.
```

---

### Phase 6: Update Imports

**File**: `packages/frontend/src/components/email/ComposeEmailModal.tsx`

Add new imports:
```tsx
import { X, Trash2 } from 'lucide-react'
import { DialogClose } from '@/components/ui/dialog'
```

**File**: `packages/frontend/src/components/email/TipTapEditor.tsx`

Add import for class merging utility:
```tsx
import { cn } from '@/lib/utils'
```

Remove unused imports:
```tsx
// Remove if no longer needed:
// import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
// import { Label } from '@/components/ui/label'
// import { Input } from '@/components/ui/input'
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `ComposeEmailModal.tsx` | Structure refactor, inline layout, footer redesign, Cc/Bcc state management |
| `EmailChipInput.tsx` | Inline layout, remove borders, add trailingActions prop |
| `TipTapEditor.tsx` | Toolbar reorder, background styling, container flex-1 |

---

## Specific Tailwind Classes Reference

### Input Row (To/Cc/Bcc/Subject)
```css
/* Container */
flex items-start min-h-[44px] border-b border-border/50 focus-within:bg-muted/20

/* Label */
text-sm text-muted-foreground min-w-[5rem] flex-shrink-0 px-4 py-3

/* Input area */
flex-1 py-2 pr-4 outline-none bg-transparent text-sm

/* Trailing actions container (optional) */
pr-4 py-3
```

### Toolbar
```css
/* Container */
bg-muted/50 rounded-md mx-4 my-2 p-2 flex flex-wrap items-center gap-1

/* Divider */
w-px h-4 bg-border mx-1

/* Button - use default variant="ghost" */
<Button variant="ghost" size="icon">...</Button>
```

### Footer
```css
/* Container */
flex justify-between items-center px-4 py-3 border-t border-border/50

/* Trash icon */
text-muted-foreground hover:text-destructive hover:bg-destructive/10

/* Close button */
text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1
```

### Editor Body
```css
/* EditorContent container (no padding, no overflow-y-auto here!) */
flex-1 min-h-[200px] prose prose-sm max-w-none focus:outline-none

/* .tiptap (contenteditable div) - via editorProps.attributes.class */
min-h-full p-4 outline-none
```

### Sender Row
```css
/* Container */
flex items-center justify-between px-4 py-3 border-b border-border/50

/* Sender text */
text-sm text-muted-foreground
```

---

## Risks and Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dialog close button conflicts with custom X | Medium | Use `<DialogClose asChild>` to wrap custom button, preserving accessibility and Esc key support |
| EmailChipInput chip overflow in inline layout | Medium | Test with multiple emails, ensure proper wrapping; use `items-start` with consistent top padding for multi-line alignment |
| Toolbar button reordering affects existing tests | Low | Update tests to match new button order |
| flex-1 on editor may cause height issues on small screens | Low | Test on various viewport sizes |
| Tailwind hover styles conflict with shadcn defaults | Medium | Use default `variant="ghost"` without custom hover overrides; rely on `--accent` CSS variable for theming |
| Click-to-focus fails on empty editor area | Medium | Move padding from wrapper to `editorProps.attributes.class` with `min-h-full p-4 outline-none` |
| Subject input loses accessibility linkage | High | Preserve `id` and `htmlFor` attributes on label/input pair |
| Event bubbling on Cc/Bcc buttons | Medium | Add `e.stopPropagation()` to prevent unintended focus events on parent wrappers |
| Nested scrolling conflict (editor inside scrollable modal) | High | Remove `overflow-y-auto` from `<EditorContent>`; let parent container handle all scrolling for unified UX |
| Label width too tight for i18n | Medium | Use `min-w-[5rem]` instead of `w-16` to accommodate longer labels in other languages |
| Missing visual focus feedback for keyboard navigation | Medium | Add `focus-within:bg-muted/20` to row containers for subtle focus indication |
| EmailChipInput missing accessibility linkage | High | Add `id` prop and bind with `htmlFor` on label for screen reader context and click-to-focus |
| Hardcoded colors break dark mode | High | Use semantic CSS variables (`text-muted-foreground`, `bg-muted/50`, `border-border/50`, `hover:text-destructive`) |

---

## Testing Considerations

### Unit Tests to Update
1. `ComposeEmailModal.rendering.test.tsx` - Update DOM structure assertions
2. `ComposeEmailModal.interactions.test.tsx` - Update Cc/Bcc interaction tests
3. `EmailChipInput.test.tsx` - Add tests for trailingActions prop
4. `TipTapEditor.test.tsx` - Update toolbar button order tests

### Visual Regression Tests
- Capture before/after screenshots
- Test with various content lengths
- Test on mobile viewport

---

## Implementation Checklist

- [ ] Phase 1: ComposeEmailModal structure
- [ ] Phase 2: EmailChipInput inline layout
- [ ] Phase 3: Recipients row composition
- [ ] Phase 4: Subject field refactoring
- [ ] Phase 5: TipTapEditor refactoring
- [ ] Phase 6: Update imports
- [ ] Update unit tests
- [ ] Manual QA testing
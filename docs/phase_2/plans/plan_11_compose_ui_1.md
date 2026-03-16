# Plan 11 - Phase 1: ComposeEmailModal Structure Refactoring

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

## Phase 1 Objective

Restructure the `ComposeEmailModal` component container to establish a clean, minimal dialog structure with proper header, content, and footer sections.

---

## Target File

`packages/frontend/src/components/email/ComposeEmailModal.tsx`

---

## Implementation Details

### 1.1 Dialog Container Structure

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

**Key Changes**:
- `p-0` on DialogContent removes default padding for full-width rows
- `max-h-[85vh]` instead of `h-[80vh]` for better flexibility
- Header displays sender email instead of dialog title
- Title is visually hidden (`sr-only`) for accessibility
- Custom close button wrapped with `<DialogClose asChild>` for accessibility and Esc key support

### 1.2 State Management for Cc/Bcc

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

### 1.3 Footer Restructuring

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

**Key Changes**:
- Cancel button replaced with trash icon (left side)
- Send button on right side
- Loading state with spinner animation
- Destructive hover state for trash icon

---

## Required Imports

Add these imports at the top of `ComposeEmailModal.tsx`:

```tsx
import { X, Trash2, Loader2 } from 'lucide-react'
import { DialogClose } from '@/components/ui/dialog'
```

---

## Dependencies for Other Phases

This phase establishes the container structure that:
- **Phase 2** will populate with `EmailChipInput` components
- **Phase 3** will use for recipients row composition
- **Phase 4** will use for subject field
- **Phase 5** will use for the editor

---

## Risks and Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dialog close button conflicts with custom X | Medium | Use `<DialogClose asChild>` to wrap custom button, preserving accessibility and Esc key support |
| Missing visual focus feedback for keyboard navigation | Medium | Add `focus-within:bg-muted/20` to row containers for subtle focus indication |
| Hardcoded colors break dark mode | High | Use semantic CSS variables (`text-muted-foreground`, `bg-muted`, `border-border/50`) |

---

## Verification Checklist

- [ ] Dialog renders with sender email in header
- [ ] Custom close button works and responds to Esc key
- [ ] Footer shows trash icon and send button
- [ ] Send button shows loading state when sending
- [ ] Trash icon has destructive hover state
- [ ] Dark mode styling is correct
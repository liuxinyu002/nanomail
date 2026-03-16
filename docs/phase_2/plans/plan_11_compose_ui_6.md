# Plan 11 - Phase 6: Update Imports and Final Cleanup

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

## Phase 6 Objective

Update all imports, remove unused dependencies, and perform final cleanup after all refactoring phases are complete.

---

## Target Files

1. `packages/frontend/src/components/email/ComposeEmailModal.tsx`
2. `packages/frontend/src/components/email/EmailChipInput.tsx`
3. `packages/frontend/src/components/email/TipTapEditor.tsx`

---

## Prerequisites

All previous phases must be completed:
- **Phase 1**: ComposeEmailModal structure
- **Phase 2**: EmailChipInput inline layout
- **Phase 3**: Recipients row composition
- **Phase 4**: Subject field refactoring
- **Phase 5**: TipTapEditor refactoring

---

## Implementation Details

### 6.1 ComposeEmailModal.tsx Imports

**Add**:
```tsx
import { X, Trash2, Loader2 } from 'lucide-react'
import { DialogClose } from '@/components/ui/dialog'
```

**Remove (if no longer used)**:
```tsx
// These may be removable after Phase 1 and Phase 4:
// import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
// import { Label } from '@/components/ui/label'
// import { Input } from '@/components/ui/input'
```

**Verify existing imports are still needed**:
```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EmailChipInput } from './EmailChipInput'
import { TipTapEditor } from './TipTapEditor'
import { settingsApi } from '@/api/settings'
import { cn } from '@/lib/utils'
```

### 6.2 EmailChipInput.tsx Imports

**Ensure these imports are present**:
```tsx
import { useState, useRef, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
```

### 6.3 TipTapEditor.tsx Imports

**Add**:
```tsx
import { cn } from '@/lib/utils'
```

**Ensure all icon imports are present**:
```tsx
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

## File Changes Summary

| File | Changes |
|------|---------|
| `ComposeEmailModal.tsx` | Add X, Trash2, Loader2, DialogClose; potentially remove DialogHeader, DialogFooter, Label, Input |
| `EmailChipInput.tsx` | Ensure X and cn are imported |
| `TipTapEditor.tsx` | Add cn utility import; verify all icon imports |

---

## Final Verification Checklist

### Functionality Tests
- [ ] Dialog opens and closes correctly
- [ ] Sender email displays in header
- [ ] Custom close button (X) works
- [ ] Esc key closes dialog
- [ ] To field accepts emails and creates chips
- [ ] Cc/Bcc toggles work
- [ ] Cc/Bcc fields show/hide correctly
- [ ] Subject input works
- [ ] Editor formatting buttons work
- [ ] Send button validates and sends
- [ ] Loading state shows during send
- [ ] Cancel button (trash icon) discards email

### UI Tests
- [ ] Inline layout on all input fields
- [ ] Borderless styling on inputs
- [ ] Bottom border on input rows
- [ ] Focus state background change
- [ ] Toolbar has gray background and rounded corners
- [ ] Unified scrolling (no nested scroll areas)
- [ ] Dark mode works correctly
- [ ] Responsive on different screen sizes

### Accessibility Tests
- [ ] Labels linked to inputs via `id`/`htmlFor`
- [ ] Screen reader can identify all fields
- [ ] Keyboard navigation works
- [ ] Focus visible on all interactive elements

---

## Unit Tests to Update

After completing all phases, update these test files:

1. `ComposeEmailModal.rendering.test.tsx`
   - Update DOM structure assertions
   - Update label/input relationship tests

2. `ComposeEmailModal.interactions.test.tsx`
   - Update Cc/Bcc interaction tests
   - Update close button tests

3. `EmailChipInput.test.tsx`
   - Add tests for `trailingActions` prop
   - Add tests for `id` prop accessibility

4. `TipTapEditor.test.tsx`
   - Update toolbar button order tests
   - Update button count assertions

---

## Complete Tailwind Classes Reference

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

## Completion Checklist

- [ ] Phase 1: ComposeEmailModal structure
- [ ] Phase 2: EmailChipInput inline layout
- [ ] Phase 3: Recipients row composition
- [ ] Phase 4: Subject field refactoring
- [ ] Phase 5: TipTapEditor refactoring
- [ ] Phase 6: Update imports
- [ ] Update unit tests
- [ ] Manual QA testing
- [ ] Visual regression tests (before/after screenshots)
- [ ] Mobile viewport testing
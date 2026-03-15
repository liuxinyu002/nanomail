# Plan 9 - Phase 2: Create TodoDayModal Component

> **Parent Plan**: [plan_9.md](./plan_9.md)
> **Status**: ✅ Completed
> **Dependencies**: [Phase 1: Dialog Component](./plan_9_phase1.md)

---

## Objective

Create new modal component based on TodoDayDrawer, using Dialog and adding expand/collapse toggle.

## Why

Replace the side drawer with a centered modal. Keep all existing functionality while changing the container and improving UX with fixed size options.

---

## Target File

`/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/features/todos/TodoDayModal.tsx`

---

## Risk Level

**Low** (no complex resize drag logic)

---

## Key Implementation Details

### 1. Expand/Collapse State

```typescript
const [isExpanded, setIsExpanded] = useState(false)
const EXPANDED_WIDTH = 'max-w-xl'  // 576px
const COMPACT_WIDTH = 'max-w-md'   // 448px
```

### 2. Width Toggle Button

```tsx
<Button
  variant="ghost"
  size="icon"
  className="absolute right-10 top-4 h-6 w-6"
  onClick={() => setIsExpanded(!isExpanded)}
  aria-label={isExpanded ? 'Collapse' : 'Expand'}
>
  {isExpanded ? (
    <Minimize2 className="h-4 w-4" />
  ) : (
    <Maximize2 className="h-4 w-4" />
  )}
</Button>
```

### 3. Content Switching Animation

> **⚠️ Critical Limitation: CSS Grid `1fr` Trick Does NOT Work for Content Height Switching!**
>
> The CSS Grid `1fr` technique is designed for **collapse/expand animations** (0 to auto), NOT for switching between two different natural heights.

#### Option A: Compromise Solution (Pure CSS - Fade Only) - Recommended

```tsx
<div className="relative">
  {/* Fade transition wrapper */}
  <div
    className={cn(
      "transition-opacity duration-200",
      editingTodo ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100'
    )}
  >
    <TodoList ... />
  </div>
  <div
    className={cn(
      "transition-opacity duration-200",
      editingTodo ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
    )}
  >
    <TodoEditForm ... />
  </div>
</div>
```

**Pros**: No additional dependencies, smooth visual transition
**Cons**: Height still "jumps" instantly (users typically don't notice with opacity animation)

#### Option B: Perfect Solution (Framer Motion)

```bash
pnpm --filter @nanomail/frontend add framer-motion
```

```tsx
import { motion, AnimatePresence } from 'framer-motion'

<AnimatePresence mode="wait">
  <motion.div
    key={editingTodo ? 'edit' : 'list'}
    layout  // This enables automatic height animation
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    {editingTodo ? (
      <TodoEditForm ... />
    ) : (
      <TodoList ... />
    )}
  </motion.div>
</AnimatePresence>
```

**Recommendation**: Start with **Option A (Fade Only)**. Upgrade to Option B if visual testing shows issues.

### 4. Sticky Header with Scrollable Content

```tsx
<DialogContent className="max-h-[85vh] flex flex-col">
  <DialogHeader className="sticky top-0 z-10 bg-background border-b pb-4">
    {/* Title, description, expand toggle, close button */}
  </DialogHeader>
  <div className="flex-1 overflow-y-auto">
    {/* Scrollable content area */}
  </div>
</DialogContent>
```

### 5. Reset Editing State When Modal Closes

> **⚠️ Avoid `useEffect` with `open` state for reset!**
>
> Using `useEffect` to reset state when `open` becomes `false` will cause visual flickering.

**Recommended Solution: Use `onOpenChange` callback with delay**

```typescript
const handleClose = (open: boolean) => {
  if (!open) {
    // Delay reset to allow exit animation to complete
    setTimeout(() => {
      setEditingTodo(null)
      setIsExpanded(false)
    }, 200) // Match CSS animation duration
  }
  onOpenChange?.(open)
}

// In Dialog:
<Dialog open={open} onOpenChange={handleClose}>
```

### 6. Prevent "Data Nullification" Crash During Exit Animation

> **⚠️ Critical Bug: Parent Nullifying Data During Exit Animation!**
>
> When the parent component calls `setSelectedDate(null)` on close, the `date` prop becomes `null` immediately. If `TodoDayModal` renders `date.toISOString()`, the component will crash during the fade-out animation!

**Solution: Cache Date Value Inside Component**

```typescript
import { useState, useEffect } from 'react'

interface TodoDayModalProps {
  open: boolean
  date: Date | null
  // ...
}

export function TodoDayModal({ open, date, ...props }: TodoDayModalProps) {
  // Cache the last valid date to prevent crash during exit animation
  const [displayDate, setDisplayDate] = useState<Date | null>(date)

  useEffect(() => {
    // Only update when date is valid (not null)
    if (date) {
      setDisplayDate(date)
    }
    // Do NOT update displayDate when date becomes null
    // This keeps the last valid date during exit animation
  }, [date])

  // Use displayDate for rendering, never use date directly
  const formattedDate = displayDate?.toLocaleDateString() ?? ''
  const isoDate = displayDate?.toISOString() ?? ''

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogTitle>{formattedDate}</DialogTitle>
        {/* ... */}
      </DialogContent>
    </Dialog>
  )
}
```

### 7. Edit Mode and Expand State Synchronization

```typescript
const handleEditTodo = (todo: Todo) => {
  setEditingTodo(todo)
  setIsExpanded(true) // Auto-expand when entering edit mode
}

const handleCancelEdit = () => {
  setEditingTodo(null)
  // Optional: collapse back to compact view
  // setIsExpanded(false)
}

const handleSaveEdit = () => {
  // Save logic...
  setEditingTodo(null)
  // Optional: collapse after save
  // setIsExpanded(false)
}
```

---

## Acceptance Criteria

- [x] TodoDayModal component created at `features/todos/TodoDayModal.tsx`
- [x] Uses Dialog component from Phase 1
- [x] Expand/collapse toggle switches between 448px and 576px widths
- [x] Modal auto-expands when entering edit mode
- [x] State resets correctly after close animation completes
- [x] No crash when date prop becomes null during exit animation
- [x] No visual flicker during close animation
- [x] Sticky header with scrollable content
- [x] Mobile responsive with safe margins

---

## Next Phase

[Phase 3: Update TodoCalendar Component](./plan_9_phase3.md)
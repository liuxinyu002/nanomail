# Implementation Plan: Todo Day Modal Dialog

> **Status**: Ready for Implementation
> **Created**: 2026-03-15
> **Related Discussion**: Converting Todo Calendar Day Drawer to Modal Dialog

---

## 1. Overview

Convert the Todo Calendar's day detail view from a right-side Sheet drawer to a centered Modal Dialog. The modal will display todos for a selected date, support inline editing, and provide a toggle between compact list view and expanded edit view.

**Key Design Decisions**:
- Modal Dialog (centered popup with overlay, click-outside-to-close)
- Default size: Large (max-w-lg ~ 512px) for better form editing experience
- Fixed size with expand/collapse toggle (no free drag resize - avoids translate/resize conflicts)
- List/Edit mode switching within the same modal with smooth height transition
- Built with `@radix-ui/react-dialog` (already installed v1.1.15)

---

## 2. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Click date with todos opens centered modal dialog | High |
| FR-2 | Modal displays date title and todo count | High |
| FR-3 | Modal shows todos sorted by priority (high > medium > low) | High |
| FR-4 | Click outside modal or press Escape closes modal | High |
| FR-5 | Edit todo within same modal (list <-> form switch) | High |
| FR-6 | Delete todo with inline confirmation | High |
| FR-7 | Toggle between compact list view (448px) and expanded edit view (576px) | Medium |
| FR-8 | Click on todo triggers onTodoClick callback | Medium |
| FR-9 | Completed tasks show strikethrough styling | Medium |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Modal animates in/out smoothly (fade + scale + slight slide-up) |
| NFR-2 | Keyboard accessible (Tab navigation, Escape to close) |
| NFR-3 | Proper ARIA attributes for accessibility |
| NFR-4 | Width: 448px (compact) / 576px (expanded) |
| NFR-5 | Max height: 85vh with internal scrolling |
| NFR-6 | Sticky header, scrollable content area |
| NFR-7 | Smooth height transition when switching between list/edit modes |

---

## 3. Architecture Changes

### 3.1 File Structure

```
packages/frontend/src/
├── components/ui/
│   └── dialog.tsx               # New: Dialog component wrapper
├── features/todos/
│   ├── TodoCalendar.tsx         # Modified: rename TodoDayDrawer -> TodoDayModal
│   ├── TodoDayDrawer.tsx        # Renamed to TodoDayModal.tsx
│   ├── TodoDayModal.tsx         # New name, modified: use Dialog + expand toggle
│   ├── TodoDayDrawer.test.tsx   # Renamed to TodoDayModal.test.tsx
│   └── TodoEditForm.tsx         # Unchanged (reused within modal)
```

### 3.2 Component Hierarchy

```
TodoCalendar
├── (Month Navigation)
├── TodoCalendarGrid
│   └── CalendarDayCell[] (click triggers onDayClick)
└── TodoDayModal
    ├── Dialog (Radix UI)
    │   ├── DialogOverlay (backdrop with blur)
    │   └── DialogContent (centered container, max-h-[85vh])
    │       ├── DialogHeader (sticky, bg-background)
    │       │   ├── DialogTitle (date)
    │       │   ├── DialogDescription (todo count)
    │       │   └── ExpandToggle (top-right corner)
    │       ├── DialogClose (X button)
    │       └── Content Area (overflow-y-auto, flex-1, transition-all)
    │           ├── Todo List View (default)
    │           │   └── TodoItem[] with TodoItemMenu
    │           └── TodoEditForm (when editing)
```

---

## 4. Implementation Steps

> **📋 Phase files have been split for detailed implementation:**
> - [Phase 1: Create Dialog Component](./plan_9_phase1.md)
> - [Phase 2: Create TodoDayModal Component](./plan_9_phase2.md)
> - [Phase 3: Update TodoCalendar Component](./plan_9_phase3.md)
> - [Phase 4: Rename and Update Test Files](./plan_9_phase4.md)
> - [Phase 5: Cleanup Old Files](./plan_9_phase5.md)

### Phase 1: Create Dialog Component

**File**: `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/components/ui/dialog.tsx`

**Action**: Create a reusable Dialog component using Radix UI primitives.

**Why**: Provide a consistent modal pattern across the application. The Sheet component already uses `@radix-ui/react-dialog`, so we follow the same pattern.

**Dependencies**: None (radix-ui/react-dialog already installed)

> **Optional**: Install `@radix-ui/react-visually-hidden` for hiding `DialogDescription` while keeping it accessible:
> ```bash
> pnpm --filter @nanomail/frontend add @radix-ui/react-visually-hidden
> ```
> Alternatively, use Tailwind's `sr-only` utility class.

**Risk**: Low

**Key Implementation Details**:
- Use `DialogPrimitive.Root`, `DialogPrimitive.Portal`, `DialogPrimitive.Overlay`, `DialogPrimitive.Content`
- Centered positioning via `left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]`
- Animation: fade-in/out + zoom-in/out (95% scale) + slight slide-up (translate-y)
- Close button (X) in top-right corner
- Max height constraint: `max-h-[85vh]`
- Flex layout: header (shrink-0) + content (flex-1 overflow-y-auto)
- **Mobile responsive**: Safe margins on small screens

```tsx
// DialogContent key styles
<DialogPrimitive.Content
  className={cn(
    "fixed left-[50%] top-[50%] z-50 grid w-[calc(100vw-2rem)] sm:w-full max-w-lg",
    "translate-x-[-50%] translate-y-[-50%]",
    "gap-4 border bg-background p-6 shadow-lg duration-200",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[state=closed]:slide-out-to-bottom-1 data-[state=open]:slide-in-from-bottom-2",
    "max-h-[85vh] flex flex-col"
  )}
>
```

> **⚠️ Mobile Responsive Note**:
> - `w-[calc(100vw-2rem)]` ensures 1rem safe margin on each side for screens < 640px
> - `sm:w-full` switches to standard width behavior on larger screens

**Accessibility Requirements (CRITICAL)**:

> **⚠️ Radix UI will throw console warnings if `DialogTitle` and `DialogDescription` are missing!**
>
> Radix UI has strict accessibility requirements. Both `DialogTitle` and `DialogDescription` must be present in the DOM for screen readers, even when visual descriptions aren't needed.

```tsx
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

<DialogPrimitive.Content>
  <DialogPrimitive.Title>Date Todos</DialogPrimitive.Title>
  {/* If description is not visually needed, hide it but keep in DOM */}
  <DialogPrimitive.Description asChild>
    <VisuallyHidden>
      View and manage todos for selected date
    </VisuallyHidden>
  </DialogPrimitive.Description>
  {/* Rest of content... */}
</DialogPrimitive.Content>
```

**If `@radix-ui/react-visually-hidden` is not installed**, you can use Tailwind utility instead:
```tsx
<DialogPrimitive.Description className="sr-only">
  View and manage todos for selected date
</DialogPrimitive.Description>
```

---

### Phase 2: Create TodoDayModal Component

**File**: `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/features/todos/TodoDayModal.tsx`

**Action**: Create new modal component based on TodoDayDrawer, using Dialog and adding expand/collapse toggle.

**Why**: Replace the side drawer with a centered modal. Keep all existing functionality while changing the container and improving UX with fixed size options.

**Dependencies**: Phase 1 (Dialog component)

**Risk**: Low (no complex resize drag logic)

**Key Implementation Details**:

1. **Expand/Collapse State** (replacing resize):
```typescript
const [isExpanded, setIsExpanded] = useState(false)
const EXPANDED_WIDTH = 'max-w-xl'  // 576px
const COMPACT_WIDTH = 'max-w-md'   // 448px
```

2. **Width Toggle Button**:
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

3. **Content Switching Animation** for list/edit mode switching:

> **⚠️ Critical Limitation: CSS Grid `1fr` Trick Does NOT Work for Content Height Switching!**
>
> The CSS Grid `1fr` technique (transitioning from `grid-template-rows: 0fr` to `1fr`) is designed for **collapse/expand animations** (0 to auto), NOT for switching between two different natural heights.
>
> When switching from TodoList (height A) to TodoEditForm (height B), both are `auto` heights. The browser cannot interpolate between two `auto` values, causing an instant "snap" instead of smooth animation.

**Option A: Compromise Solution (Pure CSS - Fade Only)**

Accept the height jump and only animate opacity for a smoother visual transition:

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

This approach:
- ✅ No additional dependencies
- ✅ Smooth visual transition via fade-in/fade-out
- ❌ Height still "jumps" instantly (users typically don't notice with opacity animation)

**Option B: Perfect Solution (Framer Motion)**

If the project already uses `framer-motion` or can afford the bundle size (~25KB gzipped), use `layout` prop for automatic height animation:

```bash
# If not installed
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

This approach:
- ✅ Smooth height transition between any content heights
- ✅ Handles edge cases automatically
- ❌ Requires additional dependency

**Recommendation**: Start with **Option A (Fade Only)** for simplicity. If visual feedback suggests users notice the height jump, upgrade to **Option B (Framer Motion)**.

**Alternative Solutions** (Not Recommended):
- **Fixed Heights**: Set `min-height` for both views, but this wastes space or risks clipping.
- **JS ResizeObserver**: Complex implementation with performance overhead.

4. **Sticky Header with Scrollable Content**:
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

5. **Reset editing state when modal closes**:

> **⚠️ Implementation Note: Avoid `useEffect` with `open` state for reset!**
>
> Radix UI Dialog has exit animations. Using `useEffect` to reset state when `open` becomes `false` will cause visual flickering - the modal content may snap from "edit mode" back to "list mode" while the fade-out animation is still playing.

**Recommended Solution: Use `onOpenChange` callback with delay**

```typescript
const handleClose = (open: boolean) => {
  if (!open) {
    // Delay reset to allow exit animation to complete
    // Match this with CSS animation duration (default ~200ms)
    setTimeout(() => {
      setEditingTodo(null)
      setIsExpanded(false)
    }, 200) // Adjust based on your animation duration
  }
  onOpenChange?.(open)
}

// In Dialog:
<Dialog open={open} onOpenChange={handleClose}>
```

**Alternative**: Use Radix UI's `onCloseAutoFocus` prop if you need to handle focus management alongside state reset.

6. **Prevent "Data Nullification" Crash During Exit Animation**:

> **⚠️ Critical Bug: Parent Nullifying Data During Exit Animation!**
>
> When the parent component calls `setSelectedDate(null)` on close, the `date` prop becomes `null` immediately. However, Radix UI's exit animation takes ~200ms. If `TodoDayModal` renders `date.toISOString()` or similar, the component will crash with `TypeError: Cannot read properties of null` during the fade-out animation!

**Example of the Crash Scenario**:
```tsx
// Parent component (TodoCalendar)
const handleDrawerClose = (open: boolean) => {
  if (!open) {
    setSelectedDate(null)  // ⚠️ Immediately nullifies date!
  }
  onOpenChange?.(open)
}

// TodoDayModal receives null date while still rendering exit animation
<TodoDayModal
  open={!!selectedDate}  // false, but animation still playing
  date={selectedDate}    // null! 💥 Crash if component uses date.toISOString()
/>
```

**Solution: Cache Date Value Inside Component**

```typescript
// In TodoDayModal.tsx
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

**Alternative: Safe Null Check Everywhere**:
```tsx
// If you prefer not to cache, ensure every usage has null check
const formattedDate = date?.toLocaleDateString() ?? 'Select a date'
```

**Recommendation**: Use the caching approach for cleaner code and guaranteed safety during exit animations.

7. **Edit Mode and Expand State Synchronization**:

> **⚠️ Implementation Note: Link editing state with expand state!**
>
> When entering edit mode, the modal should automatically expand to provide more space for the form. Similarly, consider whether canceling edit should collapse back to compact view.

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

### Phase 3: Update TodoCalendar Component

**File**: `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/features/todos/TodoCalendar.tsx`

**Action**: Replace TodoDayDrawer import and usage with TodoDayModal.

**Why**: Connect the new modal to the calendar component.

**Dependencies**: Phase 2

**Risk**: Low

**Changes**:
```diff
- import { TodoDayDrawer } from './TodoDayDrawer'
+ import { TodoDayModal } from './TodoDayModal'

- <TodoDayDrawer
+ <TodoDayModal
    open={!!selectedDate}
    onOpenChange={handleDrawerClose}
    date={selectedDate}
    todos={drawerTodos}
    onTodoClick={onTodoClick}
  />
```

---

### Phase 4: Rename and Update Test Files

**Action**: Rename test file and update imports.

**File Operations**:
- Rename `TodoDayDrawer.test.tsx` to `TodoDayModal.test.tsx`
- Update imports: `TodoDayDrawer` -> `TodoDayModal`

**Dependencies**: Phase 2

**Risk**: Low

**Additional Test Cases**:
```typescript
describe('modal behavior', () => {
  it('renders as centered modal (not side drawer)', () => {...})
  it('closes when clicking outside', async () => {...})
  it('closes when pressing Escape', async () => {...})
  it('resets expand state when modal closes', async () => {...})
})

describe('expand/collapse functionality', () => {
  it('shows expand button in header', () => {...})
  it('toggles between compact and expanded width', async () => {...})
  it('expands modal when entering edit mode', async () => {
    // Click edit button on a todo
    // Verify modal is expanded (max-w-xl class)
  })
  it('optional: collapses when canceling edit', async () => {
    // Enter edit mode
    // Cancel edit
    // Verify modal collapses back (if this behavior is desired)
  })
})

describe('state reset on close', () => {
  it('resets editing state after close animation completes', async () => {
    // Open modal, enter edit mode
    // Close modal
    // Wait for animation duration
    // Reopen modal
    // Verify not in edit mode
  })
  it('does not crash when date becomes null during exit animation', async () => {
    // Open modal with a date
    // Close modal (parent sets date to null immediately)
    // Verify no TypeError crash during exit animation
    // Verify modal still shows cached date during fade-out
  })
})

describe('accessibility', () => {
  it('has DialogTitle in DOM', () => {...})
  it('has DialogDescription in DOM (may be visually hidden)', () => {...})
})

describe('scroll behavior', () => {
  it('scrolls content area when todos overflow', async () => {...})
  it('keeps header sticky while scrolling', async () => {...})
})
```

---

### Phase 5: Cleanup Old Files

**Action**: Delete old TodoDayDrawer.tsx after tests pass.

**Dependencies**: Phase 4 (tests must pass)

**Risk**: Low

---

## 5. Dependencies Between Phases

```
Phase 1 (Dialog component)
         |
         v
Phase 2 (TodoDayModal with expand/collapse)
         |
         v
Phase 3 (TodoCalendar integration)
         |
         v
Phase 4 (Test file rename and update)
         |
         v
Phase 5 (Cleanup old files)
```

---

## 6. Design Decisions Rationale

### 6.1 Why No Free Drag Resize?

**Problem**: Using `translate(-50%, -50%)` for centering creates a mathematical conflict with width-based resizing. When the user drags the resize handle 10px to the right, the modal only grows 5px on the right side (the other 5px goes to the left to maintain center). This causes the mouse cursor to "escape" the drag handle, resulting in a broken user experience.

**Solution**: Replace free drag resize with a fixed expand/collapse toggle:
- **Compact view** (448px): Optimized for list display
- **Expanded view** (576px): Optimized for form editing

This approach:
1. Avoids the translate/resize conflict entirely
2. Provides predictable, consistent UX
3. Matches the mental model of "compact list" vs "expanded edit"
4. Is simpler to implement and maintain

### 6.2 Width and Height Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Compact width | 448px (max-w-md) | Sufficient for list display |
| Expanded width | 576px (max-w-xl) | Comfortable for form editing with multiple fields |
| Max height | 85vh | Prevents modal from touching screen edges |
| Content scroll | overflow-y-auto on content area | Keeps header visible, only content scrolls |

### 6.3 Animation Details

| Animation | Implementation |
|-----------|---------------|
| Open | fade-in-0 + zoom-in-95 + slide-in-from-bottom-2 |
| Close | fade-out-0 + zoom-out-95 + slide-out-to-bottom-1 |
| Content switch (list ↔ edit) | Fade only (height snap masked by opacity transition) |

The slight slide-up animation adds natural context when clicking a calendar date, creating a visual connection between the click point and the modal.

### 6.4 Height Transition Implementation

**⚠️ Important Clarification: CSS Grid `1fr` Limitations**

The CSS Grid `1fr` trick (transitioning `grid-template-rows` from `0fr` to `1fr`) is **ONLY effective for collapse/expand animations** where the content goes from 0 height to its natural height.

It does **NOT** work for switching between two different natural heights:
- List view has height A (auto)
- Form view has height B (auto)
- Browser cannot interpolate from `auto` to `auto` → instant "snap"

**Solution Comparison**:

| Approach | Height Animation | Opacity Animation | Bundle Impact | Complexity |
|----------|-----------------|-------------------|---------------|------------|
| **Fade Only (Recommended)** | ❌ Snap | ✅ Smooth | None | Low |
| **Framer Motion** | ✅ Smooth | ✅ Smooth | +25KB | Medium |
| **Fixed Heights** | ❌ Snap | ⚠️ Partial | None | Low |
| **JS ResizeObserver** | ✅ Smooth | ⚠️ Manual | None | High |

**Recommendation**:
1. Start with **Fade Only** approach - users rarely notice height jump with opacity animation
2. If visual testing shows issues, add `framer-motion` for perfect height animation

### 6.5 State Reset Timing

**Why delay state reset?**

Radix UI's close animation takes ~200ms. Resetting state immediately (via `useEffect`) causes:
1. User clicks close → `open` becomes `false`
2. `useEffect` triggers → content snaps from edit to list
3. Modal is still fading out → user sees jarring content change

**Solution**: Delay reset to match animation duration:
```typescript
setTimeout(() => resetState(), 200) // Match CSS duration
```

---

## 7. Risk Assessment

| Risk | Level | Impact | Mitigation |
|------|-------|--------|------------|
| Expand toggle conflicts with close button | Low | UX | Position expand button at right-10, close at right-4 |
| Height snap when switching list/edit | Low | UX | Use fade animation to mask height jump; upgrade to Framer Motion if needed |
| Data crash during exit animation (date becomes null) | High | Crash | Cache `date` prop inside component; never use `date` directly in render |
| Content overflow on small screens | Low | UX | Max-height 85vh + internal scrolling + `w-[calc(100vw-2rem)]` mobile margin |
| Test coverage regression | Low | Quality | Rename and update tests before deleting old files |
| Dialog animation jank | Low | UX | Use Radix UI's built-in animation classes |
| State reset causes visual flicker | Medium | UX | Use `onOpenChange` with delayed reset, not `useEffect` |
| Edit mode not syncing with expand state | Medium | UX | Call `setIsExpanded(true)` when `setEditingTodo()` is triggered |
| Missing DialogTitle/DialogDescription warnings | Low | A11y | Always include both, use `sr-only` or `VisuallyHidden` if not needed visually |

---

## 8. Testing Strategy

### Unit Tests
- Dialog: Renders with overlay, close button works, ARIA attributes
- TodoDayModal: Modal renders, todos displayed, expand toggle visible
- TodoDayModal: List/edit mode switching with smooth transition
- TodoDayModal: Keyboard navigation (Escape to close)

### Integration Tests
- Calendar click -> Modal open: Date selection triggers modal
- Modal close -> Calendar state: selectedDate and modalTodos reset
- Expand toggle -> Width change: Toggle changes modal width class
- Click outside -> Modal close: Overlay click closes modal

### Accessibility Tests
- `role="dialog"` present
- `aria-modal="true"` present
- Focus trap within modal
- Escape key closes modal

---

## 9. Work Estimate

| Phase | Content | Complexity | Time |
|-------|---------|------------|------|
| Phase 1 | Create Dialog component | Low | 0.5h |
| Phase 2 | Create TodoDayModal with expand toggle | Medium | 1.5h |
| Phase 3 | Update TodoCalendar integration | Low | 0.25h |
| Phase 4 | Rename and update tests | Low | 0.5h |
| Phase 5 | Cleanup old files | Low | 0.1h |
| **Total** | | | **2.85h** |

---

## 10. Acceptance Criteria

### Functional
- [ ] Clicking date with todos opens centered modal dialog
- [ ] Modal displays formatted date in title
- [ ] Todos sorted by priority (high first)
- [ ] Click outside modal closes it
- [ ] Pressing Escape closes modal
- [ ] Edit/delete functionality works within modal
- [ ] Expand/collapse toggle switches between 448px and 576px widths
- [ ] Content scrolls independently while header stays fixed
- [ ] Modal auto-expands when entering edit mode
- [ ] State resets correctly after close animation completes
- [ ] Mobile: 1rem safe margin on each side for screens < 640px
- [ ] No visual flicker during close animation
- [ ] No crash when date prop becomes null during exit animation (date cached internally)

### Technical
- [ ] Uses `@radix-ui/react-dialog` primitives
- [ ] Dialog component in `components/ui/dialog.tsx`
- [ ] TodoDayModal in `features/todos/TodoDayModal.tsx`
- [ ] Old TodoDayDrawer.tsx deleted
- [ ] All tests pass with 80%+ coverage

### Accessibility
- [ ] `role="dialog"` attribute present
- [ ] Focus trapped within modal
- [ ] Screen reader announces title
- [ ] `DialogTitle` always present in DOM
- [ ] `DialogDescription` always present (use `sr-only` if not visually needed)
- [ ] No console warnings about missing accessible name

---

## 11. Key Files Reference

| File | Description |
|------|-------------|
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/components/ui/sheet.tsx` | Reference for Dialog component structure |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/features/todos/TodoDayDrawer.tsx` | Current implementation to be replaced |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/features/todos/TodoCalendar.tsx` | Parent component that uses the drawer/modal |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/features/todos/TodoEditForm.tsx` | Edit form reused within modal |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/features/todos/TodoDayDrawer.test.tsx` | Tests to be renamed and updated |
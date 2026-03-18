# Phase 6: Empty State Component

> Part of: [UI Refactoring Plan 4](./plan_4.md) - Todo Items and Board Components

## Context

Empty states provide visual feedback when columns have no todos. This phase creates a clean, flat SVG-based empty state with macaron/pastel colors that matches the overall design system.

---

## Dependencies

- **Phase 1**: `MACARON_COLORS` for SVG colors
- **Phase 2**: BoardColumnDroppable (integration target)

---

## Requirements

### Priority 6: Empty State Illustration

| Requirement | Specification |
|-------------|---------------|
| Style | Flat SVG-based OR pure typography |
| Colors | Macaron/pastel palette |
| NO | 3D assets, fictional micro-stereo elements |
| Size | 120-160px height |
| Layout | Vertically centered at ~1/3 position |
| Text style | `text-[#6B7280] text-sm` (light gray) |
| Condition | Show when `todos.length === 0 && !isDragging` |

---

## Implementation Steps

### Step 6.1: Create EmptyState Component

**File**: `packages/frontend/src/features/todos/EmptyState.tsx` (NEW)

**Action**: Create SVG-based flat empty state with macaron colors

```tsx
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  message?: string
  className?: string
}

export function EmptyState({ message = 'No tasks yet', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12",
        className
      )}
    >
      {/* SVG Illustration - flat, macaron colors */}
      <svg
        className="w-32 h-32 mb-4"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle - Pastel Blue */}
        <circle cx="64" cy="64" r="48" fill="#B8D4FF" fillOpacity="0.4" />

        {/* Document/Task icon - Pastel Green */}
        <rect
          x="44" y="40" width="40" height="48"
          rx="4"
          fill="#B8E6C1"
          fillOpacity="0.8"
        />

        {/* Lines representing text - Pastel Purple */}
        <rect x="52" y="52" width="24" height="4" rx="2" fill="#D4B8FF" fillOpacity="0.6" />
        <rect x="52" y="62" width="20" height="4" rx="2" fill="#D4B8FF" fillOpacity="0.6" />
        <rect x="52" y="72" width="16" height="4" rx="2" fill="#D4B8FF" fillOpacity="0.6" />

        {/* Checkmark circle - Pastel Yellow */}
        <circle cx="88" cy="80" r="16" fill="#FFF4B8" fillOpacity="0.8" />
        <path
          d="M80 80L85 85L96 74"
          stroke="#111827"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
        />
      </svg>

      {/* Text */}
      <p className="text-[#6B7280] text-sm text-center">
        {message}
      </p>
    </div>
  )
}
```

**Dependencies**: None

**Risk**: Low

---

### Step 6.2: Create Alternative Empty States

**File**: `packages/frontend/src/features/todos/EmptyState.tsx`

**Action**: Add variant support for different contexts

```tsx
type EmptyStateVariant = 'default' | 'completed' | 'archive'

const MESSAGES: Record<EmptyStateVariant, string> = {
  default: 'No tasks yet',
  completed: 'All done!',
  archive: 'No archived tasks',
}

export function EmptyState({
  variant = 'default',
  message,
  className,
}: EmptyStateProps) {
  const displayMessage = message || MESSAGES[variant]

  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <EmptyStateSVG variant={variant} />
      <p className="text-[#6B7280] text-sm text-center mt-4">
        {displayMessage}
      </p>
    </div>
  )
}

function EmptyStateSVG({ variant }: { variant: EmptyStateVariant }) {
  // Different SVG for each variant
  switch (variant) {
    case 'completed':
      return <CompletedSVG />
    case 'archive':
      return <ArchiveSVG />
    default:
      return <DefaultSVG />
  }
}
```

**Dependencies**: None

**Risk**: Low

---

### Step 6.3: Integrate EmptyState into BoardColumnDroppable

**File**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`

**Action**: Show EmptyState when column is empty and not dragging

```tsx
import { useDroppable } from '@dnd-kit/core'
import { EmptyState } from './EmptyState'
import type { Todo, Column } from '@nanomail/shared'

interface BoardColumnDroppableProps {
  column: Column
  todos: Todo[]
  children?: React.ReactNode
}

export function BoardColumnDroppable({
  column,
  todos,
  children,
}: BoardColumnDroppableProps) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id })

  const isEmpty = todos.length === 0
  const showEmptyState = isEmpty && !isOver

  return (
    <div
      ref={setNodeRef}
      className="bg-[#F7F8FA] p-3 rounded-lg min-h-[200px]"
    >
      {/* Column header */}
      <ColumnHeader column={column} />

      {/* Empty state OR cards */}
      {showEmptyState ? (
        <EmptyState
          message={`No tasks in ${column.name}`}
          className="min-h-[160px]"
        />
      ) : (
        <div className="space-y-2">
          {children}
        </div>
      )}

      {/* Drop indicator when dragging over empty column */}
      {isOver && isEmpty && (
        <div className="border-2 border-dashed border-[#2563EB] rounded-md p-4">
          <p className="text-[#2563EB] text-sm text-center">
            Drop here
          </p>
        </div>
      )}
    </div>
  )
}
```

**Dependencies**: Step 6.1

**Risk**: Low

---

## Visual Reference

```
┌─────────────────────────────┐
│  bg-[#F7F8FA]               │
│                             │
│  ● Inbox               (…)  │
│                             │
│         ┌─────────┐         │
│         │   SVG   │         │  ← 120-160px height
│         │  Icon   │         │
│         └─────────┘         │
│                             │
│       No tasks yet          │  ← text-[#6B7280] text-sm
│                             │
└─────────────────────────────┘
```

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/EmptyState.tsx` | CREATE |
| `packages/frontend/src/features/todos/BoardColumnDroppable.tsx` | MODIFY |

---

## Testing Checklist

- [ ] EmptyState renders with SVG
- [ ] SVG uses macaron/pastel colors
- [ ] Size is 120-160px height
- [ ] Text is `text-[#6B7280] text-sm`
- [ ] Shows when `todos.length === 0`
- [ ] Hidden during drag-over (`isOver`)
- [ ] Variants work correctly (if implemented)
- [ ] No 3D elements or heavy graphics

---

## Next Phase

→ [Phase 7: Legacy Component Migration](./plan_4_7.md)

---

## Related Phases

- **Phase 2**: BoardColumnDroppable integration
- **Phase 7**: Final integration with all components
# Phase 3: Drop Indicator for Sortable Context

## Overview

This phase implements visual drop indicators to show where a dragged item will be inserted during drag operations.

## Requirements Addressed

### R4: Improved Drag Feedback (Partial)
- **No column-wide background dimming** on drag-over (dirty appearance, color conflicts)
- **Insertion indicator**: Show drop indicator line or card displacement during sortable drag

---

## Current Architecture Analysis

### Affected Components

| Component | File | Current State | Required Change |
|-----------|------|---------------|-----------------|
| `SortableContext` usage | `BoardColumnDroppable.tsx` | Basic sortable | Add `useSortable` drop indicator support |

---

## Implementation Details

**File**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`

**Problem**: No visual feedback showing where a dragged item will be inserted.

**Solution**: Use `@dnd-kit/sortable`'s built-in `over` detection to show insertion indicator.

---

### Option A: Custom Drop Indicator Component

#### 1. Create DropIndicator component

**File**: `packages/frontend/src/features/todos/DropIndicator.tsx` (New file)

```tsx
import { cn } from '@/lib/utils'

interface DropIndicatorProps {
  isVisible: boolean
  position: 'before' | 'after'
}

export function DropIndicator({ isVisible, position }: DropIndicatorProps) {
  if (!isVisible) return null

  return (
    <div
      className={cn(
        'h-0.5 bg-blue-500 rounded-full transition-opacity',
        'my-1',
      )}
      role="separator"
    />
  )
}
```

#### 2. Integrate into SortableContext

```tsx
// BoardColumnDroppable.tsx
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { useDndContext } from '@dnd-kit/core'
import { Fragment } from 'react'

// Inside component:
const { over, active } = useDndContext() // Get current drag state

// Determine where to show drop indicator
const getOverIndex = () => {
  if (!over || !active) return -1
  return todos.findIndex(t => t.id === over.id)
}

// Render with indicators
{todos.map((todo, index) => {
  const showIndicatorBefore = getOverIndex() === index && active.id !== todo.id
  const showIndicatorAfter = index === todos.length - 1 && getOverIndex() === -1 && active

  return (
    <Fragment key={todo.id}>
      <DropIndicator isVisible={showIndicatorBefore} position="before" />
      <DraggableTodoItem todo={todo} index={index} />
      {index === todos.length - 1 && (
        <DropIndicator isVisible={showIndicatorAfter} position="after" />
      )}
    </Fragment>
  )
})}
```

---

### Option B: CSS-based approach with `useSortable` (Recommended)

The simpler approach is to let `@dnd-kit/sortable` handle displacement animation automatically:

```tsx
// DraggableTodoItem.tsx
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
} = useSortable({ id: todo.id })

// CSS transition handles the "push aside" effect
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  // Displacement is handled automatically by dnd-kit
}
```

**Why this approach is recommended**:
- Less code to maintain
- Built-in animations are smooth and tested
- Automatic handling of edge cases

---

## Technical Specifications

### Drop Indicator Styling

| Property | Value | Rationale |
|----------|-------|-----------|
| Height | `h-0.5` | Thin line |
| Color | `bg-blue-500` | Accent color, visible |
| Border Radius | `rounded-full` | Soft edges |
| Margin | `my-1` | Spacing from cards |
| Animation | `transition-opacity` | Smooth appearance |

---

## Test Plan

### Unit Tests

1. **BoardColumnDroppable**
   - [ ] Drop indicator shows at correct position
   - [ ] Drop indicator appears when dragging over items
   - [ ] No drop indicator when not dragging

### Integration Tests

1. **Drag and Drop Flow**
   - [ ] Drop indicator shows correct insertion point
   - [ ] Drop task into empty column → task appears
   - [ ] Reorder tasks within column → visual feedback during drag

---

## Dependencies

- **Phase 1** must be completed first (extended droppable area)
- **Phase 2** should be completed (ordinal badges)

## Next Phase

After completing this phase, proceed to **Phase 4: Real-time Badge Updates During Drag** (optional enhancement).

---

## Estimated Complexity: LOW

- Implementation: 1 hour
- Testing: 30 minutes
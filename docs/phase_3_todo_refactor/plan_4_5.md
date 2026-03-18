# Phase 5: Drag vs Expand Conflict Resolution

> Part of: [UI Refactoring Plan 4](./plan_4.md) - Todo Items and Board Components

## Context

When both drag-and-drop and click-to-expand are enabled on the same element, conflicts arise. This phase implements the strategy to distinguish between drag intent and click/expand intent.

---

## Dependencies

- **Phase 4**: TodoCard component with expand functionality

---

## Problem Statement

The same card element needs to:
1. **Drag**: Move card between columns
2. **Click**: Expand/collapse card inline

How do we differentiate user intent?

---

## Solution Strategy

### Recommended: Dedicated Drag Handle (方案 A)

**Most elegant, zero conflict**

| Aspect | Details |
|--------|---------|
| Approach | Add dedicated drag handle icon (⋮⋮) |
| Drag zone | Only handle area triggers drag |
| Click zone | Card body triggers expand |
| Latency | None - immediate response |

### Alternative: dnd-kit Activation Constraint (方案 B)

**Uses displacement threshold instead of time**

| Aspect | Details |
|--------|---------|
| Approach | Use `activationConstraint.distance` |
| Threshold | 5px movement |
| Behavior | Move > 5px = drag, else = click |
| Latency | None on PC |

### Supplementary: stopPropagation

**For interactive zones only**

```tsx
// Interactive elements stop propagation
<button onClick={(e) => { e.stopPropagation(); handleClick() }}>
```

---

## Implementation Steps

### Step 5.1: Update DraggableTodoItem with Drag Handle

**File**: `packages/frontend/src/features/todos/DraggableTodoItem.tsx`

**Action**: Add dedicated drag handle, preserve card click for expand

**Implementation (Recommended - 方案 A)**:
```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { TodoCard } from './TodoCard'
import type { Todo } from '@nanomail/shared'

interface DraggableTodoItemProps {
  todo: Todo
  onToggle: () => void
  onEdit?: () => void
  onDelete?: () => void
  onMoveToColumn?: () => void
  onSetDeadline?: () => void
}

export function DraggableTodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
  onMoveToColumn,
  onSetDeadline,
}: DraggableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 group"
    >
      {/* Drag Handle - ONLY this area triggers drag */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing p-1",
          "text-[#9CA3AF] hover:text-[#6B7280]",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "touch-none" // Prevent touch scroll interference
        )}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Card body - click to expand */}
      <div className="flex-1">
        <TodoCard
          todo={todo}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveToColumn={onMoveToColumn}
          onSetDeadline={onSetDeadline}
        />
      </div>
    </div>
  )
}
```

**Dependencies**: Phase 4 (TodoCard)

**Risk**: Low

---

### Step 5.2: Alternative - dnd-kit Sensors with Distance Threshold

**File**: `packages/frontend/src/features/todos/TodoBoard.tsx` (or DndContext parent)

**Action**: Configure sensors with distance activation constraint

**Implementation (方案 B)**:
```tsx
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core'

export function TodoBoard() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Move 5px before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  )

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      {/* Board content */}
    </DndContext>
  )
}
```

**Why this works**:
- User clicks → no movement → treated as click (expand)
- User drags → moves > 5px → treated as drag
- No setTimeout delay, instant response

**Dependencies**: None (dnd-kit feature)

**Risk**: Low

---

### Step 5.3: Interactive Zones stopPropagation

**File**: `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx`

**Action**: Ensure interactive elements don't trigger expand or drag

**Already implemented in Phase 4**:
```tsx
const handleCardClick = (e: React.MouseEvent) => {
  // Don't expand if clicking on interactive elements
  const target = e.target as HTMLElement
  if (
    target.closest('button') ||
    target.closest('a') ||
    target.closest('[role="checkbox"]')
  ) {
    return
  }
  setIsExpanded(!isExpanded)
}
```

**For dropdown and other actions**:
```tsx
// In CardDropdownMenu.tsx
<button
  onClick={(e) => {
    e.stopPropagation() // Prevent card expand
    setIsOpen(!isOpen)
  }}
>
```

**Dependencies**: Phase 4

**Risk**: Low

---

## Decision Matrix

| Criteria | Drag Handle (A) | Distance Threshold (B) |
|----------|-----------------|------------------------|
| Implementation complexity | Simple | Very simple |
| User discoverability | Medium (handle hidden by default) | High (natural behavior) |
| Conflict resolution | Zero | Zero |
| Mobile support | Good | Excellent |
| Recommended for | Desktop-focused | Cross-platform |

**Recommendation**: Use **方案 A (Drag Handle)** as primary, with **方案 B (Distance Threshold)** as fallback for mobile/touch devices.

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/DraggableTodoItem.tsx` | MODIFY |
| `packages/frontend/src/features/todos/TodoBoard.tsx` | MODIFY (if using 方案 B) |

---

## Testing Checklist

- [ ] Drag handle appears on hover
- [ ] Dragging from handle works correctly
- [ ] Clicking card body expands/collapses
- [ ] Clicking checkbox doesn't expand card
- [ ] Clicking dropdown doesn't expand card
- [ ] No conflict during drag operation
- [ ] Works on both desktop and mobile

---

## Next Phase

→ [Phase 6: Empty State Component](./plan_4_6.md)

---

## Related Phases

- **Phase 4**: TodoCard expand functionality
- **Phase 7**: Integration with legacy TodoItem
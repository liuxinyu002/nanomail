# Phase 4: Real-time Badge Updates During Drag

## Overview

This phase implements real-time badge number updates during drag operations, allowing users to preview the new order before dropping.

## Requirements Addressed

### R4: Improved Drag Feedback (Partial)
- **Real-time badge updates**: Badge numbers update during drag (before drop) to preview new order

---

## Current Architecture Analysis

### Problem

Badge numbers should update as items are reordered during drag (before drop), not just after the drop is completed.

### Goal

The badge displays the **current visual position**, not the original index.

---

## Implementation Details

**File**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`

### Option 1: Use dnd-kit's built-in sorting (Recommended for initial implementation)

Let dnd-kit handle transforms automatically. The badges will update automatically after the drop when the todo list is reordered.

**Rationale**: Real-time updates during drag add complexity and may not provide enough UX value for initial implementation.

```tsx
// No additional code needed
// CSS transform handles visual reordering
// Badges update after drop via state update
```

---

### Option 2: Manual index derivation (More complex, better UX)

Derive display index from over/active state for real-time updates:

```tsx
// BoardColumnDroppable.tsx
const { over, active } = useDndContext()

const getDisplayIndex = (todoId: string, originalIndex: number): number => {
  if (!active || !over) return originalIndex

  const activeIndex = todos.findIndex(t => t.id === active.id)
  const overIndex = todos.findIndex(t => t.id === over.id)

  if (todoId === active.id) return overIndex

  if (activeIndex < overIndex) {
    // Dragging down: items between shift up
    if (originalIndex > activeIndex && originalIndex <= overIndex) {
      return originalIndex - 1
    }
  } else {
    // Dragging up: items between shift down
    if (originalIndex >= overIndex && originalIndex < activeIndex) {
      return originalIndex + 1
    }
  }
  return originalIndex
}

// Apply to badges
{todos.map((todo, index) => {
  const displayIndex = getDisplayIndex(todo.id, index)
  return (
    <DraggableTodoItem
      key={todo.id}
      todo={todo}
      index={displayIndex}  // Use calculated display index
    />
  )
})}
```

---

## Implementation Recommendation

**Start with Option 1** (let dnd-kit handle transforms). The badges will update automatically after the drop when the todo list is reordered.

**Real-time updates (Option 2)** are an enhancement that can be added later if user feedback indicates it's needed.

### Why defer real-time updates:

1. **Complexity**: Requires tracking multiple states (active, over, indices)
2. **Edge cases**: Empty columns, single items, cross-column drags
3. **UX value**: Users typically drop quickly, real-time feedback may not be noticed
4. **Performance**: Frequent re-renders during drag

---

## Test Plan

### Unit Tests (for Option 2 implementation)

1. **getDisplayIndex function**
   - [ ] Returns original index when not dragging
   - [ ] Returns overIndex for active item
   - [ ] Correctly shifts items when dragging down
   - [ ] Correctly shifts items when dragging up

### Integration Tests

1. **Real-time Badge Updates**
   - [ ] Badge numbers preview new order during drag
   - [ ] Badges revert if drag is cancelled
   - [ ] Badges confirm new order after drop

---

## Dependencies

- **Phase 1** must be completed first (extended droppable area)
- **Phase 2** must be completed (ordinal badges)
- **Phase 3** should be completed (drop indicators)

---

## Estimated Complexity: MEDIUM

- Implementation: 1-2 hours
- Testing: 1 hour

## Status: OPTIONAL ENHANCEMENT

This phase can be deferred until user feedback indicates real-time badge updates are needed.
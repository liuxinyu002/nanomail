# Phase 1: Extend Droppable Area to Full Column Height

## Overview

Enhance the Board column droppable functionality with improved UX: extended drag area, dynamic height, sortable task badges, and better visual feedback during drag operations.

## Requirements Addressed

### R1: Extended Drag Area
- Droppable zone must cover the **entire content area** of a column (not just a fixed minimum height)
- Empty spaces at the bottom of a column should still respond to drop events
- Users should not need precise targeting when dropping tasks

### R2: Dynamic Column Height
- Column height should be determined by the number of tasks (naturally expanded)
- No fixed height constraints that create unnecessary scrolling
- **Must use `flex-1` + `h-full` to fill entire column space**, not just `min-h-[100px]`

---

## Current Architecture Analysis

### Affected Components

| Component | File | Current State | Required Change |
|-----------|------|---------------|-----------------|
| `BoardColumnDroppable` | `features/todos/BoardColumnDroppable.tsx` | Droppable zone limited to content wrapper | Extend to full column height with `flex-1 h-full` |

### Current vs Target Structure

```
// BEFORE: Fixed minimum height
<div className="flex-1 min-h-[100px] relative">

// AFTER: Full column height
BoardColumnDroppable (flex flex-col h-full)
├── ColumnHeader
└── Card Area (flex-1 h-full, with ref={setNodeRef}) ← Droppable fills remaining space
    ├── Color Overlay (absolute, pointer-events-none)
    └── Content Layer (relative z-10)
        └── SortableContext
            └── DraggableTodoItem × N
```

---

## Implementation Details

**File**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`

**Problem**: Current `min-h-[100px]` only covers a small area, not the entire column.

**Solution**: Use `flex-1 h-full` on the droppable container to fill all available space.

**Changes**:

1. Restructure layout hierarchy:
   ```
   BoardColumnDroppable (flex flex-col h-full)
   ├── ColumnHeader
   └── Card Area (flex-1 h-full, with ref={setNodeRef}) ← Droppable fills remaining space
       ├── Color Overlay (absolute, pointer-events-none)
       └── Content Layer (relative z-10)
           └── SortableContext
               └── DraggableTodoItem × N
   ```

2. **Remove visual dimming on drag-over**:
   - Delete `isOver && 'bg-gray-100'` styling
   - Keep subtle indicator if needed (e.g., `ring-2 ring-blue-200` or drop indicator)

3. **Height behavior**:
   ```tsx
   // BEFORE: Fixed minimum height
   <div className="flex-1 min-h-[100px] relative">

   // AFTER: Full column height
   <div
     ref={setNodeRef}
     className={cn(
       'flex-1 h-full flex flex-col relative',
       // NO isOver background dimming
     )}
   >
   ```

**Code Changes**:

```tsx
// BoardColumnDroppable.tsx
<div
  ref={setNodeRef}
  data-testid="card-area"
  className={cn(
    'flex-1 h-full flex flex-col relative overflow-auto'
    // REMOVED: isOver && 'bg-gray-100' — no column-wide dimming
  )}
>
  {/* Color overlay - pointer-events-none ensures it doesn't block drops */}
  <div className="absolute inset-0 pointer-events-none ...color-overlay..." />

  {/* Content layer */}
  <div className="relative z-10 p-3 flex-1 flex flex-col gap-2">
    <SortableContext items={todos} strategy={verticalListSortingStrategy}>
      {todos.map((todo, index) => (
        <DraggableTodoItem key={todo.id} todo={todo} index={index} />
      ))}
    </SortableContext>
  </div>
</div>
```

---

## Technical Specifications

### Column Layout

| Property | Value | Rationale |
|----------|-------|-----------|
| Container | `flex-1 h-full flex flex-col` | Fills entire column height |
| Content | `flex-1 flex flex-col gap-2` | Stretches to fill |
| Overflow | `overflow-auto` | Scroll if too many items |

---

## Test Plan

### Unit Tests

1. **BoardColumnDroppable**
   - [ ] Droppable zone uses `flex-1 h-full` for full column coverage
   - [ ] NO `bg-gray-100` applied on `isOver` state
   - [ ] Empty column still accepts drops

### Integration Tests

1. **Full Column Coverage**
   - [ ] Drop into empty space at bottom of column works
   - [ ] No need for precise targeting

---

## Dependencies

- None (this is the first phase)

## Next Phase

After completing this phase, proceed to **Phase 2: Internal Ordinal Badge with Hover-to-Drag Interaction**.

---

## Estimated Complexity: LOW

- Implementation: 1 hour
- Testing: 30 minutes
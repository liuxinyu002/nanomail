# Phase 2: Internal Ordinal Badge with Hover-to-Drag Interaction

## Overview

This phase implements sortable task badges with a hover-swap interaction pattern, where the ordinal badge (1., 2., 3...) is replaced by a drag handle on hover.

## Requirements Addressed

### R3: Sortable Task Badges
- Display numeric badges (1, 2, 3...) indicating task order within a column
- Badge **integrated into TodoCardHeader** (not external horizontal layout)
- **Lightweight styling**: No background, just muted text (e.g., `text-gray-400`)
- **Hover interaction**: Default shows ordinal number, hover reveals drag handle

---

## Current Architecture Analysis

### Affected Components

| Component | File | Current State | Required Change |
|-----------|------|---------------|-----------------|
| `DraggableTodoItem` | `features/todos/DraggableTodoItem.tsx` | External drag handle | Move handle logic into TodoCardHeader |
| `TodoCardHeader` | `features/todos/TodoCard/TodoCardHeader.tsx` | Checkbox + title layout | Add ordinal badge + hover-drag-handle interaction |
| `TodoItem` | `features/todos/TodoItem.tsx` | Standard props | Forward ordinal and drag props |

### Current vs Target Structure

```
// BEFORE: External badge + handle (horizontal spread)
DraggableTodoItem
├── Badge (external)
├── Drag Handle (external)
└── TodoItem

// AFTER: Internal badge + hover handle (compact)
DraggableTodoItem
└── TodoItem
    └── TodoCardHeader
        ├── Ordinal Badge (default) / Drag Handle (hover)  ← Same slot, swap on hover
        ├── Checkbox
        └── Title
```

---

## Implementation Details

### Design Decision: Hover-Swap Pattern

| State | Visible Element | Behavior |
|-------|-----------------|----------|
| Default | Ordinal badge (1., 2., ...) | Muted text, no background |
| Hover | Drag handle icon | Replaces ordinal badge in same position |
| Dragging | Drag handle icon | Remains visible during drag |

**Why this approach**:
- No horizontal space waste
- Badge and handle share the same slot
- Clean, minimal UI
- Intuitive interaction model

---

### File Changes

#### 1. DraggableTodoItem.tsx: Pass index and drag listeners down

**File**: `packages/frontend/src/features/todos/DraggableTodoItem.tsx`

```tsx
interface DraggableTodoItemProps {
  todo: TodoItemType
  index: number  // NEW: for ordinal display
  showDelete?: boolean
}

export function DraggableTodoItem({ todo, index, showDelete }: DraggableTodoItemProps) {
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
    <div ref={setNodeRef} style={style}>
      <TodoItem
        todo={todo}
        showDelete={showDelete}
        ordinal={index + 1}  // NEW: pass ordinal number
        dragHandleProps={{ ...attributes, ...listeners }}  // NEW: pass drag controls
      />
    </div>
  )
}
```

---

#### 2. TodoItem.tsx: Forward new props to TodoCardHeader

**File**: `packages/frontend/src/features/todos/TodoItem.tsx`

```tsx
interface TodoItemProps {
  todo: TodoItemType
  showDelete?: boolean
  ordinal?: number  // NEW: optional ordinal number
  dragHandleProps?: Record<string, unknown>  // NEW: optional drag handle props
}

export function TodoItem({ todo, showDelete, ordinal, dragHandleProps }: TodoItemProps) {
  return (
    <TodoCard>
      <TodoCardHeader
        todo={todo}
        ordinal={ordinal}
        dragHandleProps={dragHandleProps}
      />
      {/* ... other content */}
    </TodoCard>
  )
}
```

---

#### 3. TodoCardHeader.tsx: Implement hover-swap pattern

**File**: `packages/frontend/src/features/todos/TodoCard/TodoCardHeader.tsx`

```tsx
import { useState } from 'react'
import { GripVertical } from 'lucide-react'

interface TodoCardHeaderProps {
  todo: TodoItemType
  ordinal?: number
  dragHandleProps?: Record<string, unknown>
}

export function TodoCardHeader({ todo, ordinal, dragHandleProps }: TodoCardHeaderProps) {
  const [isHovered, setIsHovered] = useState(false)
  const showDragHandle = isHovered && dragHandleProps

  return (
    <div
      className="flex items-center gap-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ordinal Badge / Drag Handle - same slot, swap on hover */}
      <div className="shrink-0 w-6 flex items-center justify-center">
        {showDragHandle ? (
          <button
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-xs text-gray-400 font-medium tabular-nums">
            {ordinal}.
          </span>
        )}
      </div>

      {/* Checkbox */}
      <Checkbox checked={todo.completed} onChange={...} />

      {/* Title */}
      <span className="flex-1 truncate">{todo.title}</span>
    </div>
  )
}
```

---

## Technical Specifications

### Ordinal Badge Styling

| Property | Value | Rationale |
|----------|-------|-----------|
| Text | `{ordinal}.` | Ordinal format (1., 2., 3.) |
| Color | `text-gray-400` | Muted, non-distracting |
| Font Size | `text-xs` | Compact |
| Font Weight | `font-medium` | Sufficient contrast |
| Width | `w-6` | Fixed width for alignment |
| Background | None | Lightweight, no visual weight |
| `tabular-nums` | Yes | Prevents number width shift |

### Drag Handle Styling

| Property | Value | Rationale |
|----------|-------|-----------|
| Size | `w-4 h-4` | Standard icon size |
| Color | `text-gray-400 hover:text-gray-600` | Same slot as badge |
| Cursor | `cursor-grab active:cursor-grabbing` | Intuitive grab affordance |
| Background | None | Clean, minimal |

---

## Test Plan

### Unit Tests

1. **TodoCardHeader**
   - [ ] Renders ordinal badge by default (e.g., "1.")
   - [ ] Badge uses lightweight styling (no background, gray text)
   - [ ] Hover reveals drag handle, hides badge
   - [ ] Drag handle has `cursor-grab` style

2. **DraggableTodoItem**
   - [ ] Passes ordinal to TodoItem
   - [ ] Passes drag handle props to TodoItem

### Integration Tests

1. **Drag and Drop Flow**
   - [ ] Drag handle appears on hover
   - [ ] Reorder tasks within column → badges update after drop

---

## Dependencies

- **Phase 1** must be completed first (extended droppable area)

## Next Phase

After completing this phase, proceed to **Phase 3: Drop Indicator for Sortable Context**.

---

## Estimated Complexity: MEDIUM

- Implementation: 2 hours
- Testing: 1 hour
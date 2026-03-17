# Plan 1: To-Do Module Refactoring - Phase 2: Frontend Drag-and-Drop Setup

**Project**: NanoMail - Email client application
**Date**: 2026-03-17
**Phase**: 2 of 5
**Estimated Time**: 4-5 hours

---

## Context & Background

### Project Overview

Refactor the existing To-Do module from a simple urgency-based list view to a multi-panel interface with Inbox, Planner (calendar), and Kanban Board views, supporting drag-and-drop between views.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  TodosPage (Refactored)                                              │
├──────────────────────┬─────────────────────┬────────────────────────┤
│  InboxPanel          │  PlannerPanel       │  BoardPanel            │
│  (Droppable)         │  (Droppable)        │  (Droppable x 3)       │
│                      │                     │                        │
│  - DraggableTodoItem │  - CalendarGrid     │  - BoardColumn x 3     │
│  - Filtered: no      │  - DraggableDate    │  - DraggableTodoItem   │
│    columnId AND      │  - Drop sets        │  - Drop updates        │
│    no deadline       │    deadline         │    columnId + position │
├──────────────────────┴─────────────────────┴────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ViewToggle: [◉ Inbox] [○ Planner] [◉ Board]  (Pill-style)       ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Technical Decisions

- **Drag Library**: dnd-kit (multi-container support, accessibility-first)
- **State Management**: TanStack Query + local UI state
- **Animation**: CSS Transitions with Tailwind
- **Database**: SQLite with TypeORM (synchronize mode in dev)

### Default Column Structure

```typescript
const DEFAULT_COLUMNS = [
  { id: 1, name: '收件箱', order: 0, isSystem: true },  // Inbox - 系统默认，不可删除
  { id: 2, name: '待处理', order: 1 },                   // Todo
  { id: 3, name: '进行中', order: 2 },                   // In Progress
  { id: 4, name: '已完成', order: 3 },                   // Done
]
```

---

## Objective

Install dnd-kit and create core drag-and-drop infrastructure.

---

## Tasks

### Task 2.1: Install Dependencies

```bash
pnpm --filter @nanomail/frontend add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Task 2.2: Create DnD Context Provider

**File**: `packages/frontend/src/contexts/DndContext.tsx`

Create a context wrapper that:
- Wraps `DndContext` from dnd-kit
- Provides drag state to child components
- Handles drag end events and dispatches updates

**Key Implementation Points**:
- Use sensors for pointer/keyboard support
- Configure collision detection strategy
- Expose drag state via context

### Task 2.3: Create DraggableTodoItem

**File**: `packages/frontend/src/features/todos/DraggableTodoItem.tsx`

Wrap existing `TodoItem` with:
- `useDraggable` hook from dnd-kit
- Drag handle styling
- Visual feedback during drag

**Implementation Pattern**:
```typescript
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface DraggableTodoItemProps {
  todo: Todo
}

export function DraggableTodoItem({ todo }: DraggableTodoItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    data: {
      type: 'todo',
      todo,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TodoItem todo={todo} />
    </div>
  )
}
```

### Task 2.4: Create DroppableZone

**File**: `packages/frontend/src/features/todos/DroppableZone.tsx`

Generic droppable zone component:
- `useDroppable` hook integration
- Visual indicator when item hovers
- Accept configuration (which item types)

**Implementation Pattern**:
```typescript
import { useDroppable } from '@dnd-kit/core'

interface DroppableZoneProps {
  id: string | number
  type: 'inbox' | 'planner' | 'board'
  columnId?: number
  date?: string
  children: React.ReactNode
}

export function DroppableZone({ id, type, columnId, date, children }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type,
      columnId,
      date,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors duration-200',
        isOver && 'bg-blue-50 ring-2 ring-blue-300'
      )}
    >
      {children}
    </div>
  )
}
```

### Task 2.5: Create Position Utilities

**File**: `packages/frontend/src/utils/todoPosition.ts`

```typescript
export const POSITION_STEP = 65536
export const REBALANCE_THRESHOLD = 10

/**
 * Calculate position for inserting between two items
 * Uses large-integer algorithm for stable ordering
 */
export function calculateInsertPosition(
  prev: number | null,
  next: number | null
): number {
  if (prev === null && next === null) {
    return POSITION_STEP // First item in empty list
  }
  if (prev === null) {
    return next! / 2 // Insert at start
  }
  if (next === null) {
    return prev + POSITION_STEP // Insert at end
  }
  return (prev + next) / 2 // Insert between
}

/**
 * Check if positions need rebalancing (values too close)
 */
export function needsRebalance(positions: number[]): boolean {
  if (positions.length < 2) return false

  const sorted = [...positions].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < REBALANCE_THRESHOLD) {
      return true
    }
  }
  return false
}

/**
 * Generate new positions for rebalancing
 */
export function rebalancePositions(
  count: number,
  start: number = 0,
  step: number = POSITION_STEP
): number[] {
  return Array.from({ length: count }, (_, i) => start + (i + 1) * step)
}
```

---

## External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@dnd-kit/core` | ^6.x | Core drag-and-drop primitives |
| `@dnd-kit/sortable` | ^8.x | Sortable list functionality |
| `@dnd-kit/utilities` | ^3.x | Helper utilities |

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | MODIFY | Add dnd-kit dependencies |
| `contexts/DndContext.tsx` | CREATE | Context wrapper for dnd-kit |
| `features/todos/DraggableTodoItem.tsx` | CREATE | Draggable wrapper for TodoItem |
| `features/todos/DroppableZone.tsx` | CREATE | Generic droppable container |
| `utils/todoPosition.ts` | CREATE | Position calculation utilities |

---

## Success Criteria

1. dnd-kit packages installed successfully
2. DnD Context provider wraps TodosPage
3. DraggableTodoItem renders and can be dragged
4. DroppableZone accepts drops with visual feedback
5. Position utilities calculate correct values

---

## Dependencies

- **Requires**: Phase 1 (Backend Foundation) - needs backend API endpoints
- **Enables**: Phase 3 (UI Components)

---

## Next Phase

After completing this phase, proceed to **Phase 3: UI Components**.
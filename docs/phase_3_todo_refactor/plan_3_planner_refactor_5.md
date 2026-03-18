# Plan 3 Phase 5: Drag-Drop Integration

> Part of: Planner Component Refactor
> Previous: Phase 4 (PlannerPanel Integration)
> Next: Phase 6 (DragOverlay Implementation)

---

## Project Overview

Refactor the PlannerPanel component from a monthly calendar view to a dual-view scheduler with Day View (default) and Week View. Implement 24-hour timeline visualization with drag-drop support for scheduling tasks from Inbox to Planner.

---

## Requirements Summary

### Data Model
- Reuse existing `deadline` field for time positioning
- On drag from Inbox to Planner:
  - Set `deadline` to the target datetime
  - Change `boardColumnId = 2` (Todo column)
- Three-panel linkage: Optimistic Update (card disappears from Inbox, appears in Planner + Board)

### Drag Animation (@dnd-kit only)
- Drag feedback: `shadow-lg` + `scale(0.95)` on dragged item
- Placeholder: themed border empty box (`border-2 border-dashed border-gray-300`)
- Use `DragOverlay` for natural transitions during drag
- No external animation libraries

### Three-Panel Drag-Drop Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Inbox    │ ──► │   Planner   │ ──► │    Board    │
│ (no column) │     │ (deadline)  │     │ (column 2)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                     Optimistic Update
```

When a todo is dragged from Inbox to Planner hour slot:
1. **Todo disappears from Inbox** (boardColumnId changes)
2. **Todo appears in Planner** (deadline is set)
3. **Todo appears in Board** (boardColumnId = 2)

---

## Architecture

### Data Flow
```
TodosPage
  └── handleDragEnd
        ├── case 'inbox': Update boardColumnId only
        ├── case 'board': Update boardColumnId only
        └── case 'planner': Update deadline + boardColumnId = 2
              │
              ├── API call: PATCH /api/todos/:id
              └── Optimistic update via React Query
```

### Droppable Zone Types
```typescript
type DroppableType = 'inbox' | 'planner' | 'board'

interface DroppableData {
  type: DroppableType
  columnId?: number      // For board columns
  date?: string          // For planner slots (YYYY-MM-DD)
  hour?: number          // For planner hour slots (0-23)
}
```

---

## Phase 5 Tasks (2 files)

### Step 5.1: Update TodosPage drag handler

- **File**: `packages/frontend/src/pages/TodosPage.tsx`
- **Action**: Update handleDragEnd to support Planner hour-slot drops
- **Why**: Enable drag from Inbox to specific time slots
- **Dependencies**: Phase 2 (DayView), Phase 3 (WeekView), Phase 4 (PlannerPanel)
- **Risk**: High

**Changes to handleDragEnd**:

The existing `handleDragEnd` function needs to handle the new 'planner' droppable type with hour-specific data.

```typescript
// In TodosPage.tsx

const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, over } = event

  if (!over) return

  const activeData = active.data.current
  const overData = over.data.current

  if (!activeData || !overData) return

  const todoId = activeData.todo?.id
  if (!todoId) return

  const updatePayload: Partial<TodoItem> = {}

  switch (overData.type) {
    case 'inbox':
      // Drop to Inbox: set boardColumnId to 1 (Inbox)
      updatePayload.boardColumnId = 1
      updatePayload.deadline = null // Clear deadline when moving to Inbox
      break

    case 'board':
      // Drop to Board column: set boardColumnId
      if (!overData.columnId) return
      updatePayload.boardColumnId = overData.columnId
      break

    case 'planner':
      // Drop to Planner hour slot: set deadline AND boardColumnId = 2
      if (!overData.date || overData.hour === undefined) return

      // Create ISO datetime from date + hour
      const targetDate = new Date(overData.date)
      targetDate.setHours(overData.hour, 0, 0, 0)

      updatePayload.deadline = targetDate.toISOString()
      updatePayload.boardColumnId = 2 // Move to Todo column
      break

    default:
      return
  }

  // Optimistic update via React Query mutation
  updateTodoMutation.mutate({
    id: todoId,
    data: updatePayload
  })
}, [updateTodoMutation])
```

**Key implementation details**:

1. **Extract droppable data**: Get `date` and `hour` from `overData`
2. **Create ISO datetime**: Combine date string + hour to create valid deadline
3. **Set boardColumnId = 2**: Move todo to "Todo" column on the Board
4. **Optimistic update**: React Query handles UI update before API response

---

### Step 5.2: Update DroppableZone type definition

- **File**: `packages/frontend/src/features/todos/DroppableZone.tsx`
- **Action**: Add `hour` field to droppable data
- **Why**: Support hour-specific drop targets in Planner
- **Dependencies**: None
- **Risk**: Low

**Changes**:
```typescript
// Existing interface
export interface DroppableZoneProps {
  id: string | number
  type: 'inbox' | 'planner' | 'board'
  columnId?: number
  date?: string
  hour?: number  // NEW: For hour-specific planner drops
  children: ReactNode
  className?: string
}

// Update useDroppable call
export function DroppableZone({ id, type, columnId, date, hour, children, className }: DroppableZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type,
      columnId,
      date,
      hour,  // NEW: Pass hour to droppable data
    },
  })

  // ... rest of component
}
```

**Note**: This change is backward compatible - existing usages without `hour` will continue to work.

---

## Implementation Details

### HourSlot Droppable Configuration

The `HourSlot` component (created in Phase 2) already sets up the droppable:

```tsx
// In HourSlot.tsx
const { setNodeRef, isOver } = useDroppable({
  id: `planner-hour-${format(date, 'yyyy-MM-dd')}-${hour}`,
  data: {
    type: 'planner',
    date: format(date, 'yyyy-MM-dd'),
    hour,
  },
})
```

### Optimistic Update Flow

```typescript
// In useTodos hook or TodosPage
const updateTodoMutation = useMutation({
  mutationFn: (params: { id: number; data: Partial<TodoItem> }) =>
    todoService.updateTodo(params.id, params.data),

  // Optimistic update
  onMutate: async ({ id, data }) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos'] })

    // Snapshot the previous value
    const previousTodos = queryClient.getQueryData(['todos'])

    // Optimistically update to the new value
    queryClient.setQueryData(['todos'], (old: TodoItem[]) =>
      old.map(todo => todo.id === id ? { ...todo, ...data } : todo)
    )

    return { previousTodos }
  },

  // Revert on error
  onError: (err, variables, context) => {
    queryClient.setQueryData(['todos'], context.previousTodos)
  },

  // Refetch after success
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

---

## Dependencies

### Phase 1-4 Dependencies (must be complete)
- All planner components (TimeAxis, HourSlot, DayView, WeekView, PlannerPanel)
- Existing drag-drop infrastructure in TodosPage

### External Dependencies (already installed)
- `@dnd-kit/core` - Drag-drop core
- `@tanstack/react-query` - For optimistic updates

### Internal Dependencies
- `@nanomail/shared` - Todo types and schemas
- `todoService` - API service for todo updates

---

## Risks & Mitigations

### Risk 1: Drag-Drop State Conflicts
- **Description**: Multiple droppable zones (Inbox, Board, Planner) could cause conflicts
- **Mitigation**: Use unique droppable IDs with clear prefixes ('inbox-', 'board-', 'planner-')

### Risk 2: Timezone Issues
- **Description**: Creating ISO datetime from local hour could cause timezone drift
- **Mitigation**: Ensure consistent timezone handling, use local time for display, UTC for storage

### Risk 3: Optimistic Update Race Conditions
- **Description**: Rapid consecutive drops could cause stale updates
- **Mitigation**: Use React Query's built-in deduplication and cancellation

### Risk 4: Three-Panel Sync Issues
- **Description**: Todo may not appear in all three panels after drop
- **Mitigation**: Ensure filters in each panel update based on same data source

---

## Testing Checklist

### Manual Testing
- [ ] Drag from Inbox to Planner DayView hour slot
- [ ] Drag from Inbox to Planner WeekView hour slot
- [ ] Verify todo disappears from Inbox
- [ ] Verify todo appears in Planner at correct time
- [ ] Verify todo appears in Board (Todo column)
- [ ] Drag between different hour slots
- [ ] Drag from Planner back to Inbox

### Automated Testing
- [ ] Unit test for handleDragEnd 'planner' case
- [ ] Integration test for full drag-drop flow
- [ ] Test timezone handling
- [ ] Test optimistic update rollback on error

---

## Success Criteria (Phase 5)

- [ ] `handleDragEnd` handles 'planner' droppable type
- [ ] Dropping on Planner hour slot creates correct deadline
- [ ] Dropping on Planner hour slot sets boardColumnId = 2
- [ ] Todo disappears from Inbox after drop
- [ ] Todo appears in Planner at correct hour
- [ ] Todo appears in Board (Todo column)
- [ ] Optimistic update works correctly
- [ ] Error handling reverts optimistic update
- [ ] No TypeScript errors

---

## Next Phase

Proceed to **Phase 6: DragOverlay Implementation** after completing Phase 5.
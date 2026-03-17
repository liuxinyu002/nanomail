# Plan 1: To-Do Module Refactoring - Phase 5: Integration and Testing

**Project**: NanoMail - Email client application
**Date**: 2026-03-17
**Phase**: 5 of 5
**Estimated Time**: 4-5 hours

---

## Context & Background

### Project Overview

Refactor the existing To-Do module from a simple urgency-based list view to a multi-panel interface with Inbox, Planner (calendar), and Kanban Board views, supporting drag-and-drop between views.

### Complete Architecture

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

### Drag-and-Drop Behavior Matrix

| Source → Target | Inbox (Column 1) | Planner | Board Column (2-4) |
|-----------------|------------------|---------|---------------------|
| **Inbox (Column 1)** | N/A | Set `deadline` | Set `boardColumnId` + `position` |
| **Planner** | Set `boardColumnId = 1` | Update `deadline` | Set `boardColumnId` + `position`, keep `deadline` |
| **Board Column (2-4)** | Set `boardColumnId = 1` | Set `deadline` (card rebounds) | Update `position`, optionally `boardColumnId` |

### Board → Planner Visual Interaction

> **Critical UX Pattern**: When dragging a task from Kanban Board to Planner:
>
> 1. **Visual Behavior**: The task card **must rebound** to its original position in the Kanban column
> 2. **Data Update**: Only the `deadline` field is updated; `boardColumnId` remains unchanged
> 3. **UI Refresh**: The Planner's date cell showing task count should update via React Query cache invalidation

```typescript
if (sourceType === 'board' && targetType === 'planner') {
  const date = over.data.current?.date

  // Update deadline only - task stays in its Kanban column
  updateMutation.mutate(
    { id: activeId, data: { deadline: date } },
    {
      onSuccess: () => {
        // Invalidate planner queries to refresh date cell indicators
        queryClient.invalidateQueries({ queryKey: ['todos', 'deadline'] })
        queryClient.invalidateQueries({ queryKey: ['calendar'] })
      }
    }
  )
  // No DOM manipulation - let dnd-kit handle the visual revert
}
```

### Optimistic Update Pattern

```
User Drag → onDragEnd
  → [1] Local UI Update (setQueryData) → Instant visual feedback
  → [2] Async Mutation → Backend API → DB Update
  → [3a] Success: invalidateQueries (sync with server)
  → [3b] Error: Rollback to snapshot, show error toast
```

---

## Objective

Integrate all components and ensure quality through comprehensive testing.

---

## Tasks

### Task 5.1: Integration Testing

Test all drag-and-drop scenarios per the behavior matrix:

**Test Scenarios**:
1. **Inbox → Board Column**: Task moves to target column, position is set
2. **Inbox → Planner**: Task deadline is set, task stays in Inbox
3. **Board Column → Inbox**: Task moves to Inbox (boardColumnId = 1)
4. **Board Column → Planner**: Task deadline is set, task rebounds to original column
5. **Board Column → Board Column**: Task moves to new column with correct position
6. **Within Same Column**: Task reorder with position update

**Verify**:
- Optimistic updates provide instant visual feedback
- Rollback works correctly on server error
- Position calculation handles edge cases (first, last, middle)
- Cache invalidation ensures eventual consistency

### Task 5.2: Unit Tests

**File**: `packages/frontend/src/utils/todoPosition.test.ts`

Test cases:
```typescript
describe('todoPosition utilities', () => {
  describe('calculateInsertPosition', () => {
    it('should return POSITION_STEP for empty list', () => {
      expect(calculateInsertPosition(null, null)).toBe(65536)
    })

    it('should calculate position at start', () => {
      expect(calculateInsertPosition(null, 1000)).toBe(500)
    })

    it('should calculate position at end', () => {
      expect(calculateInsertPosition(1000, null)).toBe(1000 + 65536)
    })

    it('should calculate position between items', () => {
      expect(calculateInsertPosition(1000, 2000)).toBe(1500)
    })
  })

  describe('needsRebalance', () => {
    it('should return false for empty list', () => {
      expect(needsRebalance([])).toBe(false)
    })

    it('should return true when positions are too close', () => {
      expect(needsRebalance([100, 105])).toBe(true)
    })

    it('should return false for well-spaced positions', () => {
      expect(needsRebalance([1000, 2000, 3000])).toBe(false)
    })
  })

  describe('rebalancePositions', () => {
    it('should generate evenly spaced positions', () => {
      const positions = rebalancePositions(3)
      expect(positions).toEqual([65536, 131072, 196608])
    })
  })
})
```

**File**: `packages/frontend/src/features/todos/DraggableTodoItem.test.tsx`

Test cases:
- Renders with correct drag attributes
- Shows visual feedback when dragging
- Prevents drag on completed items (if applicable)

**File**: `packages/backend/src/routes/todo.routes.test.ts` (extend existing)

Add tests for:
- `PATCH /api/todos/:id/position` endpoint
- `POST /api/todos/batch-position` endpoint
- Position validation and calculation
- Column assignment

### Task 5.3: E2E Tests

**File**: `tests/e2e/todos-drag-drop.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Todo Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todos')
  })

  test('should drag todo from Inbox to Board column', async ({ page }) => {
    // Create a todo in Inbox
    await page.click('[data-testid="add-todo"]')
    await page.fill('[data-testid="todo-title"]', 'Test Task')
    await page.click('[data-testid="save-todo"]')

    // Verify todo is in Inbox
    const inboxTodo = page.locator('[data-testid="inbox-panel"] [data-testid="todo-item"]')
    await expect(inboxTodo).toBeVisible()

    // Drag to Board column
    await inboxTodo.dragTo(page.locator('[data-testid="board-column-2"]'))

    // Verify todo moved to Board column
    const boardTodo = page.locator('[data-testid="board-column-2"] [data-testid="todo-item"]')
    await expect(boardTodo).toBeVisible()
    await expect(inboxTodo).not.toBeVisible()
  })

  test('should set deadline when dragging to Planner', async ({ page }) => {
    // Create todo in Board
    // ...

    // Drag to Planner date cell
    // ...

    // Verify deadline is set
    // ...
  })

  test('should maintain position after reorder', async ({ page }) => {
    // Create multiple todos
    // ...

    // Reorder within column
    // ...

    // Refresh page
    await page.reload()

    // Verify order is preserved
    // ...
  })

  test('should prevent deleting last active view', async ({ page }) => {
    // Start with all views active
    const inboxToggle = page.locator('[data-testid="toggle-inbox"]')

    // Deselect Planner and Board
    await page.click('[data-testid="toggle-planner"]')
    await page.click('[data-testid="toggle-board"]')

    // Try to deselect Inbox (last active view)
    await inboxToggle.click()

    // Verify Inbox is still visible
    await expect(page.locator('[data-testid="inbox-panel"]')).toBeVisible()
  })
})
```

### Task 5.4: Accessibility Audit

Ensure keyboard navigation works:

**Keyboard Navigation Tests**:
1. Tab through all interactive elements
2. Focus management during drag operations
3. Screen reader announcements during drag

**Accessibility Checklist**:
- [ ] All interactive elements have focus indicators
- [ ] Drag handles are keyboard accessible
- [ ] Screen reader announces drag start/end
- [ ] Focus moves logically after operations
- [ ] Color contrast meets WCAG 2.1 AA

**dnd-kit Accessibility**:
```typescript
// Ensure keyboard support in DndContext
<DndContext
  sensors={[
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  ]}
>
  {/* ... */}
</DndContext>
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Position integer overflow | Low | High | Implement rebalancing when threshold < 10 |
| Drag performance with many items | Medium | Medium | Virtualize long lists, debounce updates |
| TypeORM synchronize issues in prod | Medium | High | Create explicit migrations for prod |
| dnd-kit accessibility gaps | Low | Medium | Test with screen readers, add ARIA labels |
| State sync between panels | Low | High | TanStack Query cache as source of truth + optimistic updates |
| Board→Planner visual confusion | Medium | Medium | Clear rebound animation, cache-based refresh |
| Last toggle deselection | Medium | High | Block deselection in toggle handler |
| Optimistic update rollback failure | Low | High | Snapshot state before update, invalidate on error |
| Inbox Column deletion | Low | High | `isSystem: true` flag prevents deletion |

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `utils/todoPosition.test.ts` | CREATE | Unit tests for position utilities |
| `features/todos/DraggableTodoItem.test.tsx` | CREATE | Unit tests for draggable component |
| `routes/todo.routes.test.ts` | MODIFY | Add position endpoint tests |
| `tests/e2e/todos-drag-drop.spec.ts` | CREATE | E2E tests for drag-and-drop |

---

## Success Criteria

1. Users can drag todos between Inbox, Planner, and Board panels with **instant visual feedback**
2. Position updates are persisted and stable across page refreshes
3. At least one view is always visible (toggle blocks deselection of last active view)
4. Keyboard users can navigate and move todos
5. All existing todo functionality remains intact (urgency field deprecated)
6. 80%+ test coverage for new code
7. View toggle uses glassmorphism pill-style design (not dark/heavy navigation)
8. Panel expand/collapse uses smooth CSS transitions with `flex-1` auto-fill
9. Board → Planner drops show visual rebound, update only `deadline`, refresh via cache invalidation
10. **Optimistic updates with rollback**: Drag operations feel instant; errors gracefully revert UI
11. **Unified Inbox model**: Inbox is Column ID 1, no special `null` handling in drag logic
12. **Single source of truth**: Task status determined by `boardColumnId` only, no `urgency` field

---

## Complete Project Summary

### All File Changes

**Backend**:
| File | Action | Description |
|------|--------|-------------|
| `entities/BoardColumn.entity.ts` | CREATE | New entity for board columns |
| `entities/Todo.entity.ts` | MODIFY | Add boardColumnId, position, relation |
| `routes/boardColumn.routes.ts` | CREATE | CRUD endpoints for columns |
| `routes/todo.routes.ts` | MODIFY | Add position endpoints, update filters |
| `config/database.ts` | MODIFY | Add BoardColumn to entities, seed data |

**Shared**:
| File | Action | Description |
|------|--------|-------------|
| `schemas/boardColumn.ts` | CREATE | Zod schemas for BoardColumn |
| `schemas/todo.ts` | MODIFY | Add boardColumnId, position fields |
| `schemas/index.ts` | MODIFY | Export new schemas |

**Frontend**:
| File | Action | Description |
|------|--------|-------------|
| `services/boardColumn.service.ts` | CREATE | API client for board columns |
| `services/todo.service.ts` | MODIFY | Add position-related methods |
| `hooks/useBoardColumns.ts` | CREATE | React Query hooks for columns |
| `hooks/useTodoMutations.ts` | MODIFY | Add position mutation hooks |
| `utils/todoPosition.ts` | CREATE | Position calculation utilities |
| `features/todos/DraggableTodoItem.tsx` | CREATE | Draggable wrapper for TodoItem |
| `features/todos/DroppableZone.tsx` | CREATE | Generic droppable container |
| `features/todos/ViewToggle.tsx` | CREATE | Pill-style view toggles |
| `features/todos/InboxPanel.tsx` | CREATE | Inbox panel component |
| `features/todos/PlannerPanel.tsx` | CREATE | Calendar panel component |
| `features/todos/BoardPanel.tsx` | CREATE | Kanban board component |
| `features/todos/BoardColumnDroppable.tsx` | CREATE | Single column component |
| `pages/TodosPage.tsx` | MODIFY | Major refactor for new layout |
| `features/todos/index.ts` | MODIFY | Export new components |

### Total Complexity

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Phase 1: Backend | 3-4 hours | Medium |
| Phase 2: DnD Setup | 4-5 hours | High |
| Phase 3: UI Components | 5-6 hours | High |
| Phase 4: Services | 2-3 hours | Medium |
| Phase 5: Testing | 4-5 hours | Medium |
| **Total** | **18-23 hours** | **High** |

---

## Completion Checklist

After all 5 phases are complete:

- [ ] Backend API endpoints working
- [ ] Database schema migrated
- [ ] dnd-kit integrated
- [ ] All UI components created
- [ ] Services and hooks updated
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Accessibility audit complete
- [ ] Code review complete
- [ ] Documentation updated
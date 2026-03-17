# Plan 1: To-Do Module Refactoring - Phase 4: Service Layer Updates

**Project**: NanoMail - Email client application
**Date**: 2026-03-17
**Phase**: 4 of 5
**Estimated Time**: 2-3 hours

---

## Context & Background

### Project Overview

Refactor the existing To-Do module from a simple urgency-based list view to a multi-panel interface with Inbox, Planner (calendar), and Kanban Board views, supporting drag-and-drop between views.

### Data Flow (Optimistic Update Pattern)

```
User Drag → onDragEnd
  → [1] Local UI Update (setQueryData) → Instant visual feedback
  → [2] Async Mutation → Backend API → DB Update
  → [3a] Success: invalidateQueries (sync with server)
  → [3b] Error: Rollback to snapshot, show error toast
```

### Optimistic Update Pattern (CRITICAL)

> **CRITICAL: Optimistic Update Pattern**
>
> **问题**：直接在 drop 事件中读写 React Query Cache 容易导致卡片在拖拽松手的瞬间发生"闪烁"或"瞬移"。
>
> **正确的流转**：
> 1. **拖拽结束 (`onDragEnd`)** 时，优先触发**本地 UI 状态更新**
> 2. 使用 dnd-kit 提供的 `arrayMove` 操作本地的 `columns` 数组，让用户**瞬间看到卡片落位**
> 3. 同时触发 **Mutation** 发送异步请求更新数据库
> 4. 如果后端报错，再**回滚本地状态**

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

Update frontend services to support new API endpoints.

---

## Tasks

### Task 4.1: Update TodoService

**File**: `packages/frontend/src/services/todo.service.ts`

Add methods:
```typescript
async updateTodoPosition(id: number, data: UpdateTodoPosition): Promise<TodoItem>
async batchUpdatePositions(updates: Array<{id: number, position: number}>): Promise<void>
async getTodosByColumn(columnId: number): Promise<TodosResponse>  // Works for all columns including Inbox
```

> Note: No separate `getInboxTodos()` needed - Inbox is just Column ID 1

**Implementation Pattern**:
```typescript
import type { UpdateTodoPosition } from '@nanomail/shared'

class TodoService {
  async updateTodoPosition(id: number, data: UpdateTodoPosition): Promise<TodoItem> {
    const response = await fetch(`/api/todos/${id}/position`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update position')
    return response.json()
  }

  async batchUpdatePositions(
    updates: Array<{ id: number; position: number; boardColumnId?: number }>
  ): Promise<void> {
    const response = await fetch('/api/todos/batch-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    if (!response.ok) throw new Error('Failed to batch update positions')
  }

  async getTodosByColumn(columnId: number): Promise<TodosResponse> {
    const response = await fetch(`/api/todos?boardColumnId=${columnId}`)
    if (!response.ok) throw new Error('Failed to fetch todos')
    return response.json()
  }
}
```

### Task 4.2: Create BoardColumnService

**File**: `packages/frontend/src/services/boardColumn.service.ts`

Methods:
- `getBoardColumns()` - Fetch all columns
- `createBoardColumn()` - Create new column
- `updateBoardColumn()` - Update column
- `deleteBoardColumn()` - Delete column (blocked for system columns)

**Implementation Pattern**:
```typescript
import type { BoardColumn, CreateBoardColumn, UpdateBoardColumn } from '@nanomail/shared'

class BoardColumnService {
  private baseUrl = '/api/board-columns'

  async getBoardColumns(): Promise<BoardColumn[]> {
    const response = await fetch(this.baseUrl)
    if (!response.ok) throw new Error('Failed to fetch columns')
    return response.json()
  }

  async createBoardColumn(data: CreateBoardColumn): Promise<BoardColumn> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create column')
    return response.json()
  }

  async updateBoardColumn(id: number, data: UpdateBoardColumn): Promise<BoardColumn> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update column')
    return response.json()
  }

  async deleteBoardColumn(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete column')
    }
  }
}

export const boardColumnService = new BoardColumnService()
```

### Task 4.3: Update Hooks

**File**: `packages/frontend/src/hooks/useTodoMutations.ts`

Add:
- `useUpdateTodoPositionMutation()` - **Optimistic position updates with rollback**
- `useBatchUpdatePositionsMutation()` - Batch updates for rebalancing

**Important**: The mutation must implement optimistic update pattern:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { todoService } from '../services/todo.service'
import type { UpdateTodoPosition } from '@nanomail/shared'

export function useUpdateTodoPositionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { id: number; data: UpdateTodoPosition }) =>
      todoService.updateTodoPosition(params.id, params.data),

    // Optimistic update happens BEFORE mutation (in onDragEnd)
    // This hook is called after local state already updated

    onError: (err, variables, context) => {
      // Rollback is handled by the caller with snapshot
      console.error('Failed to update todo position:', err)
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })
}

export function useBatchUpdatePositionsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Array<{ id: number; position: number; boardColumnId?: number }>) =>
      todoService.batchUpdatePositions(updates),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })
}
```

**File**: `packages/frontend/src/hooks/useBoardColumns.ts` (NEW)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardColumnService } from '../services/boardColumn.service'
import type { CreateBoardColumn, UpdateBoardColumn } from '@nanomail/shared'

export function useBoardColumns() {
  return useQuery({
    queryKey: ['boardColumns'],
    queryFn: () => boardColumnService.getBoardColumns(),
  })
}

export function useCreateBoardColumnMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBoardColumn) => boardColumnService.createBoardColumn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardColumns'] })
    }
  })
}

export function useUpdateBoardColumnMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBoardColumn }) =>
      boardColumnService.updateBoardColumn(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardColumns'] })
    }
  })
}

export function useDeleteBoardColumnMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => boardColumnService.deleteBoardColumn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardColumns'] })
    }
  })
}
```

---

## Drag Handler Implementation Pattern

```typescript
import { arrayMove } from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'

function useTodoDragDrop() {
  const queryClient = useQueryClient()
  const updateMutation = useUpdateTodoPositionMutation()

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const sourceType = active.data.current?.type
    const targetType = over.data.current?.type
    const activeId = Number(active.id)

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: OPTIMISTIC LOCAL UPDATE (instant visual feedback)
    // ═══════════════════════════════════════════════════════════════

    if (targetType === 'board' || sourceType === 'board') {
      const targetColumnId = over.data.current?.columnId ?? 1

      // Cancel any ongoing refetches to prevent race conditions
      queryClient.cancelQueries({ queryKey: ['todos'] })

      // Snapshot current state for potential rollback
      const previousTodos = queryClient.getQueryData(['todos'])

      // Optimistically update local cache
      queryClient.setQueryData(['todos'], (old: Todo[] | undefined) => {
        if (!old) return old

        const todoIndex = old.findIndex(t => t.id === activeId)
        if (todoIndex === -1) return old

        const newTodos = [...old]
        const [movedTodo] = newTodos.splice(todoIndex, 1)

        // Calculate new position (simplified for example)
        const newPosition = calculateInsertPosition(
          findPrevPosition(newTodos, targetColumnId, over.id),
          findNextPosition(newTodos, targetColumnId, over.id)
        )

        // Update the moved todo
        newTodos.push({
          ...movedTodo,
          boardColumnId: targetColumnId,
          position: newPosition
        })

        return newTodos
      })

      // ═══════════════════════════════════════════════════════════════
      // STEP 2: ASYNC SERVER UPDATE with ROLLBACK on error
      // ═══════════════════════════════════════════════════════════════

      const targetColumnId = over.data.current?.columnId ?? 1
      const newPosition = calculateNewPosition(/* ... */)

      updateMutation.mutate(
        {
          id: activeId,
          data: { boardColumnId: targetColumnId, position: newPosition }
        },
        {
          onError: (error) => {
            // ROLLBACK: Restore previous state on error
            queryClient.setQueryData(['todos'], previousTodos)
            console.error('Failed to update todo position:', error)
            // Optional: Show toast notification to user
          },
          onSettled: () => {
            // Refetch to ensure sync with server
            queryClient.invalidateQueries({ queryKey: ['todos'] })
          }
        }
      )
    }

    // Handle Planner drops (deadline updates)
    if (targetType === 'planner') {
      const date = over.data.current?.date

      // Optimistic update
      queryClient.setQueryData(['todos'], (old: Todo[] | undefined) => {
        if (!old) return old
        return old.map(t =>
          t.id === activeId ? { ...t, deadline: date } : t
        )
      })

      updateMutation.mutate(
        { id: activeId, data: { deadline: date } },
        {
          onError: () => {
            // Rollback handled by onSettled refetch
            queryClient.invalidateQueries({ queryKey: ['todos'] })
          }
        }
      )
    }
  }

  return { handleDragEnd }
}
```

### Key Points

1. **`queryClient.cancelQueries()`** - Cancel ongoing refetches before optimistic update
2. **Snapshot previous state** - Store for rollback on error
3. **`setQueryData` for instant update** - User sees change immediately
4. **Mutation with `onError` rollback** - Handle server failures gracefully
5. **`invalidateQueries` on settled** - Ensure eventual consistency

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `services/boardColumn.service.ts` | CREATE | API client for board columns |
| `services/todo.service.ts` | MODIFY | Add position-related methods |
| `hooks/useBoardColumns.ts` | CREATE | React Query hooks for columns |
| `hooks/useTodoMutations.ts` | MODIFY | Add position mutation hooks |

---

## Success Criteria

1. TodoService has position update methods
2. BoardColumnService has full CRUD methods
3. Hooks implement optimistic update pattern
4. Rollback works correctly on error
5. Cache invalidation ensures eventual consistency

---

## Dependencies

- **Requires**: Phase 1 (Backend Foundation), Phase 2 (DnD Setup), Phase 3 (UI Components)
- **Enables**: Phase 5 (Testing)

---

## Next Phase

After completing this phase, proceed to **Phase 5: Integration and Testing**.
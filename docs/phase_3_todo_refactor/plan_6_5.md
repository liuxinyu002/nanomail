# Plan 6 Phase 5: Frontend - Interaction Updates

> Part of: Phase 3 Todo Refactor - [Plan 6 Overview](./plan_6.md)

## Overview

实现 Todo 分组颜色同步功能，使 Board 列的颜色能够体现在 UI 的各个层面。采用**关系映射**架构，通过 JOIN 查询动态获取颜色，避免数据冗余和同步复杂度。

### 核心需求

| # | 需求 | 描述 |
|---|------|------|
| 1 | Board 列颜色 UI | 更改颜色时更新头部背景，移除颜色徽标 |
| 2 | Todo 颜色字段 | **API 响应中动态计算**，不物理存储 |
| 3 | Planner 颜色指示栏 | 左侧颜色条读取 Todo 的 color 字段 |

---

## Phase 5: Frontend - Interaction Updates

> Risk: Low
> Dependencies: Phase 1, 2, 3, 4

### Task 5.1: Column Color Change Interaction

**诊断**：后端现在只在 BoardColumn 表更新一条记录，不再批量同步 Todo。

**文件**: `packages/frontend/src/features/todos/BoardPanel.tsx` 或相关父组件

**操作**: 修改列颜色时，只需 invalidate todos 查询，API 会通过 JOIN 返回最新颜色

```typescript
const handleUpdateColumn = async (columnId: number, data: { name?: string; color?: string | null }) => {
  await updateColumnMutation.mutateAsync({ id: columnId, data })

  // Backend only updates BoardColumn record
  // Invalidate todos to refetch with JOIN'd color from API
  queryClient.invalidateQueries({ queryKey: ['todos'] })
}
```

**效果**：
- 极速响应（只更新一条记录）
- 前端重新 fetch 后，所有 Todo 颜色瞬间同步

---

### Task 5.2: Drag-and-Drop Interaction

**文件**: 前端拖拽处理逻辑

**操作**: 拖拽 Todo 到新列后，重新 fetch 或乐观更新

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event

  if (!over) return

  const activeTodo = active.data.current?.todo
  const overData = over.data.current

  const newColumnId = overData?.columnId ?? overData?.boardColumnId
  const columnChanged = activeTodo.boardColumnId !== newColumnId

  if (columnChanged) {
    // Option A: Invalidate and refetch (simple, reliable)
    await updateTodoPosition({
      id: activeTodo.id,
      boardColumnId: newColumnId,
      position: newPosition
    })
    queryClient.invalidateQueries({ queryKey: ['todos'] })

    // Option B: Optimistic update (smoother UX)
    // const newColumn = columns.find(c => c.id === newColumnId)
    // queryClient.setQueryData(['todos'], (old) => ({
    //   ...old,
    //   todos: old.todos.map(t =>
    //     t.id === activeTodo.id
    //       ? { ...t, boardColumnId: newColumnId, color: newColumn?.color ?? null }
    //       : t
    //   )
    // }))
  } else {
    // Same column, just update position
    // ... existing position update logic ...
  }
}
```

**Note**: 推荐先用 Option A（invalidate），稳定后再考虑乐观更新优化。

---

### Task 5.3: Verify useUpdateTodoMutation Hook

**File**: `packages/frontend/src/hooks/useTodos.ts`

**Action**: Ensure invalidation includes color update

```typescript
export function useUpdateTodoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTodo }) =>
      TodoService.updateTodo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
```

**Note**: Already should work correctly - just verify invalidation happens.

---

## Files Changed (Phase 5)

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/BoardPanel.tsx` | MODIFY |
| `packages/frontend/src/hooks/useTodos.ts` | VERIFY |

---

## Testing Checklist (Phase 5)

- [ ] Column color change triggers todos refetch
- [ ] Drag to new column triggers todos refetch

---

## Integration Tests

- [ ] End-to-end: Create todo → verify color matches column (via JOIN)
- [ ] End-to-end: Change column color → verify all todos update after refetch
- [ ] End-to-end: Drag todo to new column → verify color updates after refetch
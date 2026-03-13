# Plan 6 - Phase 5: React Query Hooks

> **阶段目标**: 创建日期范围查询 Hook 与乐观更新 Mutation Hooks
> **预估时间**: 1h
> **前置依赖**: Phase 3 完成（前端 Service 已扩展）

---

## 任务上下文

日历视图需要高效的数据管理：

1. **日期范围查询** - 自动计算日历网格（42天）的日期范围，触发 API 查询
2. **乐观更新** - 用户编辑/删除任务时立即更新 UI，不等待网络响应

### 乐观更新的重要性

用户体验目标：**极致流畅**

- 用户修改 deadline → UI 立即更新，无需 Loading
- 用户删除任务 → 任务立即从列表移除
- 如果 API 失败 → 自动回滚并提示用户

---

## 任务清单

### 1. 创建日期范围查询 Hook

**文件**: `packages/frontend/src/hooks/useTodosByDateRange.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { TodoService } from '@/services'
import {
  startOfMonth,
  startOfWeek,
  addDays,
  format,
} from 'date-fns'

/**
 * 获取 42 天网格范围的 todos
 * 日历视图显示 6 周 = 42 天
 */
export function useTodosByDateRange(date: Date) {
  // 计算日历网格范围
  const monthStart = startOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // 周日开始
  const calendarEnd = addDays(calendarStart, 41)

  const startDate = format(calendarStart, 'yyyy-MM-dd')
  const endDate = format(calendarEnd, 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['todos', startDate, endDate],
    queryFn: () => TodoService.getTodosByDateRange({ startDate, endDate }),
    staleTime: 1000 * 60 * 5, // 5 分钟内不重新获取
  })
}
```

**使用场景**:
```typescript
// 在 TodoCalendar 组件中
const [currentMonth, setCurrentMonth] = useState(new Date())
const { data, isLoading } = useTodosByDateRange(currentMonth)
```

### 2. 创建更新 Todo 的乐观更新 Hook

**文件**: `packages/frontend/src/hooks/useTodoMutations.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TodoService } from '@/services'
import type { TodoItem, UpdateTodo } from '@nanomail/shared'

interface MutationContext {
  previousTodos: { todos: TodoItem[] } | undefined
  queryKey: unknown[]
}

/**
 * 更新 Todo 的乐观更新 Hook
 */
export function useUpdateTodoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTodo }) =>
      TodoService.updateTodo(id, data),

    // 乐观更新：立即修改缓存
    onMutate: async ({ id, data }): Promise<MutationContext> => {
      // 1. 找到包含该 todo 的所有查询
      const queryCache = queryClient.getQueryCache()
      const todoQueries = queryCache.findAll({ queryKey: ['todos'] })

      // 2. 取消正在进行的查询，防止覆盖乐观更新
      await Promise.all(
        todoQueries.map(query => queryClient.cancelQueries(query.queryKey))
      )

      // 3. 保存旧的缓存数据用于回滚
      const previousTodos = todoQueries[0]?.state?.data as { todos: TodoItem[] } | undefined
      const queryKey = todoQueries[0]?.queryKey || []

      // 4. 乐观更新所有相关缓存
      todoQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: { todos: TodoItem[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            todos: old.todos.map(todo =>
              todo.id === id ? { ...todo, ...data } : todo
            ),
          }
        })
      })

      return { previousTodos, queryKey }
    },

    // 错误时回滚
    onError: (err, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(context.queryKey, context.previousTodos)
      }
      // TODO: 可选添加 Toast 提示用户操作失败
    },

    // 成功后重新获取数据确保一致性
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
```

### 3. 创建删除 Todo 的乐观更新 Hook

```typescript
/**
 * 删除 Todo 的乐观更新 Hook
 */
export function useDeleteTodoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => TodoService.deleteTodo(id),

    onMutate: async (id): Promise<MutationContext> => {
      const queryCache = queryClient.getQueryCache()
      const todoQueries = queryCache.findAll({ queryKey: ['todos'] })

      await Promise.all(
        todoQueries.map(query => queryClient.cancelQueries(query.queryKey))
      )

      const previousTodos = todoQueries[0]?.state?.data as { todos: TodoItem[] } | undefined
      const queryKey = todoQueries[0]?.queryKey || []

      // 乐观删除：从缓存中移除
      todoQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: { todos: TodoItem[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            todos: old.todos.filter(todo => todo.id !== id),
          }
        })
      })

      return { previousTodos, queryKey }
    },

    onError: (err, id, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(context.queryKey, context.previousTodos)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
```

---

## 使用示例

在 TodoDayDrawer 或 TodoEditForm 中使用：

```typescript
const updateMutation = useUpdateTodoMutation()
const deleteMutation = useDeleteTodoMutation()

// 修改 deadline 时立即生效
const handleDeadlineChange = (newDeadline: Date) => {
  updateMutation.mutate({
    id: todo.id,
    data: { deadline: newDeadline.toISOString() }
  })
  // 用户感知：立即看到变化，无 Loading 等待
}

// 删除任务时立即从列表移除
const handleDelete = () => {
  deleteMutation.mutate(todo.id)
  // 用户感知：任务立即消失
}
```

---

## 技术要点

### Query Key 设计

```
['todos']                    // 所有 todo 查询的基础 key
['todos', startDate, endDate] // 日期范围查询的 key
```

### 缓存更新策略

| 场景 | 操作 | 说明 |
|------|------|------|
| 更新任务 | `setQueryData` 映射更新 | 找到匹配 ID 的 todo 更新字段 |
| 删除任务 | `setQueryData` 过滤移除 | 从数组中过滤掉该 ID |
| API 失败 | 恢复 `previousTodos` | 回滚到操作前的状态 |
| 操作完成 | `invalidateQueries` | 触发重新获取确保一致性 |

---

## 验收标准

- [x] `useTodosByDateRange` 正确计算 42 天网格范围
- [x] `useUpdateTodoMutation` 更新时 UI 立即响应
- [x] `useDeleteTodoMutation` 删除时任务立即移除
- [x] API 失败时自动回滚 UI 状态
- [x] 不影响现有的 `useTodos` 查询

---

## 实现记录

**完成日期**: 2026-03-13

### 创建的文件

| 文件 | 描述 | 测试数量 |
|------|------|----------|
| `hooks/useTodosByDateRange.ts` | 日期范围查询 Hook | - |
| `hooks/useTodosByDateRange.test.tsx` | 单元测试 | 16 tests |
| `hooks/useTodoMutations.ts` | 乐观更新 Mutation Hooks | - |
| `hooks/useTodoMutations.test.tsx` | 单元测试 | 28 tests |
| `hooks/index.ts` | 导出索引 | - |

### 测试覆盖率

| Hook | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| `useTodosByDateRange` | 100% | 100% | 100% | 100% |
| `useTodoMutations` | 100% | 93% | 100% | 100% |

### Code Review 修复

**问题**: 原实现只保存第一个查询的数据用于回滚，当存在多个缓存查询（如不同日期范围）时，回滚不完整。

**修复**: 将 `MutationContext` 改为使用 `Map<string, { todos: TodoItem[] }>` 存储所有查询的原始数据，确保回滚时恢复所有缓存。

```typescript
// 修复后的接口
interface MutationContext {
  previousData: Map<string, { todos: TodoItem[] }>
}
```

---

## 后续阶段

完成后进入 **Phase 6: 日历组件实现**
# Plan 6 - Phase 3: 前端 Service 层扩展 ✅

> **阶段目标**: 封装新的 API 调用方法，为 React Query Hooks 提供基础
> **预估时间**: 0.5h
> **实际时间**: 完成
> **前置依赖**: Phase 2 完成（后端 API 已扩展）
> **状态**: 已完成

---

## 任务上下文

前端需要调用 Phase 2 新增的后端 API：
- 按日期范围获取 todos
- 更新 todo
- 删除 todo

这些方法将在 Phase 5 的 React Query Hooks 中使用。

---

## 现有代码参考

**文件**: `packages/frontend/src/services/todo.service.ts`

参考现有的 Service 方法模式：
- `getTodos()` - 获取所有 todos
- `createTodo()` - 创建新 todo

---

## 类型导入

从 `@nanomail/shared` 导入类型：

```typescript
import type { TodoItem, Urgency, TodoStatus, TodoDateRangeQuery, UpdateTodo } from '@nanomail/shared'
```

---

## 任务清单

### 扩展 TodoService

**文件**: `packages/frontend/src/services/todo.service.ts`

```typescript
export const TodoService = {
  // ...保留现有方法

  /**
   * 按日期范围获取 todos
   */
  async getTodosByDateRange(query: TodoDateRangeQuery): Promise<TodosResponse> {
    const params = new URLSearchParams()
    params.set('startDate', query.startDate)
    params.set('endDate', query.endDate)

    const response = await fetch(`/api/todos?${params.toString()}`)
    if (!response.ok) throw new Error('Failed to fetch todos by date range')
    return response.json()
  },

  /**
   * 更新 Todo
   */
  async updateTodo(id: number, data: UpdateTodo): Promise<TodoItem> {
    const response = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update todo')
    return response.json()
  },

  /**
   * 删除 Todo
   */
  async deleteTodo(id: number): Promise<void> {
    const response = await fetch(`/api/todos/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete todo')
  },
}
```

---

## 接口说明

| 方法 | 参数 | 返回值 | 用途 |
|------|------|--------|------|
| `getTodosByDateRange` | `{ startDate, endDate }` | `TodosResponse` | 日历视图数据加载 |
| `updateTodo` | `id, { description?, urgency?, deadline?, status? }` | `TodoItem` | 编辑任务 |
| `deleteTodo` | `id` | `void` | 删除任务 |

---

## 验收标准

- [x] `getTodosByDateRange` 正确构建查询参数并发起请求
- [x] `updateTodo` 正确发送 PATCH 请求并返回更新后的数据
- [x] `deleteTodo` 正确发送 DELETE 请求
- [x] 所有方法都有正确的错误处理

---

## 实现记录

**测试覆盖**: 98.43% (目标: 80%)

**新增测试**: 12 个测试用例
- `getTodosByDateRange`: 3 个测试
- `updateTodo`: 6 个测试
- `deleteTodo`: 3 个测试

**代码审查**: 通过 (无 CRITICAL/HIGH 问题)

---

## 后续阶段

完成后进入 **Phase 4: UI 基础组件**
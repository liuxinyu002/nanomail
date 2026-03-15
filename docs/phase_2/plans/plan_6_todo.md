# Todo 日历视图实现方案

> **状态**: 待实施
> **创建时间**: 2026-03-13
> **相关讨论**: Todo 模块日历视图与 CRUD 功能扩展

---

## 一、需求重述

### 背景

当前 TodosPage 采用 4 列优先级列表视图（High/Medium/Low/Completed），用户无法直观查看任务的时间分布。需要新增日历视图，并扩展 Todo 的 CRUD 功能。

### 目标

1. **视图切换**: Tab 切换日历视图 / 列表视图
2. **日历视图**: 42 天网格（6周），显示每天任务总数徽章 + 最高优先级颜色标识
3. **日期详情**: 点击日期格子，右侧 Drawer 滑出显示当日任务列表
4. **CRUD 扩展**: 支持编辑 Todo 的 description、urgency、deadline，支持删除 Todo

### 核心场景

| 场景 | 描述 |
|------|------|
| 月度任务概览 | 用户切换到日历视图，快速查看本月任务分布 |
| 日期任务查看 | 点击某一天，查看当天所有任务（按优先级排序） |
| 任务改期 | 在详情 Drawer 中修改任务 deadline |
| 任务编辑 | 修改任务描述、优先级 |
| 任务删除 | 删除不需要的任务 |

---

## 二、文件清单

### 新增文件

| 文件路径 | 说明 |
|----------|------|
| `packages/frontend/src/features/todos/TodoCalendar.tsx` | 日历视图主组件 |
| `packages/frontend/src/features/todos/TodoCalendarGrid.tsx` | 日历网格组件 |
| `packages/frontend/src/features/todos/CalendarDayCell.tsx` | 单个日期格子组件 |
| `packages/frontend/src/features/todos/TodoDayDrawer.tsx` | 日期详情 Drawer |
| `packages/frontend/src/features/todos/TodoEditForm.tsx` | Todo 编辑表单 |
| `packages/frontend/src/components/ui/select.tsx` | Select 下拉选择组件 |
| `packages/frontend/src/components/ui/popover.tsx` | Popover 弹出层组件 |
| `packages/frontend/src/components/ui/dropdown-menu.tsx` | 下拉菜单组件 |
| `packages/frontend/src/components/ui/calendar.tsx` | 自定义日历面板组件 |
| `packages/frontend/src/components/ui/alert-dialog.tsx` | 警告对话框组件 |
| `packages/frontend/src/hooks/useTodosByDateRange.ts` | 日期范围查询 Hook |
| `packages/frontend/src/hooks/useTodoMutations.ts` | 乐观更新 Mutation Hooks |
| `packages/frontend/src/features/todos/TodoCalendar.test.tsx` | 日历视图测试 |
| `packages/frontend/src/features/todos/TodoDayDrawer.test.tsx` | Drawer 测试 |

### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `packages/frontend/src/pages/TodosPage.tsx` | 添加 Tab 切换逻辑 |
| `packages/frontend/src/services/todo.service.ts` | 新增 updateTodo、deleteTodo 方法 |
| `packages/backend/src/routes/todo.routes.ts` | 新增 PATCH /:id、DELETE /:id 路由，支持 startDate/endDate 查询 |
| `packages/shared/src/schemas/todo.ts` | 扩展 UpdateTodoSchema |
| `packages/frontend/src/components/ui/index.ts` | 导出新增组件 |
| `packages/frontend/package.json` | 添加 date-fns 依赖 |

---

## 三、分阶段实现步骤

### Phase 1: 依赖安装与 Shared Schema 扩展

**目标**: 准备基础依赖和类型定义

**任务清单**:

1. 安装 date-fns
   ```bash
   pnpm --filter @nanomail/frontend add date-fns
   ```

2. 安装 Radix UI 组件
   ```bash
   pnpm --filter @nanomail/frontend add @radix-ui/react-select @radix-ui/react-popover @radix-ui/react-dropdown-menu
   ```

3. 扩展 `packages/shared/src/schemas/todo.ts`
   ```typescript
   // 新增日期范围查询参数 Schema
   export const TodoDateRangeQuerySchema = z.object({
     startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
     endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
   })

   // 扩展 UpdateTodoSchema，允许更新更多字段
   export const UpdateTodoSchema = z.object({
     description: z.string().min(1).max(2000).optional(),
     urgency: UrgencySchema.optional(),
     deadline: z.string().datetime().nullable().optional(),
     status: TodoStatusSchema.optional(),
   })

   export type TodoDateRangeQuery = z.infer<typeof TodoDateRangeQuerySchema>
   export type UpdateTodo = z.infer<typeof UpdateTodoSchema>
   ```

---

### Phase 2: 后端 API 扩展

**目标**: 新增 Todo CRUD 端点和日期范围查询

**文件**: `packages/backend/src/routes/todo.routes.ts`

**新增端点**:

```typescript
// GET /api/todos?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, status, urgency, emailId } = req.query

    // 日期范围筛选
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00Z`)
      const end = new Date(`${endDate}T23:59:59Z`)

      const todos = await todoRepository
        .createQueryBuilder('todo')
        .where('todo.deadline BETWEEN :start AND :end', { start, end })
        .orWhere('todo.deadline IS NULL')
        .orderBy('todo.deadline', 'ASC', 'NULLS LAST')
        .addOrderBy('todo.createdAt', 'ASC')
        .getMany()

      return res.json({ todos: formatTodos(todos) })
    }

    // 原有逻辑保持不变
    // ...
  }
})

// PATCH /api/todos/:id - 更新 Todo
router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { description, urgency, deadline, status } = req.body

    const todo = await todoRepository.findOne({ where: { id } })
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    // 更新字段
    if (description !== undefined) todo.description = description
    if (urgency !== undefined) todo.urgency = urgency
    if (deadline !== undefined) todo.deadline = deadline ? new Date(deadline) : null
    if (status !== undefined) todo.status = status

    await todoRepository.save(todo)

    res.json(formatTodo(todo))
  }
})

// DELETE /api/todos/:id - 删除 Todo
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)

    const result = await todoRepository.delete(id)

    if (result.affected === 0) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    res.status(204).send()
  }
})
```

---

### Phase 3: 前端 Service 层扩展

**目标**: 封装新的 API 调用方法

**文件**: `packages/frontend/src/services/todo.service.ts`

```typescript
export interface TodosDateRangeQuery {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface UpdateTodoData {
  description?: string
  urgency?: Urgency
  deadline?: string | null
  status?: TodoStatus
}

export const TodoService = {
  // 现有方法...

  /**
   * 按日期范围获取 todos
   */
  async getTodosByDateRange(query: TodosDateRangeQuery): Promise<TodosResponse> {
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
  async updateTodo(id: number, data: UpdateTodoData): Promise<TodoItem> {
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

### Phase 4: UI 组件 - Select / Popover / Dropdown-Menu

**目标**: 创建必要的 UI 基础组件

**文件**: `packages/frontend/src/components/ui/select.tsx`

使用 Radix UI Select 组件封装。

**文件**: `packages/frontend/src/components/ui/popover.tsx`

使用 Radix UI Popover 组件封装。

**文件**: `packages/frontend/src/components/ui/dropdown-menu.tsx`

使用 Radix UI Dropdown Menu 组件封装。

---

### Phase 5: React Query Hooks (查询 + 乐观更新)

**目标**: 创建日期范围查询 Hook 与乐观更新 Mutation Hooks

#### 5.1 日期范围查询 Hook

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
 */
export function useTodosByDateRange(date: Date) {
  // 计算日历网格范围（6周 = 42天）
  const monthStart = startOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // 周日开始
  const calendarEnd = addDays(calendarStart, 41)

  const startDate = format(calendarStart, 'yyyy-MM-dd')
  const endDate = format(calendarEnd, 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['todos', startDate, endDate],
    queryFn: () => TodoService.getTodosByDateRange({ startDate, endDate }),
    staleTime: 1000 * 60 * 5, // 5 分钟
  })
}
```

#### 5.2 乐观更新 Mutation Hooks

**设计原则**: 实现极致流畅的用户体验，在 Drawer 中触发 `updateTodo` 或 `deleteTodo` 时，优先修改本地缓存，不等待网络请求完成。

**文件**: `packages/frontend/src/hooks/useTodoMutations.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TodoService } from '@/services'
import type { TodoItem, UpdateTodoData } from '@nanomail/shared'

interface MutationContext {
  previousTodos: TodoItem[] | undefined
  queryKey: [string, string, string]
}

/**
 * 更新 Todo 的乐观更新 Hook
 */
export function useUpdateTodoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTodoData }) =>
      TodoService.updateTodo(id, data),

    // 乐观更新：立即修改缓存
    onMutate: async ({ id, data }): Promise<MutationContext> => {
      // 1. 找到包含该 todo 的所有查询 key
      const queryCache = queryClient.getQueryCache()
      const todoQueries = queryCache.findAll({ queryKey: ['todos'] })

      // 2. 取消正在进行的查询，防止覆盖乐观更新
      await Promise.all(
        todoQueries.map(query => queryClient.cancelQueries(query.queryKey))
      )

      // 3. 保存旧的缓存数据用于回滚
      const previousTodos = todoQueries[0]?.state?.data as TodoItem[] | undefined
      const queryKey = todoQueries[0]?.queryKey as [string, string, string]

      // 4. 乐观更新缓存
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
      // 可选：Toast 提示用户操作失败
    },

    // 成功后重新获取数据确保一致性
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

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

      const previousTodos = todoQueries[0]?.state?.data as TodoItem[] | undefined
      const queryKey = todoQueries[0]?.queryKey as [string, string, string]

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

**使用示例**（在 TodoDayDrawer 中）:

```typescript
const updateMutation = useUpdateTodoMutation()
const deleteMutation = useDeleteTodoMutation()

// 修改 deadline 时立即生效，无需等待
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
  // 用户感知：任务立即消失，Drawer 保持轻量感
}
```

---

### Phase 6: 日历组件实现

**目标**: 实现日历视图核心组件

#### 6.1 CalendarDayCell 组件

**文件**: `packages/frontend/src/features/todos/CalendarDayCell.tsx`

- memo 优化，避免不必要的重渲染
- 显示日期数字
- 显示任务总数徽章（仅未完成任务）
- 底部边框显示最高优先级颜色

#### 6.2 TodoCalendarGrid 组件

**文件**: `packages/frontend/src/features/todos/TodoCalendarGrid.tsx`

- 生成 42 天网格
- 星期头部（Sun-Sat）
- 使用 `eachDayOfInterval` 计算日期范围

#### 6.3 TodoCalendar 主组件

**文件**: `packages/frontend/src/features/todos/TodoCalendar.tsx`

- 月份导航（上一月/下一月）
- 调用 `useTodosByDateRange` Hook
- 管理 Drawer 状态

---

### Phase 7: TodoDayDrawer 与 TodoEditForm

**目标**: 实现日期详情 Drawer 和编辑表单

#### 7.1 TodoEditForm 组件

**文件**: `packages/frontend/src/features/todos/TodoEditForm.tsx`

- 描述文本框
- 优先级下拉选择（High/Medium/Low）
- **日期选择器（自定义日历面板，见下方详细设计）**
- 保存/取消按钮

**日期选择器设计**:

> ⚠️ **避免使用原生 `input[type="date"]`**
> 原生日期选择器在不同浏览器（Safari/Chrome）下 UI 表现差异巨大，极易破坏现有的 Radix UI + Tailwind 统一设计规范。

**推荐方案**: 使用 Radix Popover + 自定义日历面板

```typescript
// packages/frontend/src/components/ui/calendar.tsx
// 极简日历面板组件（基于 date-fns）

import { useState } from 'react'
import {
  startOfMonth,
  startOfWeek,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarProps {
  selected?: Date | null
  onSelect: (date: Date) => void
  disabled?: (date: Date) => boolean
}

export function Calendar({ selected, onSelect, disabled }: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(selected ?? new Date())

  const monthStart = startOfMonth(viewMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfMonth(viewMonth)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return (
    <div className="p-3 w-72">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 星期头部 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-xs text-muted-foreground text-center">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const isCurrentMonth = isSameMonth(day, viewMonth)
          const isSelected = selected && isSameDay(day, selected)
          const isDisabled = disabled?.(day)

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              disabled={isDisabled}
              className={cn(
                'h-8 w-8 text-sm rounded-md transition-colors',
                !isCurrentMonth && 'text-muted-foreground/50',
                isSelected && 'bg-primary text-primary-foreground',
                !isSelected && isCurrentMonth && 'hover:bg-accent',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**在 TodoEditForm 中使用**:

```typescript
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'

function TodoEditForm({ todo, onSubmit }) {
  const [deadline, setDeadline] = useState(todo.deadline ? new Date(todo.deadline) : null)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left">
          {deadline ? format(deadline, 'PPP') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          selected={deadline}
          onSelect={(date) => {
            setDeadline(date)
            // 乐观更新
            updateMutation.mutate({ id: todo.id, data: { deadline: date?.toISOString() } })
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
```

#### 7.2 TodoDayDrawer 组件

**文件**: `packages/frontend/src/features/todos/TodoDayDrawer.tsx`

- 使用 Sheet 组件（复用 Radix Dialog）
- 筛选当日任务
- 按优先级排序显示
- DropdownMenu 触发编辑/删除
- **删除确认交互（见下方详细设计）**

**删除确认交互设计**:

> ⚠️ **避免使用全局阻断式确认**
> `window.confirm` 或居中 Modal 会破坏 Drawer 的轻量感。推荐以下两种方案：

**方案 A: DropdownMenu 内行内确认（推荐）**

```typescript
// 在 DropdownMenu 内实现两步确认
function TodoItemMenu({ todo, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(todo)}>
          Edit
        </DropdownMenuItem>

        {!confirmDelete ? (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Confirm delete?
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
              onClick={() => {
                onDelete(todo.id)
                setConfirmDelete(false)
              }}
            >
              Yes, delete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmDelete(false)}>
              Cancel
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**方案 B: Radix AlertDialog（备选）**

如果需要更明确的确认，可使用 AlertDialog 作为 Drawer 内的轻量级确认：

```typescript
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'

<AlertDialog>
  <AlertDialogTrigger asChild>
    <DropdownMenuItem
      className="text-destructive"
      onSelect={(e) => e.preventDefault()} // 防止关闭 Dropdown
    >
      Delete
    </DropdownMenuItem>
  </AlertDialogTrigger>
  <AlertDialogContent className="max-w-sm">
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this task?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-destructive-foreground"
        onClick={() => onDelete(todo.id)}
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**交互对比**:

| 方案 | 优点 | 缺点 |
|------|------|------|
| 行内确认 | 最轻量，不离开 Drawer 上下文 | 确认步骤视觉上较隐蔽 |
| AlertDialog | 确认更明确，仍保留在 Drawer 内 | 比 DropdownMenu 内确认稍重 |

**推荐**: 方案 A（行内确认），符合"极致流畅与高信息密度"的设计目标。

---

### Phase 8: TodosPage Tab 切换集成

**目标**: 将日历视图集成到 TodosPage

**文件**: `packages/frontend/src/pages/TodosPage.tsx`

- 添加 `viewMode` 状态（'list' | 'calendar'）
- 使用 Tabs 组件切换视图
- 保留现有列表视图逻辑

---

### Phase 9: 测试编写

**目标**: 确保所有新功能正确工作

**测试文件**:

| 文件 | 测试内容 |
|------|---------|
| `backend/src/routes/todo.routes.test.ts` | 新增 API 端点测试 |
| `frontend/src/features/todos/TodoCalendar.test.tsx` | 日历渲染、月份切换、日期点击 |
| `frontend/src/features/todos/TodoDayDrawer.test.tsx` | Drawer 打开/关闭、任务列表渲染、编辑/删除操作 |
| `frontend/src/features/todos/TodoEditForm.test.tsx` | 表单提交、验证、取消操作 |

---

## 四、组件架构设计

```
TodosPage
├── Tabs (List / Calendar)
├── TabsContent: List
│   └── TodoColumn[] (4列)
└── TabsContent: Calendar
    ├── TodoCalendar
    │   ├── MonthNavigation (Header)
    │   ├── TodoCalendarGrid
    │   │   └── CalendarDayCell[] (42个)
    │   └── TodoDayDrawer
    │       ├── TodoList
    │       │   └── TodoItem (with DropdownMenu)
    │       └── TodoEditForm
```

---

## 五、API 扩展设计

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/todos?startDate=&endDate=` | GET | 日期范围查询 |
| `/api/todos/:id` | PATCH | 更新 Todo（description/urgency/deadline/status） |
| `/api/todos/:id` | DELETE | 删除 Todo |

---

## 六、风险评估

| 风险 | 级别 | 缓解措施 |
|------|------|---------|
| date-fns 包体积 | 低 | 按需导入函数，tree-shaking 优化 |
| 日历渲染性能 | 中 | 使用 React.memo 优化 CalendarDayCell |
| 日期时区问题 | 中 | 统一使用 UTC 存储，前端按本地时区展示 |
| CRUD 权限控制 | 低 | 当前无用户系统，暂不需要权限校验 |
| Drawer 内容过长 | 低 | 使用 overflow-y-auto 滚动 |
| 乐观更新回滚 | 中 | onError 中恢复缓存，onSettled 中重新获取数据确保一致性 |
| 自定义日历组件复杂度 | 低 | 基于 date-fns 实现极简版本，避免过度封装 |

---

## 七、测试策略

### 单元测试

- 日历组件渲染正确日期
- 日期格子显示正确的任务数量和优先级颜色
- Drawer 正确筛选当日任务
- 编辑表单验证和提交逻辑

### 集成测试

- 日历视图与 API 交互
- CRUD 操作后数据刷新
- React Query 缓存失效

### E2E 测试（可选）

- 用户切换视图
- 用户点击日期查看详情
- 用户编辑/删除任务

---

## 八、工作量估算

| Phase | 内容 | 复杂度 | 预估时间 |
|-------|------|--------|---------|
| Phase 1 | 依赖安装与 Schema 扩展 | 低 | 0.5h |
| Phase 2 | 后端 API 扩展 | 中 | 1h |
| Phase 3 | 前端 Service 扩展 | 低 | 0.5h |
| Phase 4 | UI 基础组件 | 中 | 1h |
| Phase 5 | React Query Hooks（查询 + 乐观更新） | 中 | 1h |
| Phase 6 | 日历组件实现 | 高 | 2h |
| Phase 7 | Drawer 与编辑表单（含自定义日历 + 行内删除确认） | 高 | 2h |
| Phase 8 | TodosPage 集成 | 低 | 0.5h |
| Phase 9 | 测试编写 | 中 | 1.5h |
| **总计** | | | **10h** |

---

## 九、验收标准

### 后端

1. GET /api/todos 支持 startDate/endDate 参数
2. PATCH /api/todos/:id 支持更新 description/urgency/deadline
3. DELETE /api/todos/:id 正确删除并返回 204

### 前端

4. TodosPage 支持 Tab 切换（列表/日历）
5. 日历正确显示当前月份 42 天网格
6. 日期格子显示任务数量徽章和优先级颜色
7. 点击日期打开右侧 Drawer
8. Drawer 按优先级排序显示当日任务
9. 支持 Hover/... 菜单触发编辑和删除
10. 编辑表单支持修改 description/urgency/deadline
11. 日期选择器使用自定义日历面板（非原生 input[type="date"]）
12. 删除操作使用 DropdownMenu 内行内确认，不使用全局阻断式 Modal
13. 乐观更新：修改/删除任务时立即反映在 UI，无 Loading 等待

### 测试

14. 所有单元测试通过
15. 组件测试覆盖核心交互流程

---

## 十、关键文件参考

| 文件 | 说明 |
|------|------|
| `packages/frontend/src/pages/TodosPage.tsx` | 主页面，需添加 Tab 切换 |
| `packages/backend/src/routes/todo.routes.ts` | API 路由，需扩展 CRUD |
| `packages/frontend/src/services/todo.service.ts` | 服务层，需添加更新/删除方法 |
| `packages/frontend/src/components/ui/sheet.tsx` | 现有 Sheet 组件，Drawer 可复用 |
| `packages/shared/src/schemas/todo.ts` | 共享 Schema，需扩展 UpdateTodo |
| `packages/frontend/src/hooks/useTodoMutations.ts` | 乐观更新 Mutation Hooks（新增） |
| `packages/frontend/src/components/ui/calendar.tsx` | 自定义日历面板（新增） |
| `packages/frontend/src/components/ui/alert-dialog.tsx` | 警告对话框（新增，可选） |
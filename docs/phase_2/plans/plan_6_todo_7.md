# Plan 6 - Phase 7: Drawer 与编辑功能

> **阶段目标**: 实现日期详情 Drawer、TodoEditForm、自定义日历面板、删除确认交互
> **预估时间**: 2h
> **前置依赖**: Phase 4、Phase 5、Phase 6 完成

---

## 任务上下文

本阶段实现用户交互的核心功能：

1. **TodoDayDrawer** - 点击日期后右侧滑出的详情面板
2. **TodoEditForm** - 编辑任务的表单组件
3. **Calendar 日历面板** - 用于选择 deadline 的自定义日历
4. **删除确认** - 行内确认交互，避免全局 Modal

### 设计原则

- **极致流畅**: 乐观更新，无 Loading 等待
- **轻量感**: 不使用阻断式确认对话框
- **一致性**: 使用 Radix UI + Tailwind 设计系统

---

## 任务清单

### 1. 创建自定义 Calendar 组件

**文件**: `packages/frontend/src/components/ui/calendar.tsx`

> ⚠️ **重要**: 避免使用原生 `input[type="date"]`，不同浏览器 UI 差异大，破坏设计一致性。

**Props 接口**:
```typescript
interface CalendarProps {
  selected?: Date | null
  onSelect: (date: Date) => void
  disabled?: (date: Date) => boolean
}
```

**完整实现**:
```tsx
import { useState } from 'react'
import {
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export function Calendar({ selected, onSelect, disabled }: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(selected ?? new Date())

  const monthStart = startOfMonth(viewMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return (
    <div className="p-3 w-72">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 星期头部 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-xs text-muted-foreground text-center h-8 flex items-center justify-center">
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
              onClick={() => !isDisabled && onSelect(day)}
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

### 2. 创建 TodoEditForm 组件

**文件**: `packages/frontend/src/features/todos/TodoEditForm.tsx`

**职责**: 编辑任务的表单，支持修改 description、urgency、deadline

**Props 接口**:
```typescript
interface TodoEditFormProps {
  todo: TodoItem
  onCancel: () => void
}
```

**实现要点**:
- 使用 `useUpdateTodoMutation` 实现乐观更新
- 日期选择器使用 Popover + Calendar 组件
- 表单提交立即更新，无需 Loading

**组件结构**:
```tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useUpdateTodoMutation } from '@/hooks/useTodoMutations'
import type { TodoItem, Urgency } from '@nanomail/shared'

function TodoEditForm({ todo, onCancel }: TodoEditFormProps) {
  const [description, setDescription] = useState(todo.description)
  const [urgency, setUrgency] = useState<Urgency>(todo.urgency)
  const [deadline, setDeadline] = useState<Date | null>(
    todo.deadline ? new Date(todo.deadline) : null
  )

  const updateMutation = useUpdateTodoMutation()

  const handleSave = () => {
    updateMutation.mutate({
      id: todo.id,
      data: {
        description,
        urgency,
        deadline: deadline?.toISOString() || null,
      },
    })
    onCancel()
  }

  return (
    <div className="space-y-4 p-4">
      {/* 描述 */}
      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mt-1 p-2 border rounded-md"
          rows={3}
        />
      </div>

      {/* 优先级 */}
      <div>
        <label className="text-sm font-medium">Priority</label>
        <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 截止日期 */}
      <div>
        <label className="text-sm font-medium">Deadline</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full mt-1 justify-start text-left">
              {deadline ? format(deadline, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              selected={deadline}
              onSelect={(date) => setDeadline(date)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  )
}
```

### 3. 创建 TodoDayDrawer 组件

**文件**: `packages/frontend/src/features/todos/TodoDayDrawer.tsx`

**职责**: 显示选中日期的任务列表，支持编辑和删除

**Props 接口**:
```typescript
interface TodoDayDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  todos: TodoItem[]
}
```

**删除确认交互 - 行内确认方案**:

```tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteTodoMutation } from '@/hooks/useTodoMutations'
import { TodoEditForm } from './TodoEditForm'

// 删除确认组件
function TodoItemMenu({ todo, onEdit }: { todo: TodoItem; onEdit: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteMutation = useDeleteTodoMutation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>

        {!confirmDelete ? (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
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
                deleteMutation.mutate(todo.id)
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

function TodoDayDrawer({ open, onOpenChange, date, todos }: TodoDayDrawerProps) {
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null)

  // 按优先级排序
  const sortedTodos = [...todos].sort((a, b) => {
    const order = { high: 3, medium: 2, low: 1 }
    return order[b.urgency] - order[a.urgency]
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {date ? format(date, 'EEEE, MMMM d, yyyy') : 'Select a date'}
          </SheetTitle>
        </SheetHeader>

        {editingTodo ? (
          <TodoEditForm
            todo={editingTodo}
            onCancel={() => setEditingTodo(null)}
          />
        ) : (
          <div className="mt-4 space-y-2">
            {sortedTodos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tasks for this day
              </p>
            ) : (
              sortedTodos.map(todo => (
                <div
                  key={todo.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className={cn(
                      'text-sm',
                      todo.status === 'completed' && 'line-through text-muted-foreground'
                    )}>
                      {todo.description}
                    </p>
                    <span className={cn(
                      'text-xs',
                      todo.urgency === 'high' && 'text-red-500',
                      todo.urgency === 'medium' && 'text-yellow-600',
                      todo.urgency === 'low' && 'text-blue-500'
                    )}>
                      {todo.urgency}
                    </span>
                  </div>
                  <TodoItemMenu
                    todo={todo}
                    onEdit={() => setEditingTodo(todo)}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

---

## 交互设计对比

### 删除确认方案

| 方案 | 优点 | 缺点 | 推荐 |
|------|------|------|------|
| 行内确认 | 最轻量，不离开 Drawer 上下文 | 确认步骤视觉上较隐蔽 | ✅ 推荐 |
| AlertDialog | 确认更明确 | 比 DropdownMenu 内确认稍重 | 备选 |
| window.confirm | 简单 | 阻断式，破坏设计一致性 | ❌ 禁止 |

---

## 验收标准

- [ ] Calendar 组件正确显示月份视图
- [ ] TodoEditForm 支持修改 description/urgency/deadline
- [ ] 日期选择器使用自定义 Calendar，非原生 input
- [ ] TodoDayDrawer 正确显示选中日期的任务
- [ ] 任务按优先级排序显示
- [ ] 删除操作使用行内确认，不使用全局 Modal
- [ ] 所有操作使用乐观更新，无 Loading 等待

---

## 后续阶段

完成后进入 **Phase 8: 页面集成与测试**
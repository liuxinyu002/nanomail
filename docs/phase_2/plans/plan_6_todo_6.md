# Plan 6 - Phase 6: 日历组件实现

> **阶段目标**: 实现日历视图核心组件（CalendarDayCell、TodoCalendarGrid、TodoCalendar）
> **预估时间**: 2h
> **前置依赖**: Phase 4、Phase 5 完成

---

## 任务上下文

日历视图采用三层组件架构：

```
TodoCalendar (主组件)
├── MonthNavigation (月份导航)
└── TodoCalendarGrid (网格容器)
    └── CalendarDayCell[] (42 个日期格子)
```

### 设计目标

- 42 天网格（6 周），覆盖当前月及前后溢出
- 每个日期格子显示：日期数字 + 任务数量徽章 + 最高优先级颜色标识
- 点击日期打开 Drawer 查看详情

---

## 任务清单

### 1. CalendarDayCell 组件

**文件**: `packages/frontend/src/features/todos/CalendarDayCell.tsx`

**职责**: 单个日期格子的渲染

**Props 接口**:
```typescript
interface CalendarDayCellProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  todoCount: number      // 未完成任务数量
  highestUrgency: Urgency | null  // 最高优先级
  onClick: (date: Date) => void
}
```

**实现要点**:
- 使用 `React.memo` 优化，避免不必要的重渲染
- 优先级颜色映射：
  - `high` → 红色 `bg-red-500`
  - `medium` → 黄色 `bg-yellow-500`
  - `low` → 蓝色 `bg-blue-500`
- 任务数量徽章样式：小圆形 + 数字

**组件结构**:
```tsx
<div
  onClick={() => onClick(date)}
  className={cn(
    'relative h-16 p-1 border cursor-pointer hover:bg-accent transition-colors',
    !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
    isToday && 'ring-2 ring-primary'
  )}
>
  {/* 日期数字 */}
  <span className="text-sm font-medium">{format(date, 'd')}</span>

  {/* 任务数量徽章 */}
  {todoCount > 0 && (
    <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
      {todoCount}
    </span>
  )}

  {/* 最高优先级颜色条 */}
  {highestUrgency && (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 h-1',
        highestUrgency === 'high' && 'bg-red-500',
        highestUrgency === 'medium' && 'bg-yellow-500',
        highestUrgency === 'low' && 'bg-blue-500'
      )}
    />
  )}
</div>
```

### 2. TodoCalendarGrid 组件

**文件**: `packages/frontend/src/features/todos/TodoCalendarGrid.tsx`

**职责**: 生成 42 天网格，计算每个格子的任务数据

**Props 接口**:
```typescript
interface TodoCalendarGridProps {
  currentMonth: Date
  todos: TodoItem[]
  onDayClick: (date: Date, todos: TodoItem[]) => void
}
```

**实现要点**:
- 使用 `startOfMonth` + `startOfWeek` 计算网格起始日期
- 使用 `eachDayOfInterval` 生成 42 天数组
- 计算每个日期的任务（按 deadline 筛选）
- 按优先级排序找出最高优先级

**关键代码**:
```typescript
import {
  startOfMonth,
  startOfWeek,
  addDays,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday as isTodayFn,
} from 'date-fns'

function TodoCalendarGrid({ currentMonth, todos, onDayClick }: TodoCalendarGridProps) {
  const monthStart = startOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = addDays(calendarStart, 41)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // 获取某天的任务
  const getTodosForDay = (date: Date) => {
    return todos.filter(todo =>
      todo.deadline && isSameDay(new Date(todo.deadline), date)
    )
  }

  // 计算最高优先级
  const getHighestUrgency = (dayTodos: TodoItem[]): Urgency | null => {
    if (dayTodos.length === 0) return null
    const urgencyOrder = { high: 3, medium: 2, low: 1 }
    return dayTodos.reduce((highest, todo) =>
      urgencyOrder[todo.urgency] > urgencyOrder[highest] ? todo.urgency : highest
    , dayTodos[0].urgency)
  }

  return (
    <>
      {/* 星期头部 */}
      <div className="grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dayTodos = getTodosForDay(day)
          const pendingTodos = dayTodos.filter(t => t.status !== 'completed')

          return (
            <CalendarDayCell
              key={day.toISOString()}
              date={day}
              isCurrentMonth={isSameMonth(day, currentMonth)}
              isToday={isTodayFn(day)}
              todoCount={pendingTodos.length}
              highestUrgency={getHighestUrgency(pendingTodos)}
              onClick={(date) => onDayClick(date, dayTodos)}
            />
          )
        })}
      </div>
    </>
  )
}
```

### 3. TodoCalendar 主组件

**文件**: `packages/frontend/src/features/todos/TodoCalendar.tsx`

**职责**: 月份导航、数据加载、Drawer 状态管理

**Props 接口**:
```typescript
interface TodoCalendarProps {
  onTodoClick?: (todo: TodoItem) => void
}
```

**状态管理**:
```typescript
const [currentMonth, setCurrentMonth] = useState(new Date())
const [selectedDate, setSelectedDate] = useState<Date | null>(null)
const [isDrawerOpen, setIsDrawerOpen] = useState(false)
```

**组件结构**:
```tsx
function TodoCalendar({ onTodoClick }: TodoCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [drawerTodos, setDrawerTodos] = useState<TodoItem[]>([])

  const { data, isLoading } = useTodosByDateRange(currentMonth)

  const handleDayClick = (date: Date, todos: TodoItem[]) => {
    setSelectedDate(date)
    setDrawerTodos(todos)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 月份导航 */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button variant="ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 日历网格 */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">Loading...</div>
      ) : (
        <TodoCalendarGrid
          currentMonth={currentMonth}
          todos={data?.todos || []}
          onDayClick={handleDayClick}
        />
      )}

      {/* 详情 Drawer */}
      <TodoDayDrawer
        open={!!selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        date={selectedDate}
        todos={drawerTodos}
      />
    </div>
  )
}
```

---

## 组件架构图

```
TodoCalendar
├── Header
│   ├── PrevMonthButton
│   ├── MonthTitle (March 2026)
│   └── NextMonthButton
├── TodoCalendarGrid
│   ├── WeekdayHeaders (Sun-Sat)
│   └── CalendarDayCell[42]
│       ├── DayNumber
│       ├── TodoCountBadge
│       └── UrgencyIndicator
└── TodoDayDrawer (Phase 7)
```

---

## 验收标准

- [ ] 日历正确显示 42 天网格
- [ ] 月份导航按钮切换正常
- [ ] 当前月份日期正常显示，溢出日期灰色显示
- [ ] 今日日期有特殊标识
- [ ] 日期格子显示正确的任务数量
- [ ] 优先级颜色条正确显示
- [ ] 点击日期触发回调

---

## 后续阶段

完成后进入 **Phase 7: Drawer 与编辑功能**
# Plan 6 - Phase 8: 页面集成与测试

> **阶段目标**: 将日历视图集成到 TodosPage，完成测试编写
> **预估时间**: 2h
> **前置依赖**: Phase 1-7 全部完成

---

## 任务上下文

本阶段是最后的集成工作：

1. **TodosPage Tab 切换** - 添加列表/日历视图切换
2. **测试编写** - 确保所有新功能正确工作

---

## 第一部分：TodosPage 集成

### 现有代码参考

**文件**: `packages/frontend/src/pages/TodosPage.tsx`

当前结构：
- 4 列优先级列表视图（High/Medium/Low/Completed）
- 使用 `useTodos` Hook 获取数据

### 任务清单

#### 1. 添加视图模式状态

```typescript
type ViewMode = 'list' | 'calendar'

const [viewMode, setViewMode] = useState<ViewMode>('list')
```

#### 2. 添加 Tab 切换 UI

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { List, Calendar } from 'lucide-react'

function TodosPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Todos</h1>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {/* 现有的 4 列列表视图 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* ...existing code... */}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <TodoCalendar />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## 第二部分：测试编写

### 测试文件清单

| 文件 | 测试内容 |
|------|---------|
| `backend/src/routes/todo.routes.test.ts` | 新增 API 端点测试 |
| `frontend/src/features/todos/TodoCalendar.test.tsx` | 日历渲染、月份切换、日期点击 |
| `frontend/src/features/todos/TodoDayDrawer.test.tsx` | Drawer 打开/关闭、任务列表渲染 |
| `frontend/src/features/todos/TodoEditForm.test.tsx` | 表单提交、验证 |

### 后端 API 测试

**文件**: `packages/backend/src/routes/todo.routes.test.ts`

```typescript
describe('Todo Routes', () => {
  describe('GET /api/todos with date range', () => {
    it('should return todos within date range', async () => {
      const response = await request(app)
        .get('/api/todos?startDate=2026-03-01&endDate=2026-03-31')

      expect(response.status).toBe(200)
      expect(response.body.todos).toBeDefined()
    })
  })

  describe('PATCH /api/todos/:id', () => {
    it('should update todo fields', async () => {
      const response = await request(app)
        .patch('/api/todos/1')
        .send({ description: 'Updated description', urgency: 'high' })

      expect(response.status).toBe(200)
      expect(response.body.description).toBe('Updated description')
      expect(response.body.urgency).toBe('high')
    })

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .patch('/api/todos/99999')
        .send({ description: 'Test' })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/todos/:id', () => {
    it('should delete todo and return 204', async () => {
      const response = await request(app)
        .delete('/api/todos/1')

      expect(response.status).toBe(204)
    })
  })
})
```

### 前端组件测试

**文件**: `packages/frontend/src/features/todos/TodoCalendar.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodoCalendar } from './TodoCalendar'

const wrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('TodoCalendar', () => {
  it('should render calendar grid with 42 days', () => {
    render(<TodoCalendar />, { wrapper })

    // 6 行 x 7 列 = 42 个日期格子
    const dayCells = screen.getAllByRole('button', { name: /\d+/ })
    expect(dayCells.length).toBeGreaterThanOrEqual(42)
  })

  it('should navigate to previous/next month', () => {
    render(<TodoCalendar />, { wrapper })

    const prevButton = screen.getByRole('button', { name: /previous/i })
    const nextButton = screen.getByRole('button', { name: /next/i })

    fireEvent.click(nextButton)
    // 验证月份变化

    fireEvent.click(prevButton)
    // 验证月份变化
  })

  it('should open drawer when clicking a day', () => {
    render(<TodoCalendar />, { wrapper })

    const dayCell = screen.getByRole('button', { name: '15' })
    fireEvent.click(dayCell)

    // 验证 Drawer 打开
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
```

**文件**: `packages/frontend/src/features/todos/TodoDayDrawer.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { TodoDayDrawer } from './TodoDayDrawer'

describe('TodoDayDrawer', () => {
  const mockTodos = [
    { id: 1, description: 'Task 1', urgency: 'high', status: 'pending' },
    { id: 2, description: 'Task 2', urgency: 'low', status: 'pending' },
  ]

  it('should display todos sorted by priority', () => {
    render(
      <TodoDayDrawer
        open={true}
        onOpenChange={() => {}}
        date={new Date('2026-03-15')}
        todos={mockTodos}
      />
    )

    const descriptions = screen.getAllByText(/Task \d/)
    // high priority should come first
    expect(descriptions[0]).toHaveTextContent('Task 1')
  })

  it('should show delete confirmation when clicking delete', () => {
    render(
      <TodoDayDrawer
        open={true}
        onOpenChange={() => {}}
        date={new Date('2026-03-15')}
        todos={mockTodos}
      />
    )

    const deleteButton = screen.getByRole('menuitem', { name: /delete/i })
    fireEvent.click(deleteButton)

    expect(screen.getByText(/confirm delete/i)).toBeInTheDocument()
  })
})
```

---

## 测试策略总结

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

## 验收标准

### 页面集成

- [ ] TodosPage 支持 Tab 切换（列表/日历）
- [ ] 切换视图时状态保持
- [ ] 日历视图正确渲染

### 后端测试

- [ ] `GET /api/todos?startDate=&endDate=` 测试通过
- [ ] `PATCH /api/todos/:id` 测试通过
- [ ] `DELETE /api/todos/:id` 测试通过

### 前端测试

- [ ] TodoCalendar 渲染测试通过
- [ ] TodoDayDrawer 交互测试通过
- [ ] TodoEditForm 表单测试通过

---

## 完整验收清单

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
9. 支持 DropdownMenu 触发编辑和删除
10. 编辑表单支持修改 description/urgency/deadline
11. 日期选择器使用自定义日历面板
12. 删除操作使用行内确认
13. 乐观更新：修改/删除任务时立即反映在 UI

### 测试

14. 所有单元测试通过
15. 组件测试覆盖核心交互流程
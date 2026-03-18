# Plan 2 Phase 7: 测试与完善

> **文档版本**: v1.0
> **创建日期**: 2026-03-18
> **所属计划**: Plan 2 - Todo 模块增强
> **前置阶段**: Phase 6 - 删除列与任务迁移
> **预估时间**: 2h

---

## 一、计划背景

### 1.1 总体目标

在 Plan 1 实现的三面板界面基础上，新增两个增强功能：

| 功能 | 目标 |
|------|------|
| **面板可调整宽度** | 用户可通过拖拽分隔条调整 Inbox、Planner、Board 面板宽度，宽度持久化到 localStorage |
| **看板列管理** | 支持新建列、重命名、更改颜色、删除列，删除时自动迁移任务到 Inbox |

### 1.2 本阶段目标

**完善测试覆盖率和边界情况处理**

---

## 二、测试策略

### 2.1 测试金字塔

```
        /\
       /  \      E2E Tests
      /────\     - 面板宽度调整流程
     /      \    - 列管理完整流程
    /────────\   (可选)
   /          \
  /────────────\ Integration Tests
 /              \ (通过组件测试覆盖)
/────────────────\
   Unit Tests (主要)
   - ResizablePanels
   - ColumnHeader
   - ColorPicker
   - NewListButton
```

### 2.2 测试优先级

| 优先级 | 组件 | 测试重点 |
|--------|------|----------|
| P0 | ColumnHeader | 删除确认、重命名、菜单交互 |
| P0 | NewListButton | 创建列、输入验证 |
| P1 | ColorPicker | 颜色选择、取消选择 |
| P1 | ResizablePanels | 渲染、持久化 |

---

## 三、单元测试

### 3.1 ResizablePanels 测试

**文件路径**: `packages/frontend/src/features/todos/ResizablePanels.test.tsx`

```typescript
import { render, screen } from '@testing-library/react'
import { ResizablePanels } from './ResizablePanels'

describe('ResizablePanels', () => {
  it('should render three panels', () => {
    render(
      <ResizablePanels>
        <div data-testid="inbox">Inbox</div>
        <div data-testid="planner">Planner</div>
        <div data-testid="board">Board</div>
      </ResizablePanels>
    )

    expect(screen.getByTestId('inbox')).toBeInTheDocument()
    expect(screen.getByTestId('planner')).toBeInTheDocument()
    expect(screen.getByTestId('board')).toBeInTheDocument()
  })

  it('should render resize handles', () => {
    const { container } = render(
      <ResizablePanels>
        <div>Inbox</div>
        <div>Planner</div>
        <div>Board</div>
      </ResizablePanels>
    )

    // 验证存在两个 resize handle
    const handles = container.querySelectorAll('[data-panel-resize-handle-id]')
    expect(handles).toHaveLength(2)
  })
})
```

### 3.2 ColumnHeader 测试

**文件路径**: `packages/frontend/src/features/todos/ColumnHeader.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnHeader } from './ColumnHeader'
import type { BoardColumn } from '@nanomail/shared'

const mockColumn: BoardColumn = {
  id: 1,
  name: 'Todo',
  order: 0,
  color: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

describe('ColumnHeader', () => {
  const mockOnRename = vi.fn()
  const mockOnColorChange = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display column name and count', () => {
    render(
      <ColumnHeader
        column={mockColumn}
        itemCount={5}
        onRename={mockOnRename}
        onColorChange={mockOnColorChange}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should show settings button on hover', async () => {
    const user = userEvent.setup()

    render(
      <ColumnHeader
        column={mockColumn}
        itemCount={0}
        onRename={mockOnRename}
        onColorChange={mockOnColorChange}
        onDelete={mockOnDelete}
      />
    )

    const header = screen.getByRole('heading', { name: /todo/i }).parentElement!
    await user.hover(header)

    // 设置按钮应该在 hover 时可见
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    expect(settingsButton).toBeVisible()
  })

  it('should enter edit mode on double click', async () => {
    const user = userEvent.setup()

    render(
      <ColumnHeader
        column={mockColumn}
        itemCount={0}
        onRename={mockOnRename}
        onColorChange={mockOnColorChange}
        onDelete={mockOnDelete}
      />
    )

    const columnName = screen.getByText('Todo')
    await user.dblClick(columnName)

    // 应该出现输入框
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('Todo')
  })

  it('should save rename on Enter', async () => {
    const user = userEvent.setup()

    render(
      <ColumnHeader
        column={mockColumn}
        itemCount={0}
        onRename={mockOnRename}
        onColorChange={mockOnColorChange}
        onDelete={mockOnDelete}
      />
    )

    // 进入编辑模式
    const columnName = screen.getByText('Todo')
    await user.dblClick(columnName)

    // 修改名称
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New Name{enter}')

    expect(mockOnRename).toHaveBeenCalledWith('New Name')
  })

  it('should cancel rename on Escape', async () => {
    const user = userEvent.setup()

    render(
      <ColumnHeader
        column={mockColumn}
        itemCount={0}
        onRename={mockOnRename}
        onColorChange={mockOnColorChange}
        onDelete={mockOnDelete}
      />
    )

    // 进入编辑模式
    const columnName = screen.getByText('Todo')
    await user.dblClick(columnName)

    // 修改名称但不保存
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New Name{escape}')

    expect(mockOnRename).not.toHaveBeenCalled()
  })

  it('should show delete confirmation dialog', async () => {
    const user = userEvent.setup()

    render(
      <ColumnHeader
        column={mockColumn}
        itemCount={3}
        onRename={mockOnRename}
        onColorChange={mockOnColorChange}
        onDelete={mockOnDelete}
      />
    )

    // Hover 显示设置按钮
    const header = screen.getByRole('heading', { name: /todo/i }).parentElement!
    await user.hover(header)

    // 点击设置按钮
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    await user.click(settingsButton)

    // 点击删除选项
    const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
    await user.click(deleteOption)

    // 应该显示确认对话框
    expect(screen.getByText('Delete List?')).toBeInTheDocument()
    expect(screen.getByText(/contains 3 tasks/i)).toBeInTheDocument()
  })
})
```

### 3.3 ColorPicker 测试

**文件路径**: `packages/frontend/src/features/todos/ColorPicker.test.tsx`

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColorPicker } from './ColorPicker'

describe('ColorPicker', () => {
  it('should render 6 color options', () => {
    const mockOnChange = vi.fn()

    render(<ColorPicker value={null} onChange={mockOnChange} />)

    const colorButtons = screen.getAllByRole('button')
    expect(colorButtons).toHaveLength(6)
  })

  it('should call onChange when color is clicked', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()

    render(<ColorPicker value={null} onChange={mockOnChange} />)

    const blueButton = screen.getByTitle('Blue')
    await user.click(blueButton)

    expect(mockOnChange).toHaveBeenCalledWith('#DBEAFE')
  })

  it('should deselect when clicking selected color', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()

    render(<ColorPicker value="#DBEAFE" onChange={mockOnChange} />)

    const blueButton = screen.getByTitle('Blue')
    await user.click(blueButton)

    expect(mockOnChange).toHaveBeenCalledWith(null)
  })

  it('should highlight selected color', () => {
    const mockOnChange = vi.fn()

    const { container } = render(
      <ColorPicker value="#DBEAFE" onChange={mockOnChange} />
    )

    const blueButton = screen.getByTitle('Blue')
    // 检查是否有选中状态的样式
    expect(blueButton).toHaveClass('border-primary')
  })
})
```

### 3.4 NewListButton 测试

**文件路径**: `packages/frontend/src/features/todos/NewListButton.test.tsx`

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewListButton } from './NewListButton'

describe('NewListButton', () => {
  it('should render as ghost button', () => {
    const mockOnCreate = vi.fn()

    render(<NewListButton onCreateColumn={mockOnCreate} />)

    expect(screen.getByText('New List')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveClass('border-dashed')
  })

  it('should switch to input mode on click', async () => {
    const user = userEvent.setup()
    const mockOnCreate = vi.fn()

    render(<NewListButton onCreateColumn={mockOnCreate} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByPlaceholderText(/enter list name/i)).toBeInTheDocument()
  })

  it('should create column on Enter', async () => {
    const user = userEvent.setup()
    const mockOnCreate = vi.fn()

    render(<NewListButton onCreateColumn={mockOnCreate} />)

    // 进入输入模式
    await user.click(screen.getByRole('button'))

    // 输入名称
    const input = screen.getByPlaceholderText(/enter list name/i)
    await user.type(input, 'New Column{enter}')

    expect(mockOnCreate).toHaveBeenCalledWith('New Column')
  })

  it('should cancel on Escape', async () => {
    const user = userEvent.setup()
    const mockOnCreate = vi.fn()

    render(<NewListButton onCreateColumn={mockOnCreate} />)

    // 进入输入模式
    await user.click(screen.getByRole('button'))

    // 输入名称但取消
    const input = screen.getByPlaceholderText(/enter list name/i)
    await user.type(input, 'New Column{escape}')

    expect(mockOnCreate).not.toHaveBeenCalled()
    // 应该回到按钮模式
    expect(screen.getByText('New List')).toBeInTheDocument()
  })

  it('should not create with empty name', async () => {
    const user = userEvent.setup()
    const mockOnCreate = vi.fn()

    render(<NewListButton onCreateColumn={mockOnCreate} />)

    // 进入输入模式
    await user.click(screen.getByRole('button'))

    // 直接按 Enter
    const input = screen.getByPlaceholderText(/enter list name/i)
    await user.type(input, '{enter}')

    expect(mockOnCreate).not.toHaveBeenCalled()
  })
})
```

---

## 四、E2E 测试（可选）

### 4.1 面板宽度调整流程

```typescript
// e2e/panel-resize.spec.ts
import { test, expect } from '@playwright/test'

test('should resize panels and persist', async ({ page }) => {
  await page.goto('/todos')

  // 初始宽度检查
  const inboxPanel = page.locator('[data-testid="inbox-panel"]')
  const initialWidth = await inboxPanel.evaluate(el => el.clientWidth)

  // 拖拽调整宽度（需要模拟拖拽）
  // ...

  // 刷新页面
  await page.reload()

  // 验证宽度恢复
  const restoredWidth = await inboxPanel.evaluate(el => el.clientWidth)
  expect(restoredWidth).not.toBe(initialWidth)
})
```

### 4.2 列管理完整流程

```typescript
// e2e/column-management.spec.ts
import { test, expect } from '@playwright/test'

test('should create, rename, and delete column', async ({ page }) => {
  await page.goto('/todos')

  // 创建新列
  await page.click('button:has-text("New List")')
  await page.fill('input[placeholder*="list name"]', 'Test Column')
  await page.keyboard.press('Enter')

  // 验证列创建
  await expect(page.locator('text=Test Column')).toBeVisible()

  // 重命名列
  await page.dblclick('text=Test Column')
  await page.fill('input[value="Test Column"]', 'Renamed Column')
  await page.keyboard.press('Enter')

  // 验证重命名
  await expect(page.locator('text=Renamed Column')).toBeVisible()

  // 删除列
  await page.hover('text=Renamed Column')
  await page.click('button[aria-label="Settings"]')
  await page.click('text=Delete')
  await page.click('button:has-text("Delete")')

  // 验证列删除
  await expect(page.locator('text=Renamed Column')).not.toBeVisible()
})
```

---

## 五、无障碍优化

### 5.1 键盘导航支持

| 组件 | 快捷键 | 功能 |
|------|--------|------|
| ColumnHeader | `Enter` (focus) | 打开菜单 |
| ColumnHeader | `Delete` | 删除列（需确认） |
| ColumnHeader | `F2` | 重命名 |
| ColorPicker | `ArrowLeft/Right` | 切换颜色 |
| NewListButton | `Enter` | 创建新列 |

### 5.2 ARIA 标签

```typescript
// ColumnHeader
<div role="heading" aria-level={3}>
  <span aria-label={`${column.name}, ${itemCount} items`}>
    {column.name}
  </span>
</div>

// ColorPicker
<button
  aria-label={`Select ${color.name} color`}
  aria-pressed={value === color.value}
/>

// NewListButton
<button
  aria-label="Create new list"
  aria-expanded={isEditing}
/>
```

---

## 六、任务清单

### 6.1 单元测试

**文件路径**: `packages/frontend/src/features/todos/*.test.tsx`

**测试内容**：
- [ ] ResizablePanels 测试
- [ ] ColumnHeader 测试
- [ ] ColorPicker 测试
- [ ] NewListButton 测试

### 6.2 E2E 测试（可选）

**文件路径**: `e2e/*.spec.ts`

**测试内容**：
- [ ] 面板宽度调整流程
- [ ] 列管理完整流程

### 6.3 无障碍优化

**修改内容**：
- [ ] 键盘导航支持
- [ ] ARIA 标签

---

## 七、文件变更清单

| 操作 | 文件路径 | 用途 |
|------|----------|------|
| 新建 | `packages/frontend/src/features/todos/ResizablePanels.test.tsx` | 单元测试 |
| 新建 | `packages/frontend/src/features/todos/ColumnHeader.test.tsx` | 单元测试 |
| 新建 | `packages/frontend/src/features/todos/ColorPicker.test.tsx` | 单元测试 |
| 新建 | `packages/frontend/src/features/todos/NewListButton.test.tsx` | 单元测试 |
| 新建（可选） | `e2e/panel-resize.spec.ts` | E2E 测试 |
| 新建（可选） | `e2e/column-management.spec.ts` | E2E 测试 |

---

## 八、验收标准

- [ ] 单元测试覆盖率 > 80%
- [ ] 所有测试通过
- [ ] 键盘可完成主要操作
- [ ] ARIA 标签正确

---

## 九、完成标志

完成本阶段后，Plan 2 所有功能实现完毕。可以进行：

1. **代码审查**：使用 code-reviewer agent
2. **集成测试**：手动测试完整功能流程
3. **性能优化**：如有需要
4. **文档更新**：更新用户文档

---

## 十、附录：总体时间估算

| 阶段 | 预估时间 |
|------|----------|
| Phase 1: 面板宽度基础 | 1-2h |
| Phase 2: 边界处理 | 0.5-1h |
| Phase 3: 列头组件 | 2-3h |
| Phase 4: 颜色选择器 | 1-2h |
| Phase 5: 新建列 | 1-2h |
| Phase 6: 删除列 | 2h |
| Phase 7: 测试完善 | 2h |
| **总计** | **9.5-14h** |

> **时间节省说明**：使用 `react-resizable-panels` 替代原生拖拽实现，Phase 1-2 时间从 3-5h 缩减至 1.5-3h，节省约 2h。
# Plan 2 Phase 2: 面板宽度边界处理

> **文档版本**: v1.0
> **创建日期**: 2026-03-18
> **所属计划**: Plan 2 - Todo 模块增强
> **前置阶段**: Phase 1 - 面板可调整宽度基础架构
> **预估时间**: 0.5-1h

---

## 一、计划背景

### 1.1 总体目标

在 Plan 1 实现的三面板界面基础上，新增两个增强功能：

| 功能 | 目标 |
|------|------|
| **面板可调整宽度** | 用户可通过拖拽分隔条调整 Inbox、Planner、Board 面板宽度，宽度持久化到 localStorage |
| **看板列管理** | 支持新建列、重命名、更改颜色、删除列，删除时自动迁移任务到 Inbox |

### 1.2 本阶段目标

**验证并微调边界行为**

> **简化说明**：使用 `react-resizable-panels` 后，大部分边界处理由库自动完成。本阶段主要是验证和微调。

---

## 二、边界约束规范

### 2.1 最小宽度约束

| 面板 | 最小宽度 | 说明 |
|------|----------|------|
| Inbox | 280px | 保证任务列表可读 |
| Planner | 320px | 保证日历和任务详情展示 |
| Board | 280px | 保证看板列可读 |

### 2.2 默认宽度

| 面板 | 默认宽度 | 说明 |
|------|----------|------|
| Inbox | 320px (25%) | 任务入口 |
| Planner | 400px (35%) | 主要工作区 |
| Board | 400px (40%) | 看板视图 |

---

## 三、任务清单

### 3.1 验证最小宽度约束

**测试场景**：
1. 尝试将 Inbox 拖拽到最小宽度以下
2. 确认 `minSize` 配置生效
3. 验证拖拽到边界时的阻尼效果

**预期行为**：
- 无法将面板压缩到最小宽度以下
- 拖拽到边界时停止，不继续压缩

### 3.2 验证响应式行为

**测试场景**：
1. 调整浏览器窗口大小
2. 缩放到不同分辨率
3. 验证小屏幕下的表现

**预期行为**：
- 窗口 resize 时面板自动调整
- 保持比例关系
- 不低于最小宽度

### 3.3 单元测试

**文件路径**: `packages/frontend/src/features/todos/ResizablePanels.test.tsx`

**测试内容**：
- 组件渲染测试
- 持久化恢复测试
- 最小宽度约束测试

**测试示例**：

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

  it('should restore saved widths from localStorage', () => {
    // 模拟 localStorage 中有保存的宽度
    localStorage.setItem('nanomail-todo-panels', JSON.stringify([30, 35, 35]))

    render(
      <ResizablePanels>
        <div>Inbox</div>
        <div>Planner</div>
        <div>Board</div>
      </ResizablePanels>
    )

    // 验证宽度是否恢复
    // 注意：react-resizable-panels 自动处理此逻辑
  })
})
```

---

## 四、文件变更清单

| 操作 | 文件路径 | 用途 |
|------|----------|------|
| 新建 | `packages/frontend/src/features/todos/ResizablePanels.test.tsx` | 单元测试 |

---

## 五、验收标准

- [ ] 无法将面板压缩到最小宽度以下
- [ ] 窗口 resize 时面板自动调整
- [ ] 单元测试通过

---

## 六、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 小屏幕兼容性 | 极端小屏幕下布局异常 | 考虑添加最小屏幕宽度检测，低于阈值时折叠面板 |

---

## 七、后续阶段

完成本阶段后，进入：
- **Phase 3**: 列头组件重构（将 BoardColumnDroppable 的列头抽取为独立组件）
# Phase 3: 集成与测试

> 文档版本: 1.0
> 创建日期: 2026-03-18
> 所属方案: Week View 改进方案（单日展示 + 日期切换）
> 前置依赖:
>   - Phase 1 - 基础组件（WeekDateNav）
>   - Phase 2 - WeekView 重构

---

## 1. 背景与目标

### 1.1 改进概述

将 WeekView 从"同时显示 7 天"改为"默认显示 1 天，点击日期切换"：

| 原 WeekView | 改进后 |
|-------------|--------|
| 同时显示 7 天 | 默认显示 1 天，点击日期切换 |
| 横向滚动查看 | 顶部日期条选择 + 左右箭头切换周 |

### 1.2 本阶段目标

1. 将重构后的 WeekView 集成到 PlannerPanel
2. 更新导出和集成测试
3. 确保所有功能正常工作

---

## 2. 文件架构

### 2.1 相关文件

```
packages/frontend/src/features/todos/planner/
├── WeekView.tsx           # Phase 2 已重构
├── WeekView.test.tsx      # Phase 2 已更新
├── WeekDateNav.tsx        # Phase 1 已创建
├── WeekDateNav.test.tsx   # Phase 1 已创建
├── index.ts               # 本阶段更新
└── integration.test.tsx   # 本阶段更新

packages/frontend/src/features/todos/
└── PlannerPanel.tsx       # 本阶段更新
```

---

## 3. 实现任务

| 步骤 | 文件 | 任务 | 风险 |
|------|------|------|------|
| 3.1 | `index.ts` | 导出新组件 | 低 |
| 3.2 | `PlannerPanel.tsx` | 更新 WeekView 集成 | 低 |
| 3.3 | `integration.test.tsx` | 更新集成测试 | 低 |

### 3.1 更新 index.ts 导出

位置：`packages/frontend/src/features/todos/planner/index.ts`

```typescript
// 新增导出
export { WeekDateNav } from './WeekDateNav'
export type { WeekDateNavProps } from './WeekDateNav'

// 已有导出（Phase 2 更新后）
export { WeekView } from './WeekView'
export type { WeekViewProps } from './WeekView'
```

### 3.2 更新 PlannerPanel.tsx

位置：`packages/frontend/src/features/todos/planner/PlannerPanel.tsx`

集成要点：
1. 确认 WeekView 新 props 被正确传递
2. 确保 `selectedDate` 和 `onDateChange` 回调正常工作
3. 检查日/周视图切换是否正常

```typescript
// PlannerPanel 中 WeekView 的使用示例
<WeekView
  selectedDate={selectedDate}
  todos={filteredTodos}
  onDateChange={handleDateChange}
  onTodoClick={handleTodoClick}
  className="flex-1"
/>
```

### 3.3 更新 integration.test.tsx

位置：`packages/frontend/src/features/todos/planner/integration.test.tsx`

测试用例：
- [ ] PlannerPanel 中 WeekView 正常工作
- [ ] 日/周视图切换正常
- [ ] 日期导航条响应正确
- [ ] 滑动动画正确触发

---

## 4. 文件变更清单

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `index.ts` | 导出 WeekDateNav |
| `PlannerPanel.tsx` | 更新 WeekView props |
| `integration.test.tsx` | 更新集成测试 |

---

## 5. 测试计划

### 5.1 集成测试用例

- [ ] PlannerPanel 中 WeekView 正常渲染
- [ ] 日/周视图切换功能正常
- [ ] 日期导航条点击切换日期
- [ ] 周切换箭头正常工作
- [ ] 滑动动画正确触发

### 5.2 手动测试清单

- [ ] 刷新页面后默认选中今天（当前周）
- [ ] 切换到非当前周后默认选中第一天
- [ ] 点击日期导航条切换日期，动画流畅
- [ ] 左右箭头切换周，动画方向正确
- [ ] 快速连续点击不出现动画卡顿
- [ ] 选中态与今天指示视觉区分明确

---

## 6. 风险与缓解

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 集成问题 | 低 | 保持现有接口兼容性 |
| 测试覆盖 | 低 | 复用现有测试结构 |

---

## 7. 验收标准

- [ ] WeekView 默认显示单日内容
- [ ] 顶部日期导航条正常工作
- [ ] 左右箭头切换周正常，带正确滑动方向
- [ ] 智能默认选中逻辑正确
- [ ] 滑动动画流畅（300ms），使用 React key 触发
- [ ] 选中态与今天指示视觉区分明确
- [ ] 所有测试通过
- [ ] 符合设计系统规范
- [ ] PlannerPanel 集成正常

---

## 8. 完成确认

完成本阶段后，整个 Week View 改进方案实施完成。确认清单：

- [ ] Phase 1: WeekDateNav 组件创建完成
- [ ] Phase 2: WeekView 重构完成
- [ ] Phase 3: 集成测试通过
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 手动测试通过
- [ ] 代码审查通过
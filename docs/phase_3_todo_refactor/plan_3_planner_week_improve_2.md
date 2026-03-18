# Phase 2: WeekView 重构

> 文档版本: 1.0
> 创建日期: 2026-03-18
> 所属方案: Week View 改进方案（单日展示 + 日期切换）
> 前置依赖: Phase 1 - 基础组件（WeekDateNav）

---

## 1. 背景与目标

### 1.1 问题陈述

当前 WeekView 同时显示 7 天的内容（7 列布局），在 PlannerPanel 仅占 ~35% 屏幕宽度的情况下，导致：

1. **信息密度过高** - 每列最小 140px，7 列 = 980px，需横向滚动，用户体验差
2. **视觉繁杂** - 用户难以聚焦当前任务
3. **交互成本高** - 需频繁滚动查看不同日期

### 1.2 本阶段目标

将 WeekView 从"同时显示 7 天"改为"默认显示 1 天，点击日期切换"：

| 原 WeekView | 改进后 |
|-------------|--------|
| 同时显示 7 天 | 默认显示 1 天，点击日期切换 |
| 横向滚动查看 | 顶部日期条选择 + 左右箭头切换周 |

### 1.3 核心交互

1. **日期条导航** - 顶部显示一周 7 天缩略，点击切换
2. **周切换** - 左右箭头切换上/下周
3. **智能默认选中**
   - 当前周 → 选中今天
   - 非当前周 → 选中该周第一天
4. **滑动动画** - 切换日期时，内容区域带方向性滑动 + 渐变效果

---

## 2. UI 设计

### 2.1 布局结构

```
┌──────────────────────────────────────────────┐
│  <  日 16  一 17  二 18  三 19  ...  六 21  >  │  ← 日期导航条（WeekDateNav）
├──────────────────────────────────────────────┤
│  00:00  ┌────────────────────────────────┐  │
│  01:00  │                                │  │
│  ...    │   选中日期的 24h 时间线          │  │  ← 主体区域（单日展示）
│  23:00  │   (复用 DayView 结构)           │  │
│         │                                │  │
│         └────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 3. 组件架构

### 3.1 文件结构

```
packages/frontend/src/features/todos/planner/
├── WeekView.tsx           # 重构：改为单日展示
├── WeekView.test.tsx      # 更新测试
├── WeekDateNav.tsx        # Phase 1 已创建
├── WeekDateNav.test.tsx   # Phase 1 已创建
└── index.ts               # 更新导出
```

### 3.2 组件接口设计

#### WeekViewProps（重构后）

```typescript
interface WeekViewProps {
  /** 当前选中的日期 */
  selectedDate: Date
  /** 所有待办事项 */
  todos: Todo[]
  /** 选中日期变化回调 */
  onDateChange?: (date: Date) => void
  /** 点击待办事项回调 */
  onTodoClick?: (todo: Todo) => void
  className?: string
}
```

---

## 4. 状态管理

```typescript
// WeekView 内部状态
const [weekStart, setWeekStart] = useState<Date>(() =>
  startOfWeek(selectedDate, { weekStartsOn: 0 })
)
const [currentSelectedDate, setCurrentSelectedDate] = useState<Date>(selectedDate)

// 动画方向状态（用于判断入场动画方向）
const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left')
```

> **注意**：不再使用 `setTimeout` 重置动画状态，改用 React `key` 属性触发动画。

---

## 5. 核心逻辑

### 5.1 智能默认选中

```typescript
function getSmartDefaultDate(weekStart: Date): Date {
  const today = new Date()
  const weekEnd = addDays(weekStart, 6)

  // 检查是否为当前周
  if (weekStart <= today && today <= weekEnd) {
    return today // 当前周 → 今天
  }

  return weekStart // 非当前周 → 第一天
}
```

### 5.2 周切换逻辑

```typescript
function handleWeekChange(direction: 'prev' | 'next') {
  const newWeekStart = direction === 'prev'
    ? addDays(weekStart, -7)
    : addDays(weekStart, 7)

  setWeekStart(newWeekStart)

  // 智能选择默认日期
  const defaultDate = getSmartDefaultDate(newWeekStart)
  setCurrentSelectedDate(defaultDate)

  // 设置滑动方向：上一周 → 内容向右滑入，下一周 → 内容向左滑入
  setSlideDirection(direction === 'prev' ? 'right' : 'left')

  onDateChange?.(defaultDate)
}
```

### 5.3 日期切换逻辑

```typescript
function handleDateSelect(newDate: Date) {
  // 设置滑动方向：日期增大 → 内容向左滑入，日期减小 → 内容向右滑入
  const direction = newDate > currentSelectedDate ? 'left' : 'right'
  setSlideDirection(direction)
  setCurrentSelectedDate(newDate)
  onDateChange?.(newDate)

  // 无需 setTimeout，React key 变化自动触发入场动画
}
```

---

## 6. 动画实现

使用 **React key 属性 + CSS 动画** 实现，避免 `setTimeout` 竞态问题：

```tsx
// 主体内容容器绑定 key
<div
  key={currentSelectedDate.toISOString()}
  className={cn(
    'animate-slide-in',  // 基础入场动画类
    slideDirection === 'left' ? 'animate-slide-left' : 'animate-slide-right'
  )}
>
  {/* 当天 24h 时间线内容 */}
</div>
```

**工作原理**：
1. 当 `currentSelectedDate` 变化时，React 检测到 `key` 变化
2. React 卸载旧组件实例，挂载新组件实例
3. 新组件挂载时，CSS 动画自动触发入场效果
4. 无需手动管理动画状态重置，彻底避免 `setTimeout` 竞态问题

---

## 7. 实现任务

| 步骤 | 文件 | 任务 | 风险 |
|------|------|------|------|
| 2.1 | `WeekView.tsx` | 重构为单日展示模式 | 中 |
| 2.2 | `WeekView.tsx` | 集成 WeekDateNav | 中 |
| 2.3 | `WeekView.tsx` | 实现滑动动画 | 中 |
| 2.4 | `WeekView.test.tsx` | 更新单元测试 | 低 |

### 7.1 重构 WeekView.tsx

位置：`packages/frontend/src/features/todos/planner/WeekView.tsx`

实现要点：
1. 引入 WeekDateNav 组件
2. 使用 `useState` 管理选中日期和周起始日期
3. 实现智能默认选中逻辑
4. 实现周切换和日期切换逻辑
5. 主体区域使用 React key 触发滑动动画
6. 复用 DayView 的时间线结构（或抽取为独立组件）

### 7.2 更新 WeekView.test.tsx

位置：`packages/frontend/src/features/todos/planner/WeekView.test.tsx`

测试用例：
- [ ] 默认选中今天（当前周）
- [ ] 默认选中第一天（非当前周）
- [ ] 点击日期切换显示，内容区域 key 正确更新
- [ ] 左箭头切换到上一周，动画方向为 right
- [ ] 右箭头切换到下一周，动画方向为 left
- [ ] 切换到更晚日期，动画方向为 left
- [ ] 切换到更早日期，动画方向为 right

---

## 8. 文件变更清单

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `WeekView.tsx` | 重构为单日展示，集成导航条 |
| `WeekView.test.tsx` | 更新测试用例 |

---

## 9. 风险与缓解

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 动画性能 | 低 | 使用 CSS transitions，GPU 加速 |
| 快速点击动画竞态 | 低 | 使用 React key 属性触发动画，无需 setTimeout |
| 测试覆盖 | 低 | 保持现有测试结构，更新断言 |

---

## 10. 验收标准

- [ ] WeekView 默认显示单日内容
- [ ] 顶部日期导航条正常工作
- [ ] 左右箭头切换周正常，带正确滑动方向
- [ ] 智能默认选中逻辑正确
- [ ] 滑动动画流畅（300ms），使用 React key 触发
- [ ] 所有测试通过
- [ ] 符合设计系统规范

---

## 11. 下一步

完成本阶段后，进入 **Phase 3: 集成与测试**。
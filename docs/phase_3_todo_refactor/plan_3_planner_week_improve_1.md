# Phase 1: 基础组件 - WeekDateNav

> 文档版本: 1.0
> 创建日期: 2026-03-18
> 所属方案: Week View 改进方案（单日展示 + 日期切换）

---

## 1. 背景与目标

### 1.1 问题陈述

当前 WeekView 同时显示 7 天的内容（7 列布局），在 PlannerPanel 仅占 ~35% 屏幕宽度的情况下，导致：

1. **信息密度过高** - 每列最小 140px，7 列 = 980px，需横向滚动，用户体验差
2. **视觉繁杂** - 用户难以聚焦当前任务
3. **交互成本高** - 需频繁滚动查看不同日期

### 1.2 本阶段目标

创建 `WeekDateNav` 日期导航条组件，为后续 WeekView 重构提供基础组件。

核心功能：
- 顶部显示一周 7 天缩略，点击切换
- 左右箭头切换上/下周
- 支持选中态和今天指示

---

## 2. UI 设计

### 2.1 布局结构

```
┌──────────────────────────────────────────────┐
│  <  日 16  一 17  二 18  三 19  ...  六 21  >  │  ← 日期导航条
│              ┌───┐                           │
│              │18│ ← 选中态（bg-blue-600）      │
│              └───┘                           │
│       ┌─┐                                   │
│       │●│ ← 今天指示（小圆点，非选中态）        │
│       └─┘                                   │
└──────────────────────────────────────────────┘
```

> **视觉层级说明**：选中日期使用填充背景（强焦点），今天使用小圆点指示（弱提示），两者不冲突。

### 2.2 样式规范

| 元素 | 样式 | 说明 |
|------|------|------|
| 箭头按钮 | `p-2 text-gray-500 hover:text-gray-700` | 左右切换周 |
| 日期项 | `px-3 py-2 rounded-md text-center` | 可点击 |
| **选中态** | `bg-blue-600 text-white` | 强视觉焦点（无论是否为今天） |
| **今天（非选中）** | `text-blue-600 font-bold` | 主色文本 + 粗体，或日期下方加小圆点指示 |
| 普通日期 | `hover:bg-gray-50` | hover 效果 |

> **设计原则**：选中态与今天指示使用不同的视觉语言，避免背景色竞争。选中态使用填充背景（强焦点），今天使用文本颜色/圆点指示（弱提示）。

### 2.3 日期格式

```
日 16
一 17
二 18
...
```

- 星期使用中文简称（日、一、二...六）
- 日期使用数字（1-31）

---

## 3. 组件接口设计

### WeekDateNavProps

```typescript
interface WeekDateNavProps {
  /** 当前周的起始日期（周日） */
  weekStart: Date
  /** 当前选中的日期 */
  selectedDate: Date
  /** 选中日期变化回调 */
  onDateSelect: (date: Date) => void
  /** 周变化回调 */
  onWeekChange: (direction: 'prev' | 'next') => void
  className?: string
}
```

---

## 4. 实现任务

| 步骤 | 文件 | 任务 | 风险 |
|------|------|------|------|
| 1.1 | `WeekDateNav.tsx` | 创建日期导航条组件 | 低 |
| 1.2 | `WeekDateNav.test.tsx` | 编写单元测试 | 低 |
| 1.3 | `index.css` | 添加滑动动画 CSS | 低 |

### 4.1 创建 WeekDateNav.tsx

位置：`packages/frontend/src/features/todos/planner/WeekDateNav.tsx`

实现要点：
1. 使用 `date-fns` 的 `startOfWeek`、`addDays`、`format`、`isToday`、`isSameDay` 工具函数
2. 渲染 7 个日期项，从 `weekStart` 开始
3. 箭头按钮触发 `onWeekChange`
4. 日期项点击触发 `onDateSelect`
5. 选中态样式：`bg-blue-600 text-white`
6. 今天指示：`text-blue-600 font-bold` + 小圆点（非选中态）

### 4.2 创建 WeekDateNav.test.tsx

位置：`packages/frontend/src/features/todos/planner/WeekDateNav.test.tsx`

测试用例：
- [ ] 渲染 7 个日期项
- [ ] 选中日期显示 bg-blue-600 text-white（强视觉焦点）
- [ ] 今天（非选中态）显示 text-blue-600 font-bold 或圆点指示
- [ ] 今天被选中时，应用选中态样式（优先）
- [ ] 点击日期触发 onDateSelect
- [ ] 点击左箭头触发 onWeekChange('prev')
- [ ] 点击右箭头触发 onWeekChange('next')

### 4.3 添加滑动动画 CSS

位置：`packages/frontend/src/index.css`

```css
/* 日期切换滑动动画 */
@keyframes slide-left {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slide-right {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.animate-slide-left {
  animation: slide-left 300ms ease-out;
}

.animate-slide-right {
  animation: slide-right 300ms ease-out;
}
```

---

## 5. 文件变更清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `WeekDateNav.tsx` | 日期导航条组件 |
| `WeekDateNav.test.tsx` | 导航条测试 |

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `index.css` | 添加滑动动画 |

---

## 6. 依赖

- `date-fns`：日期处理工具库
- React 18+
- Tailwind CSS

---

## 7. 验收标准

- [ ] WeekDateNav 组件渲染正确
- [ ] 选中态与今天指示视觉区分明确
- [ ] 所有测试通过
- [ ] 符合设计系统规范

---

## 8. 下一步

完成本阶段后，进入 **Phase 2: WeekView 重构**。
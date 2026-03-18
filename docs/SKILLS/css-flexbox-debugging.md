---
name: css-flexbox-debugging
description: CSS Flexbox布局问题排查模式，特别是sticky元素、滚动容器和背景截断问题
version: 1.0.0
source: local-git-analysis
analyzed_commits: 1
---

# CSS Flexbox 布局调试模式

## 问题特征

当遇到以下症状时，使用此调试模式：

| 症状 | 可能原因 |
|------|----------|
| sticky 元素背景在滚动时被截断 | flex `align-items: stretch` 拉伸子元素到容器高度 |
| `h-full` 或 `h-100%` 不生效 | 父容器缺少明确高度或 `min-h-0` |
| flex 子元素高度不符合预期 | 默认 `align-items: stretch` 行为 |
| 滚动容器内容被截断 | flex 容器缺少 `min-h-0` |

---

## 核心概念

### 1. Flexbox 默认行为陷阱

```css
/* flex 容器默认值 */
display: flex;
align-items: stretch;  /* ← 关键：垂直拉伸子元素 */

/* 这意味着子元素会被拉伸到容器高度，而非内容高度 */
```

### 2. `min-h-0` 的必要性

在 flex 容器中使用 `overflow-*` 时：

```tsx
// ❌ 错误：缺少 min-h-0
<div className="flex-1 overflow-hidden">

// ✅ 正确：添加 min-h-0
<div className="flex-1 min-h-0 overflow-hidden">
```

**原理**：浏览器默认 `min-height: auto`，会阻止 flex 子元素收缩到内容以下。

### 3. `sticky` 与 Flexbox 的交互

```tsx
// 问题场景
<div className="flex overflow-y-auto">
  <div className="sticky left-0 bg-gray-50">
    <TimeAxis />  {/* 内容高度 1440px */}
  </div>
  <HourSlots />  {/* 驱动滚动 */}
</div>

// sticky 元素被 stretch 到视口高度 (~600px)
// 背景只覆盖 600px，下方内容无背景
```

---

## 调试检查清单

### Step 1: 检查布局链

从问题元素向上追溯，检查每一层：

```
问题元素 → 父容器 → 祖父容器 → ... → 根容器
```

**检查项**：
- [ ] 每一层 flex 容器是否需要 `min-h-0`
- [ ] `h-full` 是否有明确的父级高度支持
- [ ] `overflow-*` 是否在正确的层级

### Step 2: 识别 Flex 拉伸问题

**症状**：子元素高度被"锁定"在视口/容器高度，而非内容高度

**验证方法**：
```tsx
// 临时添加 items-start 观察效果
<div className="flex items-start">
```

如果问题消失，确认是 `align-items: stretch` 导致。

### Step 3: 解决方案选择

| 场景 | 解决方案 |
|------|----------|
| 希望高度由内容决定 | 添加 `items-start` |
| 希望 sticky 元素与滚动内容同步 | 移除 `h-full`/`self-stretch`，让内容撑开高度 |
| flex 子元素需要滚动 | 添加 `min-h-0` |

---

## 常见修复模式

### 模式 1: Sticky 侧边栏背景截断

```tsx
// ❌ 问题代码
<div className="flex overflow-y-auto">
  <div className="sticky left-0 bg-gray-50 shrink-0">
    <Sidebar />  {/* 内容高度 > 视口高度 */}
  </div>
  <Content />
</div>

// ✅ 修复：添加 items-start
<div className="flex overflow-y-auto items-start">
  <div className="sticky left-0 bg-gray-50 shrink-0">
    <Sidebar />
  </div>
  <Content />
</div>
```

### 模式 2: flex-1 + overflow 不生效

```tsx
// ❌ 问题代码
<div className="flex flex-col h-screen">
  <Header />
  <div className="flex-1 overflow-auto">  {/* 不生效 */}
    <Content />
  </div>
</div>

// ✅ 修复：添加 min-h-0
<div className="flex flex-col h-screen">
  <Header />
  <div className="flex-1 min-h-0 overflow-auto">
    <Content />
  </div>
</div>
```

### 模式 3: h-full 链断裂

```tsx
// ❌ 问题代码
<div className="h-screen">
  <div className="flex flex-col">  {/* 缺少 h-full */}
    <Child className="h-full" />   {/* 不生效 */}
  </div>
</div>

// ✅ 修复：补全 h-full 链
<div className="h-screen">
  <div className="flex flex-col h-full">
    <Child className="h-full" />
  </div>
</div>
```

---

## 调试工具

### 浏览器 DevTools

1. **检查计算样式**
   - 查看 `align-items` 值
   - 查看 `min-height` 计算值

2. **可视化 flex 布局**
   - 在 Elements 面板选中 flex 容器
   - 查看布局边框和尺寸

3. **临时覆盖样式**
   ```css
   /* 快速验证是否是 stretch 问题 */
   .debug { align-items: flex-start !important; }
   ```

---

## 案例回顾

### TimeAxis 背景截断问题

**现象**：左侧时间轴的浅灰色背景只显示到 10:00（~600px），下方内容无背景。

**排查过程**：
1. 初步怀疑 sticky + 滚动容器交互问题
2. 检查完整布局链，发现多处 `min-h-0` 缺失
3. 尝试 `self-stretch`，问题依旧
4. **最终发现**：flex 容器默认 `align-items: stretch` 将 TimeAxis wrapper 拉伸到视口高度

**根本原因**：
- TimeAxis 内容高度：24 × 60px = 1440px
- flex 容器将其拉伸到视口高度：~600px
- 背景色应用在 wrapper 上，只覆盖 600px

**解决方案**：
```tsx
<div className="flex overflow-y-auto items-start">
```

---

## 关键记忆点

> **`shrink-0` 只阻止收缩，不阻止拉伸！**

> **`sticky` 元素在 flex 容器中会被 `align-items: stretch` 拉伸**

> **flex-1 + overflow 必须搭配 min-h-0**

---

## 相关资源

- [MDN: Flexbox align-items](https://developer.mozilla.org/en-US/docs/Web/CSS/align-items)
- [CSS Tricks: Flexbox min-height](https://css-tricks.com/flexbox-truncated-text/)
- [W3C: Flexbox auto min-size](https://drafts.csswg.org/css-flexbox/#min-size-auto)
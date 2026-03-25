# Plan 13.6: 新邮件提示组件（todo）

**Project**: NanoMail - Email client application
**Date**: 2026-03-25
**Phase**: 6 of 6

---

## 项目背景

**问题:** 当前 Inbox 页面只加载第一页 10 封邮件，用户无法查看更多邮件。后端 API 已支持分页，但前端缺少分页 UI。

**解决方案:** 实现无限滚动（Infinite Scroll），使用 TanStack Query 的 `useInfiniteQuery` 配合 IntersectionObserver 监听底部触发器，自动加载更多邮件。

**预期结果:** 用户可以流畅滚动浏览所有邮件，无需手动翻页。

---

## 本阶段目标

创建新邮件悬浮提示组件，当 Sync 完成并有新邮件时，显示在列表顶部，点击后刷新列表。

---

## Phase 6 任务：新邮件提示组件

**文件:** `packages/frontend/src/components/NewEmailsPill.tsx`

---

## 组件定位说明

### 重要：定位方式

`NewEmailsPill` 必须放在带有 `relative` 定位的 `EmailListPane` 内部，这样药丸提示才会相对于邮件列表居中，而不是整个页面。

```tsx
// ✅ 正确：药丸在列表内部，相对列表居中
<div ref={containerRef} className="... relative">
  {newEmailsCount > 0 && <NewEmailsPill ... />}
  {/* 邮件列表内容 */}
</div>

// ❌ 错误：药丸在父级 Flex 容器中，会遮挡右侧详情页
<div className="flex relative">
  {newEmailsCount > 0 && <NewEmailsPill ... />}  // 这会出现在整个屏幕中央
  <div>...</div>
  <div>...</div>
</div>
```

### 布局示意图

```
┌─────────────────────────────────────────────────────────────┐
│ InboxPage                                                    │
├─────────────────────────────────────────────────────────────┤
├───────────────────┬─────────────────────────────────────────┤
│ EmailListPane     │ EmailDetailPanel                        │
│ (relative)        │                                         │
│ ┌───────────────┐ │                                         │
│ │   [药丸提示]  │ │ ← 悬浮在列表内部，相对于列表居中        │
│ │   (absolute)  │ │                                         │
│ ├───────────────┤ │                                         │
│ │ EmailCard     │ │                                         │
│ │ EmailCard     │ │                                         │
│ │ ...           │ │                                         │
│ └───────────────┘ │                                         │
└───────────────────┴─────────────────────────────────────────┘
```

---

## 组件实现

```typescript
import { Mail } from 'lucide-react'
import { Button } from './ui/button'

interface NewEmailsPillProps {
  count: number
  onClick: () => void
}

export function NewEmailsPill({ count, onClick }: NewEmailsPillProps) {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className="rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 animate-bounce-subtle"
      >
        <Mail className="h-4 w-4 mr-2" />
        发现 {count} 封新邮件，点击查看
      </Button>
    </div>
  )
}
```

---

## 样式说明

### 定位样式

```css
/* 容器定位 */
absolute         /* 绝对定位 */
top-2            /* 距顶部 8px */
left-1/2         /* 左边距 50% */
-translate-x-1/2 /* 水平居中（左移自身宽度的 50%）*/
z-10             /* 确保在列表内容之上 */
```

### 按钮样式

```css
/* 按钮样式 */
rounded-full              /* 圆角药丸形状 */
shadow-lg                 /* 大阴影，突出悬浮感 */
bg-primary                /* 主色调背景 */
text-primary-foreground   /* 主色调前景文字 */
hover:bg-primary/90       /* 悬停时略微变暗 */
animate-bounce-subtle     /* 轻微弹跳动画 */
```

---

## 动画样式

### Tailwind 配置

在 `tailwind.config.js` 中添加自定义动画：

```javascript
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        }
      },
      animation: {
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      }
    }
  }
}
```

### CSS 方式

在全局 CSS 文件中添加：

```css
@keyframes bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.animate-bounce-subtle {
  animation: bounce-subtle 2s ease-in-out infinite;
}
```

---

## 使用示例

### 在 InboxPage 中使用

```typescript
import { NewEmailsPill } from '@/components/NewEmailsPill'

export function InboxPage() {
  const [newEmailsCount, setNewEmailsCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const { refetch } = useInfiniteEmails({...})

  const handleViewNewEmails = useCallback(() => {
    setNewEmailsCount(0)
    refetch()
    containerRef.current?.scrollTo(0, 0)
  }, [refetch])

  return (
    <div ref={containerRef} className="w-[350px] overflow-y-auto relative">
      {/* 新邮件提示 */}
      {newEmailsCount > 0 && (
        <NewEmailsPill
          count={newEmailsCount}
          onClick={handleViewNewEmails}
        />
      )}

      {/* 邮件列表 */}
      {/* ... */}
    </div>
  )
}
```

---

## 交互流程

```
1. Sync 完成，有新邮件
   ↓
2. setNewEmailsCount(count)
   ↓
3. NewEmailsPill 显示（带动画）
   ↓
4. 用户点击药丸
   ↓
5. setNewEmailsCount(0)  → 药丸消失
6. refetch()             → 重新获取邮件
7. scrollTo(0, 0)        → 滚动到顶部
```

---

## 可选增强

### 1. 自动消失

```typescript
// 5 秒后自动消失
useEffect(() => {
  if (newEmailsCount === 0) return

  const timer = setTimeout(() => {
    setNewEmailsCount(0)
  }, 5000)

  return () => clearTimeout(timer)
}, [newEmailsCount])
```

### 2. 进入/退出动画

```typescript
// 使用 framer-motion
import { motion, AnimatePresence } from 'framer-motion'

<AnimatePresence>
  {newEmailsCount > 0 && (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-2 left-1/2 -translate-x-1/2 z-10"
    >
      <Button ...>...</Button>
    </motion.div>
  )}
</AnimatePresence>
```

### 3. 多语言支持

```typescript
// 使用 i18n
import { useTranslation } from 'react-i18next'

const { t } = useTranslation()

<Button ...>
  <Mail className="h-4 w-4 mr-2" />
  {t('inbox.newEmails', { count })}
</Button>
```

---

## 依赖关系

### 前置阶段
- [Phase 5](plan_13_5.md): InboxPage 改造

### 依赖组件
- `@/components/ui/button` - Button 组件
- `lucide-react` - Mail 图标

---

## 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/frontend/src/components/NewEmailsPill.tsx` | CREATE | 新邮件悬浮提示组件 |
| `packages/frontend/tailwind.config.js` | MODIFY | 添加 bounce-subtle 动画（可选） |

---

## 验收标准

- [ ] 组件正确显示在列表顶部中央
- [ ] 点击后调用 onClick 回调
- [ ] 动画效果正常
- [ ] 不遮挡右侧详情面板
- [ ] z-index 正确，在列表内容之上

---

## 预估时间: 0.5 hours

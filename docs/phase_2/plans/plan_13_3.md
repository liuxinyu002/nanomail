# Plan 13.3: EmailCard Memoization

**Project**: NanoMail - Email client application
**Date**: 2026-03-25
**Phase**: 3 of 6

---

## 项目背景

**问题:** 当前 Inbox 页面只加载第一页 10 封邮件，用户无法查看更多邮件。后端 API 已支持分页，但前端缺少分页 UI。

**解决方案:** 实现无限滚动（Infinite Scroll），使用 TanStack Query 的 `useInfiniteQuery` 配合 IntersectionObserver 监听底部触发器，自动加载更多邮件。

**预期结果:** 用户可以流畅滚动浏览所有邮件，无需手动翻页。

---

## 本阶段目标

优化 EmailCard 组件的渲染性能，确保无限滚动场景下列表渲染的流畅性。

---

## Phase 3 任务：EmailCard Memoization

**文件:** `packages/frontend/src/features/inbox/EmailCard.tsx`

---

## 问题分析

### 原方案问题

`prevProps.email.id === nextProps.email.id` 的判断过于粗暴，当邮件状态发生改变时（例如：从"未读"变为"已读"、打上星标），因为 ID 没变，卡片将永远不会重新渲染。

```typescript
// ❌ 错误：只比较 ID，忽略其他属性变化
export const EmailCard = memo(function EmailCard(props) {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.email.id === nextProps.email.id
})
```

### 影响

- 邮件标记已读后，UI 不会更新
- 星标状态变化后，UI 不会更新
- 任何邮件属性变化都无法反映到界面

---

## 解决方案

### 移除自定义比较函数

信任 React 默认的浅比较（shallow comparison）：

```typescript
import { memo } from 'react'
import type { Email } from '@nanomail/shared'

interface EmailCardProps {
  email: Email
  selected: boolean
  onSelect: (id: number) => void
  activeId?: number
  onCardClick: (id: number) => void
  selectionDisabled: boolean
}

// ✅ 移除自定义比较函数，使用 React 默认浅比较
export const EmailCard = memo(function EmailCard({
  email,
  selected,
  onSelect,
  activeId,
  onCardClick,
  selectionDisabled
}: EmailCardProps) {
  // ... 现有实现
})
// 不传第二个参数，让 React 使用默认浅比较
```

---

## 不可变数据模式要求

使用 React 默认浅比较要求父组件在更新邮件时生成新的 email 对象（而不是直接修改原对象）。

### 正确做法

```typescript
// ✅ 正确：创建新对象
const updatedEmail = { ...email, isRead: true }
setEmails(emails.map(e => e.id === email.id ? updatedEmail : e))

// ✅ 正确：使用 immer
import { produce } from 'immer'
setEmails(produce(draft => {
  const email = draft.find(e => e.id === id)
  if (email) email.isRead = true
}))
```

### 错误做法

```typescript
// ❌ 错误：直接修改原对象
const email = emails.find(e => e.id === id)
email.isRead = true  // 直接修改
setEmails([...emails])  // 引用相同，React.memo 不会触发重渲染
```

---

## 关于 CSS content-visibility

**原方案考虑过使用 `content-visibility: auto` 优化渲染，但已废弃。**

**原因：**
- 在无限滚动场景下会导致滚动跳动
- IntersectionObserver 与 content-visibility 存在兼容问题
- 收益不如预期

**结论：** 使用 React.memo 足够满足性能需求。

---

## 完整组件示例

```typescript
import { memo } from 'react'
import { Mail, Star, Paperclip, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { EmailListItem } from '@nanomail/shared'

interface EmailCardProps {
  email: EmailListItem
  selected: boolean
  onSelect: (id: number) => void
  activeId?: number
  onCardClick: (id: number) => void
  selectionDisabled: boolean
}

export const EmailCard = memo(function EmailCard({
  email,
  selected,
  onSelect,
  activeId,
  onCardClick,
  selectionDisabled
}: EmailCardProps) {
  const isActive = activeId === email.id
  const isUnread = !email.isRead

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (!selectionDisabled) {
      onSelect(email.id)
    }
  }

  const handleCardClick = () => {
    onCardClick(email.id)
  }

  return (
    <div
      className={cn(
        'p-3 border rounded-lg cursor-pointer transition-colors',
        isActive && 'border-primary bg-primary/5',
        isUnread && 'bg-blue-50/50',
        selected && 'ring-2 ring-primary'
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={handleCheckboxChange}
          disabled={selectionDisabled}
          className="mt-1"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-medium truncate', isUnread && 'font-bold')}>
              {email.sender}
            </span>
            {email.hasAttachment && <Paperclip className="h-3 w-3 shrink-0" />}
            {email.isStarred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
          </div>
          <p className={cn('text-sm truncate', isUnread && 'font-semibold')}>
            {email.subject}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {email.preview}
          </p>
        </div>

        {/* Date */}
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(email.date))}
        </span>
      </div>
    </div>
  )
})
```

---

## 依赖关系

### 前置阶段
- 无（独立优化）

### 后续阶段
- [Phase 5](plan_13_5.md): InboxPage 使用 EmailCard

---

## 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/frontend/src/features/inbox/EmailCard.tsx` | MODIFY | 移除自定义 memo 比较函数 |

---

## 验收标准

- [ ] 邮件标记已读后，卡片样式正确更新
- [ ] 星标状态变化后，卡片正确显示
- [ ] 滚动时卡片不会不必要地重渲染
- [ ] 选中状态变化时卡片正确更新
- [ ] 活跃邮件高亮正确显示

---

## 预估时间: 0.5 hours

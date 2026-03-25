# Plan 13: Inbox 无限滚动分页功能

**Project**: NanoMail - Email client application
**Date**: 2026-03-25

---

## Context

**Problem:** 当前 Inbox 页面只加载第一页 10 封邮件，用户无法查看更多邮件。后端 API 已支持分页，但前端缺少分页 UI。

**Solution:** 实现无限滚动（Infinite Scroll），使用 TanStack Query 的 `useInfiniteQuery` 配合 IntersectionObserver 监听底部触发器，自动加载更多邮件。

**Outcome:** 用户可以流畅滚动浏览所有邮件，无需手动翻页。

---

## ⚠️ 技术选型决策 (CRITICAL)

### 评估结果

项目已接入 **TanStack Query v5** (`@tanstack/react-query@5.90.21`)。

### 决策：使用原生 useInfiniteQuery

**废弃手写 useInfiniteScroll Hook**，直接使用 TanStack Query 提供的 `useInfiniteQuery`。

**原因：**
- 手写 Hook 会丢失全局缓存
- 无法享受乐观更新（如点击立即标记已读）
- 后台自动 Refetch 特性丢失
- 增加维护成本，与现有 Query 生态不一致

---

## Requirements Summary

| 需求项 | 方案 |
|--------|------|
| 分页模式 | 无限滚动 |
| 滚动容器 | 左侧列表容器内滚动 |
| 触发机制 | IntersectionObserver 监听底部占位元素 |
| 数据获取 | TanStack Query useInfiniteQuery |
| 防重复加载 | useInfiniteQuery 内置 isFetchingNextPage |
| 数据合并 | useInfiniteQuery pages 扁平化 + 基于 email.id 去重 |
| 边界处理 | !hasNextPage 显示"到底了" |
| 安全上限 | 最多加载 200 封邮件 |
| 筛选切换 | queryKey 变化自动重置 |
| 选中状态 | 切换时清空，用 email.id 标识 |
| Sync 刷新 | 顶部悬浮提示"发现 X 封新邮件" |
| 详情面板 | 独立于列表状态，保持显示 |
| 错误处理 | 底部显示错误提示 + 重试按钮 |
| 性能优化 | React.memo（移除 CSS content-visibility） |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ InboxPage                                                    │
├─────────────────────────────────────────────────────────────┤
├───────────────────┬─────────────────────────────────────────┤
│ EmailListPane     │ EmailDetailPanel                        │
│ (relative)        │ (独立状态)                               │
│ ┌───────────────┐ │                                         │
│ │[新邮件提示]   │ │ ← 悬浮药丸按钮，相对于列表居中          │
│ ├───────────────┤ │                                         │
│ │ EmailCard     │ │                                         │
│ │ EmailCard     │ │                                         │
│ │ ...           │ │                                         │
│ │ EmailCard     │ │                                         │
│ │               │ │                                         │
│ │ [Trigger]     │ │ ← IntersectionObserver 监听             │
│ │ "加载中..."   │ │                                         │
│ │ 或 "到底了"   │ │                                         │
│ │ 或 "重试"     │ │                                         │
│ └───────────────┘ │                                         │
└───────────────────┴─────────────────────────────────────────┘
```

---

## State Management

### useInfiniteQuery 状态

```typescript
const {
  data,              // { pages: EmailsResponse[], pageParams: unknown[] }
  fetchNextPage,     // 加载下一页
  hasNextPage,       // 是否有更多页
  isFetchingNextPage,// 正在加载下一页
  isLoading,         // 首次加载
  isError,           // 是否有错误
  error,             // 错误对象
  refetch            // 重新加载
} = useInfiniteQuery({
  queryKey: ['emails', classificationFilter],
  queryFn: ({ pageParam }) => fetchEmails(pageParam),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined
})
```

### 本地状态

```typescript
// 选中状态
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

// 新邮件提示
const [newEmailsCount, setNewEmailsCount] = useState(0)

// 滚动容器 ref
const listContainerRef = useRef<HTMLDivElement>(null)

// 触发器 ref
const loadMoreTriggerRef = useRef<HTMLDivElement>(null)

// Observer 状态缓存（解决闭包陷阱）
const isFetchingRef = useRef(false)
const hasNextPageRef = useRef(true)
const isErrorRef = useRef(false)
```

---

## Implementation Phases

| Phase | File | Description |
|-------|------|-------------|
| [Phase 1](#phase-1-useinfiniteemails-hook) | `hooks/useInfiniteEmails.ts` | 基于 useInfiniteQuery 的 Hook |
| [Phase 2](#phase-2-intersectionobserver-优化) | `hooks/useInfiniteEmails.ts` | Observer 闭包陷阱修复 |
| [Phase 3](#phase-3-emailcard-memoization) | `features/inbox/EmailCard.tsx` | React.memo 优化 |
| [Phase 4](#phase-4-emailservice-更新) | `services/email.service.ts` | 支持 AbortSignal |
| [Phase 5](#phase-5-inboxpage-改造) | `features/inbox/InboxPage.tsx` | 集成无限滚动 |
| [Phase 6](#phase-6-新邮件提示组件) | `components/NewEmailsPill.tsx` | 悬浮提示组件 |

---

## Phase 1: useInfiniteEmails Hook

**File:** `packages/frontend/src/hooks/useInfiniteEmails.ts`

### Hook 接口设计

```typescript
interface UseInfiniteEmailsOptions {
  classification?: EmailClassification | 'ALL'
  limit?: number
  maxItems?: number
}

interface UseInfiniteEmailsReturn {
  emails: EmailListItem[]
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  error: Error | null
  fetchNextPage: () => void
  refetch: () => void
  triggerRef: RefObject<HTMLDivElement>
  containerRef: RefObject<HTMLDivElement>
  hasReachedLimit: boolean
}
```

### 核心实现逻辑

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef, useCallback, type RefObject } from 'react'
import { EmailService } from '../services/email.service'
import type { EmailListItem, EmailClassification } from '@nanomail/shared'

const DEFAULT_LIMIT = 10
const MAX_ITEMS = 200

export function useInfiniteEmails(options: UseInfiniteEmailsOptions = {}) {
  const {
    classification = 'ALL',
    limit = DEFAULT_LIMIT,
    maxItems = MAX_ITEMS
  } = options

  // ========== Refs ==========
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // 状态缓存（解决 Observer 闭包陷阱）
  const isFetchingRef = useRef(false)
  const hasNextPageRef = useRef(true)
  const isErrorRef = useRef(false)

  // ========== useInfiniteQuery ==========
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['emails', classification],
    queryFn: async ({ pageParam, signal }) => {
      const result = await EmailService.getEmails({
        page: pageParam as number,
        limit,
        classification: classification === 'ALL' ? undefined : classification,
        signal
      })
      return result
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
    staleTime: 30_000, // 30 秒内不重新获取
  })

  // ========== 扁平化邮件列表 ==========
  const emails = data?.pages.flatMap(page => page.emails) ?? []

  // ========== 去重 ==========
  const uniqueEmails = emails.filter((email, index, self) =>
    index === self.findIndex(e => e.id === email.id)
  )

  // ========== 安全上限检查 ==========
  const hasReachedLimit = uniqueEmails.length >= maxItems

  // ========== 同步 Ref 状态 ==========
  useEffect(() => {
    isFetchingRef.current = isFetchingNextPage
  }, [isFetchingNextPage])

  useEffect(() => {
    hasNextPageRef.current = hasNextPage && !hasReachedLimit
  }, [hasNextPage, hasReachedLimit])

  useEffect(() => {
    isErrorRef.current = isError
  }, [isError])

  // ========== IntersectionObserver 设置 ==========
  // 注意：依赖空数组，只初始化一次，避免销毁重建
  useEffect(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry.isIntersecting) return

        // 通过 ref 读取最新状态，避免闭包陷阱
        if (isFetchingRef.current) return
        if (!hasNextPageRef.current) return
        if (isErrorRef.current) return  // 错误时禁止自动加载

        fetchNextPage()
      },
      { root: containerRef.current, threshold: 0.1 }
    )

    observerRef.current.observe(trigger)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [fetchNextPage]) // 只依赖 fetchNextPage

  return {
    emails: uniqueEmails,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage && !hasReachedLimit,
    error: error as Error | null,
    fetchNextPage,
    refetch,
    triggerRef,
    containerRef,
    hasReachedLimit
  }
}
```

---

## Phase 2: IntersectionObserver 优化要点

### 问题 1：状态竞态与闭包陷阱

**原方案问题：** 在 resetTrigger 的 useEffect 中连续调用 reset() 和 loadMore()，由于 setState 是异步的，loadMore 会读取到旧的 page 值导致请求错乱。

**解决方案：** 使用 useInfiniteQuery 后，queryKey 变化会自动重置并重新获取，无需手动调用 loadMore。

### 问题 2：Observer 依赖抖动

**原方案问题：** Observer 的 useEffect 依赖了 `[hasMore, isFetching, loadMore]`，每次状态切换都会导致 Observer 销毁并重建，极易在快速滚动时丢失事件。

**解决方案：** 使用 useRef 缓存状态，Observer 初始化时只依赖 `fetchNextPage`：

```typescript
// 状态缓存
const isFetchingRef = useRef(false)
const hasNextPageRef = useRef(true)
const isErrorRef = useRef(false)

// 同步状态到 ref
useEffect(() => {
  isFetchingRef.current = isFetchingNextPage
}, [isFetchingNextPage])

// Observer 只初始化一次
useEffect(() => {
  // ...observer setup
}, [fetchNextPage]) // 最小依赖
```

### 问题 3：错误状态下的自动加载

**原方案问题：** 网络错误时，用户滚动仍会触发失败的请求。

**解决方案：** 在 Observer 回调中增加错误判断：

```typescript
if (isErrorRef.current) return  // 错误时禁止自动加载
```

用户只能通过点击"重试"按钮调用 `refetch()` 或 `fetchNextPage()` 来恢复。

---

## Phase 3: EmailCard Memoization

**File:** `packages/frontend/src/features/inbox/EmailCard.tsx`

### 修正后的 React.memo

**原方案问题：** `prevProps.email.id === nextProps.email.id` 的判断过于粗暴，当邮件状态发生改变（例如：从"未读"变为"已读"、打上星标）时，因为 ID 没变，卡片将永远不会重新渲染。

**解决方案：** 移除自定义比较函数，信任 React 默认的浅比较。

```typescript
import { memo } from 'react'

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

**注意：** 这要求父组件在更新邮件时生成新的 email 对象（而不是直接修改原对象），这是 React 推荐的不可变数据模式。

---

## Phase 4: EmailService 更新

**File:** `packages/frontend/src/services/email.service.ts`

### 添加 AbortSignal 支持

```typescript
export interface EmailsQuery {
  page?: number
  limit?: number
  processed?: boolean
  classification?: EmailClassification
  signal?: AbortSignal  // 新增
}

export const EmailService = {
  async getEmails(query: EmailsQuery = {}): Promise<EmailsResponse> {
    const { page = 1, limit = 10, processed, classification, signal } = query

    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))

    if (processed !== undefined) {
      params.set('processed', String(processed))
    }
    if (classification) {
      params.set('classification', classification)
    }

    const response = await fetch(`/api/emails?${params.toString()}`, { signal })

    if (!response.ok) {
      throw new Error('Failed to fetch emails')
    }

    return response.json()
  },

  // ... 其他方法保持不变
}
```

---

## Phase 5: InboxPage 改造

**File:** `packages/frontend/src/features/inbox/InboxPage.tsx`

### 主要变更

1. **移除** 现有的 `useQuery` 获取邮件列表
2. **引入** `useInfiniteEmails` hook
3. **移除** Sync 完成后的强制 reset()
4. **新增** 新邮件悬浮提示

### 核心代码

```typescript
export function InboxPage() {
  // ... 现有状态保留

  // 新邮件提示状态
  const [newEmailsCount, setNewEmailsCount] = useState(0)

  // 使用无限滚动 Hook
  const {
    emails,
    isFetchingNextPage,
    isLoading,
    hasNextPage,
    error: loadError,
    fetchNextPage,
    refetch,
    triggerRef,
    containerRef,
    hasReachedLimit
  } = useInfiniteEmails({
    classification: classificationFilter,
    limit: 10,
    maxItems: 200
  })

  // ========== 筛选切换处理 ==========
  const handleClassificationChange = useCallback((newFilter: EmailClassification | 'ALL') => {
    // 清空选中状态
    setSelectedIds(new Set())
    // 清空新邮件提示
    setNewEmailsCount(0)
    // queryKey 变化会自动触发 useInfiniteQuery 重置
    setClassificationFilter(newFilter)
  }, [])

  // ========== Sync 完成后处理 ==========
  // 修改：不再强制 reset()，改为显示新邮件提示
  useEffect(() => {
    // ... 现有 poll 逻辑
    if (job.status === 'completed') {
      const count = job.result?.newEmailsCount ?? 0
      toast.success(`Sync completed, ${count} new email${count !== 1 ? 's' : ''}`)
      setSyncingJobId(null)

      // 修改：显示新邮件提示，而不是强制 reset
      if (count > 0) {
        setNewEmailsCount(count)
      }
    }
  }, [syncingJobId])

  // ========== 点击新邮件提示 ==========
  const handleViewNewEmails = useCallback(() => {
    setNewEmailsCount(0)
    refetch()
    // 滚动到顶部
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [refetch])

  // ========== 渲染 ==========
  return (
    <div className="h-full flex flex-col">
      {/* Header - 保持不变 */}

      <div className="flex-1 flex min-h-0">
        {/* Left Pane: Email List (relative 定位，让药丸相对于列表居中) */}
        <div
          ref={containerRef}
          className="w-[350px] border-r border-gray-200 overflow-y-auto relative"
          data-testid="email-list-pane"
        >
          {/* 新邮件提示 - 悬浮药丸按钮，放在列表内部 */}
          {newEmailsCount > 0 && (
            <NewEmailsPill
              count={newEmailsCount}
              onClick={handleViewNewEmails}
            />
          )}
          {/* 首次加载骨架屏 */}
          {isLoading && emails.length === 0 && <EmailSkeleton />}

          {/* 空状态 */}
          {!isLoading && emails.length === 0 && <EmptyInbox />}

          {/* 邮件列表 */}
          {emails.length > 0 && (
            <div className="p-4 space-y-2">
              {emails.map((email) => (
                <EmailCard
                  key={email.id}
                  email={{ ...email, date: new Date(email.date) }}
                  selected={selectedIds.has(email.id)}
                  onSelect={handleSelect}
                  activeId={activeId ?? undefined}
                  onCardClick={(id) => navigate(`/inbox/${id}`)}
                  selectionDisabled={isSelectionDisabled(email.id)}
                />
              ))}
            </div>
          )}

          {/* 底部触发器 */}
          <div ref={triggerRef} className="p-4">
            {/* 加载中 */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* 到底了 */}
            {!hasNextPage && !isFetchingNextPage && emails.length > 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                已经到底了
              </div>
            )}

            {/* 错误 + 重试 */}
            {loadError && (
              <div className="flex flex-col items-center py-4">
                <p className="text-sm text-destructive mb-2">加载失败</p>
                <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
                  重试
                </Button>
              </div>
            )}

            {/* 达到上限提示 */}
            {hasReachedLimit && (
              <div className="text-center text-sm text-muted-foreground py-4">
                已加载 200 封邮件，请使用搜索查找更多
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - 保持不变 */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-white">
          <EmailDetailPanel
            emailId={activeId}
            onClose={() => navigate('/inbox')}
          />
        </div>
      </div>

      {/* Floating action button - 保持不变 */}
    </div>
  )
}
```

---

## Phase 6: 新邮件提示组件

**File:** `packages/frontend/src/components/NewEmailsPill.tsx`

### 定位说明

**重要：** `NewEmailsPill` 必须放在带有 `relative` 定位的 `EmailListPane` 内部，这样药丸提示才会相对于邮件列表居中，而不是整个页面。

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

### 组件实现

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

### 动画样式（可选）

在 Tailwind 配置或 CSS 中添加：

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

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `hooks/useInfiniteEmails.ts` | CREATE | 基于 useInfiniteQuery 的无限滚动 Hook |
| `hooks/index.ts` | MODIFY | 导出新 Hook |
| `components/NewEmailsPill.tsx` | CREATE | 新邮件悬浮提示组件 |
| `features/inbox/EmailCard.tsx` | MODIFY | 移除自定义 memo 比较函数 |
| `services/email.service.ts` | MODIFY | 添加 AbortSignal 支持 |
| `features/inbox/InboxPage.tsx` | MODIFY | 集成无限滚动 + 新邮件提示 |

---

## Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| IntersectionObserver 兼容性 | LOW | 现代浏览器全支持 |
| 状态竞态条件 | LOW | useInfiniteQuery 内置处理 + Ref 缓存 |
| Observer 闭包陷阱 | LOW | 使用 Ref 缓存最新状态 |
| 内存占用（大量邮件） | LOW | 200 封上限 |
| 滚动位置丢失 | LOW | 详情面板独立 + 新邮件提示不强制重置 |
| CSS content-visibility 滚动跳动 | N/A | 已移除该优化 |

---

## Testing Checklist

- [ ] 首次加载显示骨架屏
- [ ] 滚动到底部自动加载更多
- [ ] 加载中显示 spinner
- [ ] 到达最后一页显示"到底了"
- [ ] 切换筛选后列表重置
- [ ] 切换筛选时选中状态清空
- [ ] Sync 完成后显示新邮件提示
- [ ] 点击新邮件提示后列表刷新
- [ ] 详情面板保持显示
- [ ] 网络错误显示重试按钮
- [ ] 错误状态下滚动不会触发请求
- [ ] 重试按钮可以恢复加载
- [ ] 快速滚动不会重复加载
- [ ] 达到 200 封上限停止加载
- [ ] 邮件状态变化时卡片正确重渲染

---

## Estimated Complexity: MEDIUM

| Phase | Time |
|-------|------|
| Phase 1: useInfiniteEmails Hook | 1-2 hours |
| Phase 2: Observer 优化 | 0.5 hours |
| Phase 3: EmailCard Memoization | 0.5 hours |
| Phase 4: EmailService Update | 0.5 hours |
| Phase 5: InboxPage Integration | 1-2 hours |
| Phase 6: NewEmailsPill 组件 | 0.5 hours |
| Testing | 1 hour |
| **Total** | **5-7 hours** |

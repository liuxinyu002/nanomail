# Plan 13.1: useInfiniteEmails Hook

**Project**: NanoMail - Email client application
**Date**: 2026-03-25
**Phase**: 1 of 6

---

## 项目背景

**问题:** 当前 Inbox 页面只加载第一页 10 封邮件，用户无法查看更多邮件。后端 API 已支持分页，但前端缺少分页 UI。

**解决方案:** 实现无限滚动（Infinite Scroll），使用 TanStack Query 的 `useInfiniteQuery` 配合 IntersectionObserver 监听底部触发器，自动加载更多邮件。

**预期结果:** 用户可以流畅滚动浏览所有邮件，无需手动翻页。

---

## 技术选型决策

项目已接入 **TanStack Query v5** (`@tanstack/react-query@5.90.21`)。

**决策：使用原生 useInfiniteQuery**

废弃手写 useInfiniteScroll Hook，直接使用 TanStack Query 提供的 `useInfiniteQuery`。

**原因：**
- 手写 Hook 会丢失全局缓存
- 无法享受乐观更新（如点击立即标记已读）
- 后台自动 Refetch 特性丢失
- 增加维护成本，与现有 Query 生态不一致

---

## 需求摘要

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

---

## 整体架构

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

## Phase 1 任务：创建 useInfiniteEmails Hook

**文件:** `packages/frontend/src/hooks/useInfiniteEmails.ts`

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

## 关键实现要点

### 1. 状态管理

```typescript
// useInfiniteQuery 返回的数据结构
const {
  data,              // { pages: EmailsResponse[], pageParams: unknown[] }
  fetchNextPage,     // 加载下一页
  hasNextPage,       // 是否有更多页
  isFetchingNextPage,// 正在加载下一页
  isLoading,         // 首次加载
  isError,           // 是否有错误
  error,             // 错误对象
  refetch            // 重新加载
} = useInfiniteQuery({...})
```

### 2. 数据去重

```typescript
// 基于 email.id 去重，防止重复数据
const uniqueEmails = emails.filter((email, index, self) =>
  index === self.findIndex(e => e.id === email.id)
)
```

### 3. 安全上限

```typescript
// 防止内存占用过大，最多加载 200 封邮件
const hasReachedLimit = uniqueEmails.length >= maxItems
```

### 4. Ref 缓存状态（解决闭包陷阱）

```typescript
// 使用 ref 缓存状态，供 Observer 回调使用
const isFetchingRef = useRef(false)
const hasNextPageRef = useRef(true)
const isErrorRef = useRef(false)

// 同步状态到 ref
useEffect(() => {
  isFetchingRef.current = isFetchingNextPage
}, [isFetchingNextPage])
```

---

## 依赖关系

### 前置条件
- [Phase 4](plan_13_4.md): EmailService 需要支持 AbortSignal 参数

### 后续阶段
- [Phase 2](plan_13_2.md): IntersectionObserver 优化要点
- [Phase 5](plan_13_5.md): InboxPage 集成此 Hook

---

## 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/frontend/src/hooks/useInfiniteEmails.ts` | CREATE | 基于 useInfiniteQuery 的无限滚动 Hook |
| `packages/frontend/src/hooks/index.ts` | MODIFY | 导出新 Hook |

---

## 验收标准

- [ ] Hook 正确返回邮件列表
- [ ] 分页数据正确扁平化
- [ ] 重复邮件被正确去重
- [ ] 达到上限时 hasReachedLimit 为 true
- [ ] IntersectionObserver 正确设置
- [ ] 触发器进入视口时调用 fetchNextPage

---

## 预估时间: 1-2 hours

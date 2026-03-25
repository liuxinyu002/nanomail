# Plan 13.2: IntersectionObserver 优化要点

**Project**: NanoMail - Email client application
**Date**: 2026-03-25
**Phase**: 2 of 6

---

## 项目背景

**问题:** 当前 Inbox 页面只加载第一页 10 封邮件，用户无法查看更多邮件。后端 API 已支持分页，但前端缺少分页 UI。

**解决方案:** 实现无限滚动（Infinite Scroll），使用 TanStack Query 的 `useInfiniteQuery` 配合 IntersectionObserver 监听底部触发器，自动加载更多邮件。

**预期结果:** 用户可以流畅滚动浏览所有邮件，无需手动翻页。

---

## 本阶段目标

修复 Phase 1 中 IntersectionObserver 实现的潜在问题，确保无限滚动的稳定性和正确性。

---

## Phase 2 任务：IntersectionObserver 优化

**文件:** `packages/frontend/src/hooks/useInfiniteEmails.ts`（继续修改）

---

## 问题 1：状态竞态与闭包陷阱

### 问题描述

**原方案问题：** 在 resetTrigger 的 useEffect 中连续调用 reset() 和 loadMore()，由于 setState 是异步的，loadMore 会读取到旧的 page 值导致请求错乱。

### 解决方案

使用 useInfiniteQuery 后，queryKey 变化会自动重置并重新获取，无需手动调用 loadMore。

```typescript
// ❌ 错误：手动调用 loadMore
useEffect(() => {
  if (classificationChanged) {
    reset()
    loadMore() // 可能读取到旧的 page 值
  }
}, [classification])

// ✅ 正确：让 useInfiniteQuery 自动处理
// queryKey 变化时自动重置
const { data } = useInfiniteQuery({
  queryKey: ['emails', classification], // classification 变化时自动重置
  // ...
})
```

---

## 问题 2：Observer 依赖抖动

### 问题描述

**原方案问题：** Observer 的 useEffect 依赖了 `[hasMore, isFetching, loadMore]`，每次状态切换都会导致 Observer 销毁并重建，极易在快速滚动时丢失事件。

```typescript
// ❌ 错误：过多的依赖项
useEffect(() => {
  const observer = new IntersectionObserver(...)
  // ...
}, [hasMore, isFetching, loadMore]) // 每次状态变化都重建 Observer
```

### 解决方案

使用 useRef 缓存状态，Observer 初始化时只依赖 `fetchNextPage`：

```typescript
// 状态缓存
const isFetchingRef = useRef(false)
const hasNextPageRef = useRef(true)
const isErrorRef = useRef(false)

// 同步状态到 ref
useEffect(() => {
  isFetchingRef.current = isFetchingNextPage
}, [isFetchingNextPage])

useEffect(() => {
  hasNextPageRef.current = hasNextPage && !hasReachedLimit
}, [hasNextPage, hasReachedLimit])

useEffect(() => {
  isErrorRef.current = isError
}, [isError])

// Observer 只初始化一次，最小依赖
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
      if (isErrorRef.current) return

      fetchNextPage()
    },
    { root: containerRef.current, threshold: 0.1 }
  )

  observerRef.current.observe(trigger)

  return () => {
    observerRef.current?.disconnect()
  }
}, [fetchNextPage]) // 最小依赖
```

---

## 问题 3：错误状态下的自动加载

### 问题描述

**原方案问题：** 网络错误时，用户滚动仍会触发失败的请求。

### 解决方案

在 Observer 回调中增加错误判断：

```typescript
// Observer 回调中增加错误判断
useEffect(() => {
  observerRef.current = new IntersectionObserver(
    (entries) => {
      const [entry] = entries
      if (!entry.isIntersecting) return

      // 错误时禁止自动加载
      if (isErrorRef.current) return  // ← 关键判断

      fetchNextPage()
    },
    { root: containerRef.current, threshold: 0.1 }
  )
  // ...
}, [fetchNextPage])
```

用户只能通过点击"重试"按钮调用 `refetch()` 或 `fetchNextPage()` 来恢复：

```typescript
// InboxPage 中的重试逻辑
{loadError && (
  <div className="flex flex-col items-center py-4">
    <p className="text-sm text-destructive mb-2">加载失败</p>
    <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
      重试
    </Button>
  </div>
)}
```

---

## 优化后的完整 Observer 代码

```typescript
// ========== Refs ==========
const containerRef = useRef<HTMLDivElement>(null)
const triggerRef = useRef<HTMLDivElement>(null)
const observerRef = useRef<IntersectionObserver | null>(null)

// 状态缓存（解决 Observer 闭包陷阱）
const isFetchingRef = useRef(false)
const hasNextPageRef = useRef(true)
const isErrorRef = useRef(false)

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
useEffect(() => {
  const trigger = triggerRef.current
  if (!trigger) return

  observerRef.current = new IntersectionObserver(
    (entries) => {
      const [entry] = entries
      if (!entry.isIntersecting) return

      // 通过 ref 读取最新状态，避免闭包陷阱
      if (isFetchingRef.current) return      // 正在加载中
      if (!hasNextPageRef.current) return    // 没有更多数据
      if (isErrorRef.current) return         // 错误时禁止自动加载

      fetchNextPage()
    },
    {
      root: containerRef.current,
      threshold: 0.1  // 触发器 10% 可见时触发
    }
  )

  observerRef.current.observe(trigger)

  return () => {
    observerRef.current?.disconnect()
  }
}, [fetchNextPage]) // 只依赖 fetchNextPage
```

---

## 关键优化总结

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 状态竞态 | setState 异步导致读取旧值 | 使用 useInfiniteQuery 自动重置 |
| Observer 抖动 | 依赖项过多导致频繁重建 | 使用 ref 缓存状态，最小化依赖 |
| 错误重复加载 | 错误时仍触发请求 | 增加 isErrorRef 判断 |

---

## 依赖关系

### 前置阶段
- [Phase 1](plan_13_1.md): useInfiniteEmails Hook 基础实现

### 后续阶段
- [Phase 5](plan_13_5.md): InboxPage 集成

---

## 验收标准

- [ ] 快速滚动不会触发重复请求
- [ ] 筛选切换时 Observer 正确工作
- [ ] 错误状态下滚动不触发请求
- [ ] 重试按钮可以恢复加载
- [ ] Observer 不会频繁销毁重建

---

## 预估时间: 0.5 hours

# Plan 13.5: InboxPage 改造

**Project**: NanoMail - Email client application
**Date**: 2026-03-25
**Phase**: 5 of 6

---

## 项目背景

**问题:** 当前 Inbox 页面只加载第一页 10 封邮件，用户无法查看更多邮件。后端 API 已支持分页，但前端缺少分页 UI。

**解决方案:** 实现无限滚动（Infinite Scroll），使用 TanStack Query 的 `useInfiniteQuery` 配合 IntersectionObserver 监听底部触发器，自动加载更多邮件。

**预期结果:** 用户可以流畅滚动浏览所有邮件，无需手动翻页。

---

## 本阶段目标

将 useInfiniteEmails Hook 集成到 InboxPage，替换现有的 useQuery，实现无限滚动功能。

---

## Phase 5 任务：InboxPage 改造

**文件:** `packages/frontend/src/features/inbox/InboxPage.tsx`

---

## 主要变更清单

| 变更项 | 说明 |
|--------|------|
| 移除 | 现有的 `useQuery` 获取邮件列表 |
| 引入 | `useInfiniteEmails` hook |
| 移除 | Sync 完成后的强制 reset() |
| 新增 | 新邮件悬浮提示 |
| 新增 | 底部加载状态（加载中/到底了/错误/重试） |

---

## 状态管理

### 新增状态

```typescript
// 新邮件提示状态
const [newEmailsCount, setNewEmailsCount] = useState(0)
```

### 保留状态

```typescript
// 选中状态
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

// 筛选条件
const [classificationFilter, setClassificationFilter] = useState<EmailClassification | 'ALL'>('ALL')

// 活跃邮件 ID
const [activeId, setActiveId] = useState<number | null>(null)

// Sync 任务 ID
const [syncingJobId, setSyncingJobId] = useState<string | null>(null)
```

---

## 核心代码实现

```typescript
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useInfiniteEmails } from '@/hooks/useInfiniteEmails'
import { EmailCard } from './EmailCard'
import { EmailDetailPanel } from './EmailDetailPanel'
import { NewEmailsPill } from '@/components/NewEmailsPill'
import { Button } from '@/components/ui/button'
import type { EmailClassification } from '@nanomail/shared'

export function InboxPage() {
  const navigate = useNavigate()
  const { emailId } = useParams()
  const activeId = emailId ? Number(emailId) : null

  // ========== 状态 ==========
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [classificationFilter, setClassificationFilter] = useState<EmailClassification | 'ALL'>('ALL')
  const [newEmailsCount, setNewEmailsCount] = useState(0)
  const [syncingJobId, setSyncingJobId] = useState<string | null>(null)

  // ========== 无限滚动 Hook ==========
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

  // ========== 选中处理 ==========
  const handleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const isSelectionDisabled = useCallback((id: number) => {
    // 如果有邮件被选中，且当前邮件未选中，则禁用
    return selectedIds.size > 0 && !selectedIds.has(id)
  }, [selectedIds])

  // ========== Sync 完成后处理 ==========
  // 修改：不再强制 reset()，改为显示新邮件提示
  useEffect(() => {
    if (!syncingJobId) return

    // Poll sync job status...
    // 假设从某处获取 job 状态
    const job = getSyncJob(syncingJobId)

    if (job?.status === 'completed') {
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
      <div className="border-b p-4">
        {/* 分类筛选等 */}
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Pane: Email List */}
        <div
          ref={containerRef}
          className="w-[350px] border-r border-gray-200 overflow-y-auto relative"
          data-testid="email-list-pane"
        >
          {/* 新邮件提示 - 悬浮药丸按钮 */}
          {newEmailsCount > 0 && (
            <NewEmailsPill
              count={newEmailsCount}
              onClick={handleViewNewEmails}
            />
          )}

          {/* 首次加载骨架屏 */}
          {isLoading && emails.length === 0 && (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <EmailSkeleton key={i} />
              ))}
            </div>
          )}

          {/* 空状态 */}
          {!isLoading && emails.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <EmptyInbox />
            </div>
          )}

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
            {!hasNextPage && !isFetchingNextPage && emails.length > 0 && !loadError && (
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

        {/* Right Pane - Email Detail */}
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

## 关键实现要点

### 1. 筛选切换

```typescript
// queryKey 变化会自动触发 useInfiniteQuery 重置
const handleClassificationChange = useCallback((newFilter) => {
  setSelectedIds(new Set())      // 清空选中
  setNewEmailsCount(0)           // 清空新邮件提示
  setClassificationFilter(newFilter)  // 触发 queryKey 变化
}, [])
```

### 2. Sync 完成处理

```typescript
// 修改：显示新邮件提示，而不是强制 reset
if (count > 0) {
  setNewEmailsCount(count)
}
```

### 3. 新邮件提示交互

```typescript
const handleViewNewEmails = useCallback(() => {
  setNewEmailsCount(0)  // 清空提示
  refetch()             // 重新获取
  containerRef.current?.scrollTo(0, 0)  // 滚动到顶部
}, [refetch])
```

### 4. 底部状态显示逻辑

```typescript
// 优先级：加载中 > 错误 > 到底了 > 达到上限
{isFetchingNextPage && <Loader />}
{loadError && <ErrorWithRetry />}
{!hasNextPage && !loadError && <EndOfList />}
{hasReachedLimit && <LimitMessage />}
```

---

## 骨架屏组件

```typescript
function EmailSkeleton() {
  return (
    <div className="p-3 border rounded-lg animate-pulse">
      <div className="flex items-start gap-2">
        <div className="w-4 h-4 bg-gray-200 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-12" />
      </div>
    </div>
  )
}
```

---

## 空状态组件

```typescript
function EmptyInbox() {
  return (
    <div className="text-center text-muted-foreground">
      <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
      <p>收件箱为空</p>
    </div>
  )
}
```

---

## 依赖关系

### 前置阶段
- [Phase 1](plan_13_1.md): useInfiniteEmails Hook
- [Phase 2](plan_13_2.md): Observer 优化
- [Phase 3](plan_13_3.md): EmailCard Memoization
- [Phase 4](plan_13_4.md): EmailService 更新

### 后续阶段
- [Phase 6](plan_13_6.md): 新邮件提示组件

---

## 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/frontend/src/features/inbox/InboxPage.tsx` | MODIFY | 集成无限滚动 + 新邮件提示 |

---

## 验收标准

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
- [ ] 达到 200 封上限停止加载

---

## 预估时间: 1-2 hours

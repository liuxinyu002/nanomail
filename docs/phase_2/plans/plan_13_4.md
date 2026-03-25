# Plan 13.4: EmailService 更新

**Project**: NanoMail - Email client application
**Date**: 2026-03-25
**Phase**: 4 of 6

---

## 项目背景

**问题:** 当前 Inbox 页面只加载第一页 10 封邮件，用户无法查看更多邮件。后端 API 已支持分页，但前端缺少分页 UI。

**解决方案:** 实现无限滚动（Infinite Scroll），使用 TanStack Query 的 `useInfiniteQuery` 配合 IntersectionObserver 监听底部触发器，自动加载更多邮件。

**预期结果:** 用户可以流畅滚动浏览所有邮件，无需手动翻页。

---

## 本阶段目标

为 EmailService 添加 AbortSignal 支持，使请求可以被取消，防止筛选切换时的竞态条件。

---

## Phase 4 任务：EmailService 更新

**文件:** `packages/frontend/src/services/email.service.ts`

---

## 为什么需要 AbortSignal

### 问题场景

1. **筛选切换竞态：** 用户快速切换筛选条件，旧请求可能在新请求之后返回，导致数据错乱
2. **组件卸载：** 用户在请求完成前离开页面，请求继续执行浪费资源
3. **请求去重：** useInfiniteQuery 需要能够取消旧请求

### 解决方案

TanStack Query 内置支持 AbortSignal，只需在 service 层传递 signal 即可：

```typescript
// useInfiniteQuery 会自动创建 AbortSignal
queryFn: async ({ pageParam, signal }) => {
  // signal 会在请求被取消时触发 abort
  return await EmailService.getEmails({ page: pageParam, signal })
}
```

---

## 实现方案

### 更新接口定义

```typescript
export interface EmailsQuery {
  page?: number
  limit?: number
  processed?: boolean
  classification?: EmailClassification
  signal?: AbortSignal  // 新增
}
```

### 更新 getEmails 方法

```typescript
import type { EmailListItem, EmailClassification, PaginatedResponse } from '@nanomail/shared'

export interface EmailsQuery {
  page?: number
  limit?: number
  processed?: boolean
  classification?: EmailClassification
  signal?: AbortSignal
}

export interface EmailsResponse {
  emails: EmailListItem[]
  pagination: {
    page: number
    limit: number
    totalPages: number
    totalItems: number
    hasNextPage: boolean
  }
}

export const EmailService = {
  async getEmails(query: EmailsQuery = {}): Promise<EmailsResponse> {
    const {
      page = 1,
      limit = 10,
      processed,
      classification,
      signal  // 解构 signal
    } = query

    // 构建查询参数
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))

    if (processed !== undefined) {
      params.set('processed', String(processed))
    }
    if (classification) {
      params.set('classification', classification)
    }

    // 发起请求，传递 signal
    const response = await fetch(`/api/emails?${params.toString()}`, {
      signal  // ← 关键：传递 signal 给 fetch
    })

    // 处理错误
    if (!response.ok) {
      // 检查是否是被取消的请求
      if (response.status === 0) {
        throw new DOMException('Request aborted', 'AbortError')
      }
      throw new Error('Failed to fetch emails')
    }

    return response.json()
  },

  // ... 其他方法保持不变
}
```

---

## AbortSignal 工作原理

```typescript
// 1. useInfiniteQuery 自动创建 AbortController
const { data } = useInfiniteQuery({
  queryFn: async ({ signal }) => {
    // signal 是 AbortController.signal
    return await fetch('/api/emails', { signal })
  }
})

// 2. 当 queryKey 变化或组件卸载时
// useInfiniteQuery 会自动调用 AbortController.abort()

// 3. fetch 收到 abort 信号后会取消请求
// 网络层面终止连接，不会等待响应
```

---

## 错误处理

### AbortError 处理

```typescript
// fetch 在被取消时会抛出 AbortError
// TanStack Query 会自动忽略 AbortError，不会显示错误提示

// 如果需要手动处理：
try {
  const response = await fetch('/api/emails', { signal })
  // ...
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    // 请求被取消，静默处理
    console.log('Request was cancelled')
    return
  }
  throw error
}
```

---

## 其他方法（可选更新）

如果其他方法也需要支持取消，可以同样添加 signal 参数：

```typescript
export const EmailService = {
  // 获取单个邮件详情
  async getEmail(id: number, signal?: AbortSignal): Promise<Email> {
    const response = await fetch(`/api/emails/${id}`, { signal })
    if (!response.ok) throw new Error('Failed to fetch email')
    return response.json()
  },

  // 搜索邮件
  async searchEmails(query: string, options?: { signal?: AbortSignal }): Promise<EmailListItem[]> {
    const response = await fetch(`/api/emails/search?q=${encodeURIComponent(query)}`, {
      signal: options?.signal
    })
    if (!response.ok) throw new Error('Failed to search emails')
    return response.json()
  },

  // ... 其他方法
}
```

---

## 依赖关系

### 前置条件
- 无

### 后续阶段
- [Phase 1](plan_13_1.md): useInfiniteEmails Hook 使用此 signal

---

## 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/frontend/src/services/email.service.ts` | MODIFY | 添加 AbortSignal 支持 |

---

## 验收标准

- [ ] EmailsQuery 接口包含 signal 参数
- [ ] getEmails 正确传递 signal 给 fetch
- [ ] 请求被取消时不会显示错误
- [ ] 筛选切换时旧请求被正确取消
- [ ] 组件卸载时请求被正确取消

---

## 预估时间: 0.5 hours

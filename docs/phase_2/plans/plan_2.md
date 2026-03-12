# 实现方案：手动同步按钮 + 邮件收发日志

## 需求确认

### 功能一：手动同步按钮

- 位置：InboxPage 标题栏旁边 (Inbox [🔄 同步])
- 行为：点击后触发后端异步同步 → 返回 jobId → 前端轮询状态 → 完成后自动刷新列表
- 状态：同步中显示 loading 动画 + 进度提示
- 反馈：toast 提示（如 "同步完成，新增 3 封邮件"）

### 功能二：邮件收发日志

- 格式：[时间戳] [模块名] [级别] 消息
- 接收日志节点：开始同步 → 连接成功 → 拉取数量 → 解析成功 → 保存成功（主题）→ 耗时
- 发送日志节点：开始发送（收件人、主题）→ 连接成功 → 发送成功
- 错误处理：每个阶段错误时输出详细错误信息

---

## 架构决策：异步任务模式

### 问题背景

邮件同步（特别是 IMAP 拉取大量邮件或包含附件的邮件）是一个耗时操作：
- Nginx 默认超时 60s
- Axios 默认超时较短
- 前端长时间 Loading 体验差
- 后台实际仍在运行但前端已超时

### 解决方案：异步任务 + 轮询

```
前端                    后端                    后台任务
  │                       │                       │
  │── POST /sync ────────>│                       │
  │<── { jobId, status }──│                       │
  │                       │── 创建 Job ──────────>│
  │                       │                       │── 执行同步 ──>
  │── GET /sync/:jobId ──>│                       │
  │<── { status: pending }│                       │
  │   (每 2s 轮询)         │                       │
  │── GET /sync/:jobId ──>│                       │
  │<── { status: completed, result }               │
  │                       │                       │
  │── 刷新邮件列表 ───────>│                       │
```

### 数据结构

```typescript
interface SyncJob {
  id: string;           // UUID
  accountId: number;    // 关联的邮箱账户 ID（用于并发防护）
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;    // 0-100 进度百分比
  result?: {
    syncedCount: number;
    errors: string[];
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 实现阶段

### Phase 1：后端 - 异步任务基础设施

**文件：packages/backend/src/services/JobService.ts (新建)**

```typescript
export class JobService {
  private jobs: Map<string, SyncJob> = new Map();
  private readonly JOB_TTL = 5 * 60 * 1000; // 5分钟后清理

  createJob(accountId: number): string {
    const jobId = uuid();
    this.jobs.set(jobId, {
      id: jobId,
      accountId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return jobId;
  }

  getJob(jobId: string): SyncJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 查找指定账户的活跃任务（用于并发防护）
   */
  findActiveJobByAccountId(accountId: number): SyncJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.accountId === accountId &&
          (job.status === 'pending' || job.status === 'running')) {
        return job;
      }
    }
    return undefined;
  }

  updateJob(jobId: string, update: Partial<SyncJob>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobs.set(jobId, { ...job, ...update, updatedAt: new Date() });

      // 如果任务结束（成功或失败），设置定时器清理内存
      if (update.status === 'completed' || update.status === 'failed') {
        setTimeout(() => {
          this.jobs.delete(jobId);
        }, this.JOB_TTL);
      }
    }
  }
}
```

> **设计要点：**
> - `accountId` 字段用于并发防护，防止同一账户重复创建任务
> - TTL 机制：任务完成后 5 分钟自动清理，防止内存泄漏
> - `findActiveJobByAccountId()` 用于 POST /sync 端点检查是否有活跃任务

**文件：packages/backend/src/routes/email.routes.ts**

路由签名变更：
```typescript
// 当前
export function createEmailRoutes(dataSource: DataSource): Router

// 修改后
export function createEmailRoutes(
  dataSource: DataSource,
  emailSyncService: EmailSyncService,
  jobService: JobService
): Router
```

新增端点：
- `POST /sync` → 返回 `{ jobId: string }`，异步触发同步
- `GET /sync/:jobId` → 返回 `SyncJob` 状态

**文件：packages/backend/src/index.ts**
- 初始化 JobService
- 更新 createEmailRoutes 调用

---

### Phase 2：后端 - 异步同步执行器

**文件：packages/backend/src/services/AsyncSyncExecutor.ts (新建)**

```typescript
export class AsyncSyncExecutor {
  constructor(
    private emailSyncService: EmailSyncService,
    private jobService: JobService
  ) {}

  async executeSync(jobId: string, accountId: number): Promise<void> {
    this.jobService.updateJob(jobId, { status: 'running' });

    try {
      const result = await this.emailSyncService.sync(accountId);
      this.jobService.updateJob(jobId, {
        status: 'completed',
        result: { syncedCount: result.syncedCount, errors: [] }
      });
    } catch (error) {
      this.jobService.updateJob(jobId, {
        status: 'failed',
        error: error.message
      });
    }
  }
}
```

**修改 POST /sync 实现（含并发防护）**：
```typescript
router.post('/sync', async (req, res) => {
  const accountId = req.body.accountId;

  // 并发防护：检查是否已有该账户的活跃任务
  const existingJob = jobService.findActiveJobByAccountId(accountId);
  if (existingJob) {
    return res.json({ jobId: existingJob.id, status: existingJob.status });
  }

  const jobId = jobService.createJob(accountId);

  // 异步执行，不等待
  asyncSyncExecutor.executeSync(jobId, accountId).catch(console.error);

  res.json({ jobId, status: 'pending' });
});

// GET /sync/:jobId 需处理 404 情况（服务器重启后 jobId 不存在）
router.get('/sync/:jobId', (req, res) => {
  const job = jobService.getJob(req.params.jobId);

  if (!job) {
    // 服务器重启后 Job 会丢失，返回 404
    return res.status(404).json({
      error: 'JOB_NOT_FOUND',
      message: '任务不存在或已过期，请重新发起同步'
    });
  }

  res.json(job);
});
```

> **容灾设计：**
> - 并发防护：防止用户重复点击创建多个任务
> - 404 处理：服务器重启后 Job 丢失，前端需正确处理

---

### Phase 3：后端 - 邮件接收日志

**文件：packages/backend/src/services/EmailSyncService.ts**

| 位置 | 日志内容 |
|------|----------|
| sync() 开始 | [EmailSync] INFO 开始同步，协议: IMAP/POP3 |
| sync() 完成 | [EmailSync] INFO 同步完成，新增 X 封邮件，耗时 Xms |
| sync() 错误 | [EmailSync] ERROR 同步失败: {错误详情} |
| saveEmail() 成功 | [EmailSync] INFO 邮件保存成功，主题: xxx |

**文件：packages/backend/src/services/ImapService.ts**

| 位置 | 日志内容 |
|------|----------|
| 连接成功 | [IMAP] INFO 服务器连接成功 |
| 连接失败 | [IMAP] ERROR 连接失败: {错误详情} |
| 拉取邮件 | [IMAP] INFO 拉取到 X 封新邮件 |

**文件：packages/backend/src/services/Pop3Service.ts**

| 位置 | 日志内容 |
|------|----------|
| 连接成功 | [POP3] INFO 服务器连接成功 |
| 连接失败 | [POP3] ERROR 连接失败: {错误详情} |
| 拉取邮件 | [POP3] INFO 拉取到 X 封新邮件 |

**文件：packages/backend/src/services/MailParserService.ts**

| 位置 | 日志内容 |
|------|----------|
| 解析成功 | [MailParser] INFO 邮件解析成功 |
| 解析失败 | [MailParser] ERROR 解析失败: {错误详情} |

---

### Phase 4：后端 - 邮件发送日志

**文件：packages/backend/src/services/SmtpService.ts**

| 位置 | 日志内容 |
|------|----------|
| sendEmail() 开始 | [SMTP] INFO 开始发送邮件，收件人: xxx，主题: xxx |
| 连接成功 | [SMTP] INFO 服务器连接成功 |
| 发送成功 | [SMTP] INFO 邮件发送成功，messageId: xxx |
| 发送失败 | [SMTP] ERROR 发送失败: {错误详情} |

---

### Phase 5：前端 - 同步按钮 UI + 轮询

**文件：packages/frontend/src/services/email.service.ts**

新增方法：
```typescript
async triggerSync(): Promise<{ jobId: string }>
async getSyncStatus(jobId: string): Promise<SyncJob>
```

**文件：packages/frontend/src/features/inbox/InboxPage.tsx**

1. 添加 syncing 状态和 jobId 状态
2. 标题栏添加同步按钮（RefreshCw 图标）
3. 点击同步时：
   - 调用 `triggerSync()` 获取 jobId
   - 使用 useEffect + 清理机制进行轮询
   - 状态变为 completed/failed 时停止轮询
4. 同步中显示旋转动画 + 进度提示
5. 完成后 toast 提示 + refetch() 刷新列表

**轮询实现（React Hook 风格，含清理和错误处理）**：
```typescript
useEffect(() => {
  let isMounted = true;
  let timeoutId: NodeJS.Timeout;

  const poll = async () => {
    if (!syncingJobId) return;

    try {
      const job = await emailService.getSyncStatus(syncingJobId);
      if (!isMounted) return;

      if (job.status === 'completed') {
        toast.success(`同步完成，新增 ${job.result.syncedCount} 封邮件`);
        setSyncingJobId(null);
        refetch(); // 刷新列表
      } else if (job.status === 'failed') {
        toast.error(`同步失败: ${job.error}`);
        setSyncingJobId(null);
      } else {
        // 继续轮询
        timeoutId = setTimeout(poll, 2000);
      }
    } catch (error) {
      if (!isMounted) return;
      // 处理 404（服务器重启导致 jobId 不存在）
      if (error.response?.status === 404) {
        toast.error('任务不存在或已过期，请重新同步');
      } else {
        toast.error('获取同步状态失败');
      }
      setSyncingJobId(null);
    }
  };

  poll();

  return () => {
    isMounted = false;  // 组件卸载时标记
    clearTimeout(timeoutId); // 清除定时器
  };
}, [syncingJobId]);
```

> **关键改进：**
> - `isMounted` 标记防止组件卸载后更新 state
> - `clearTimeout` 清理定时器防止内存泄漏
> - 404 错误专门处理服务器重启场景
> - 网络错误时停止轮询并提示用户

---

## 文件变更清单

| 文件 | 操作 |
|------|------|
| backend/src/services/JobService.ts | 新建 - 任务状态管理 |
| backend/src/services/AsyncSyncExecutor.ts | 新建 - 异步执行器 |
| backend/src/routes/email.routes.ts | 修改 - 添加异步 sync 端点 |
| backend/src/index.ts | 修改 - 初始化 JobService |
| backend/src/services/EmailSyncService.ts | 修改 - 添加日志 |
| backend/src/services/ImapService.ts | 修改 - 添加日志 |
| backend/src/services/Pop3Service.ts | 修改 - 添加日志 |
| backend/src/services/MailParserService.ts | 修改 - 添加日志 |
| backend/src/services/SmtpService.ts | 修改 - 添加日志 |
| frontend/src/services/email.service.ts | 修改 - 添加 sync API |
| frontend/src/features/inbox/InboxPage.tsx | 修改 - 添加同步按钮 + 轮询 |

---

## 风险评估

| 风险 | 级别 | 说明 | 解决方案 |
|------|------|------|----------|
| HTTP 请求超时 | 已解决 | 采用异步任务 + 轮询模式 | POST /sync 立即返回 |
| 路由签名变更 | 低 | 仅影响 index.ts 一个调用点 | - |
| 并发同步 | 已解决 | 用户重复点击创建多任务 | `findActiveJobByAccountId` 检查 |
| 日志格式一致性 | 低 | 统一使用 [模块] 级别 消息 格式 | - |
| Job 内存泄漏 | 已解决 | Map 无限膨胀 | TTL 定时清理机制 |
| 前端轮询泄漏 | 已解决 | 组件卸载后递归继续 | useEffect 清理函数 |
| 服务器重启 | 已解决 | Job 丢失导致前端无限轮询 | 404 响应 + 前端错误处理 |

---

## 后续优化 (Future)

1. **WebSocket 推送**：替代轮询，实时推送状态更新
2. **Redis 持久化**：将 Job 存储到 Redis，支持分布式部署
3. **任务队列**：引入 BullMQ 支持任务优先级和重试
4. **进度回调**：同步过程中实时更新 progress 字段

---

## 预估工作量

- Phase 1（异步基础设施）：25 分钟
- Phase 2（异步执行器）：15 分钟
- Phase 3（接收日志）：20 分钟
- Phase 4（发送日志）：10 分钟
- Phase 5（前端按钮 + 轮询）：25 分钟
- 总计：约 1.5 小时
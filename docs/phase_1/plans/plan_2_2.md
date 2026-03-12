# 邮件同步模块重构与 POP3 接入方案设计文档

> **Context:** Phase 2 扩展 - 新增 POP3 协议支持，重构邮件同步架构

## 概述

| 方面 | 详情 |
|------|------|
| **文档编号** | plan_2_2 |
| **关联文档** | [plan_2.md](./plan_2.md) - 原始 IMAP 同步方案 |
| **核心目标** | 协议抽象层设计、POP3 接入、统一数据格式 |
| **设计原则** | 最小化改动、优雅降级、流式处理、断点续传 |

---

## 一、数据模型与配置层

### 1.1 Email 实体扩展

**设计决策**：`uid` 与 `uidl` 分离存储，各自服务于对应协议的增量同步逻辑。

```typescript
// packages/backend/src/entities/Email.entity.ts

@Entity('emails')
@Index(['date'])
@Index(['isProcessed'])
@Index(['sender'])
@Index(['message_id'])
@Index(['uid'])
@Index(['uidl'])  // 新增：POP3 唯一标识索引
@Index(['process_status'])
export class Email {
  @PrimaryGeneratedColumn('increment')
  id!: number

  // ... 现有字段保持不变 ...

  // IMAP UID for sync tracking (现有字段)
  @Column({ type: 'integer', nullable: true })
  uid!: number | null

  // POP3 UIDL for sync tracking (新增字段)
  // 存储 POP3 服务端返回的邮件唯一标识字符串
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  uidl!: string | null

  // ... 其他字段保持不变 ...
}
```

**数据库迁移脚本**：

```typescript
// migration: AddUidlFieldToEmail

import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUidlFieldToEmail1700000000000 implements MigrationInterface {
  name = 'AddUidlFieldToEmail1700000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 新增 uidl 字段
    await queryRunner.query(`
      ALTER TABLE emails ADD COLUMN uidl VARCHAR(255) NULL
    `)

    // 创建唯一索引
    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_EMAIL_UIDL ON emails(uidl)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IDX_EMAIL_UIDL ON emails`)
    await queryRunner.query(`ALTER TABLE emails DROP COLUMN uidl`)
  }
}
```

### 1.2 Settings 配置项扩展

**设计决策**：协议前缀分离，IMAP 与 POP3 配置项独立存储，语义清晰。

**新增/重命名配置项清单**：

| 配置键 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `PROTOCOL_TYPE` | `'IMAP' \| 'POP3'` | 接收协议类型开关 | `'IMAP'` |
| `IMAP_HOST` | string | IMAP 服务器地址（现有，不变） | `imap.gmail.com` |
| `IMAP_PORT` | string | IMAP 端口（现有，不变） | `993` |
| `IMAP_USER` | string | IMAP 用户名（现有，不变） | `user@gmail.com` |
| `IMAP_PASSWORD` | string | IMAP 密码（加密存储，现有不变） | `******` |
| `POP3_HOST` | string | POP3 服务器地址（新增） | `pop.gmail.com` |
| `POP3_PORT` | string | POP3 端口（新增） | `995` |
| `POP3_USER` | string | POP3 用户名（新增） | `user@gmail.com` |
| `POP3_PASSWORD` | string | POP3 密码（加密存储，新增） | `******` |
| `LAST_IMAP_SYNCED_UID` | string | IMAP 最后同步UID（重命名自 `LAST_SYNCED_UID`） | `12345` |
| `LAST_POP3_SYNC_TIME` | string | POP3 最后同步时间（新增，仅监控用） | `2024-01-15T10:30:00Z` |

**配置迁移脚本**：

```typescript
// migration: RenameImapSettingsAndAddPop3

import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameImapSettingsAndAddPop31700000000001 implements MigrationInterface {
  name = 'RenameImapSettingsAndAddPop31700000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 重命名 LAST_SYNCED_UID -> LAST_IMAP_SYNCED_UID
    await queryRunner.query(`
      UPDATE settings
      SET key = 'LAST_IMAP_SYNCED_UID'
      WHERE key = 'LAST_SYNCED_UID'
    `)

    // 设置默认协议类型为 IMAP（兼容现有用户）
    await queryRunner.query(`
      INSERT INTO settings (key, value) VALUES ('PROTOCOL_TYPE', 'IMAP')
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE settings SET key = 'LAST_SYNCED_UID' WHERE key = 'LAST_IMAP_SYNCED_UID'
    `)
    await queryRunner.query(`DELETE FROM settings WHERE key = 'PROTOCOL_TYPE'`)
  }
}
```

---

## 二、核心接口抽象定义

### 2.1 类型定义

**设计决策**：使用联合类型强制约束 `uid` 与 `uidl` 必须且只能存在其一。

```typescript
// packages/backend/src/services/types/mail-fetcher.types.ts

/**
 * 协议类型枚举
 */
export type ProtocolType = 'IMAP' | 'POP3'

/**
 * 基础邮件数据结构
 */
interface BaseFetchedEmail {
  subject: string | null
  from: string | null
  date: Date
  rawContent: string
  hasAttachments: boolean
  // 线程上下文字段（可选，由 MailParserService 解析后填充）
  messageId?: string | null
  inReplyTo?: string | null
  references?: string[] | null
}

/**
 * 统一邮件数据结构 - 使用联合类型强制类型安全
 *
 * - IMAP 协议：必须提供 uid (number)，uidl 不存在
 * - POP3 协议：必须提供 uidl (string)，uid 不存在
 */
export type FetchedEmail = BaseFetchedEmail &
  (
    | { uid: number; uidl?: never }
    | { uidl: string; uid?: never }
  )

/**
 * 邮件唯一标识符（用于日志和错误处理）
 */
export type EmailIdentifier = { uid: number } | { uidl: string }
```

### 2.2 IMailFetcherInterface 接口声明

**设计决策**：核心方法返回 AsyncGenerator 实现流式处理，可选方法采用优雅降级（No-op）。

```typescript
// packages/backend/src/services/interfaces/IMailFetcher.interface.ts

import type { FetchedEmail, ProtocolType } from '../types/mail-fetcher.types'

/**
 * 连接测试结果
 */
export interface ConnectionTestResult {
  success: boolean
  error?: string
}

/**
 * 邮件获取适配器接口
 *
 * 职责：
 * - 抽象 IMAP/POP3 协议差异
 * - 提供统一的邮件获取能力
 * - 支持流式处理，O(1) 内存占用
 *
 * 实现规范：
 * - fetchNewEmails 必须返回 AsyncGenerator，支持流式消费
 * - 单封邮件下载/解析失败时，记录日志并继续下一封（颗粒度容错）
 * - POP3 不支持的方法（markAsRead, moveToFolder）实现为空函数
 */
export interface IMailFetcher {
  /**
   * 协议类型标识
   */
  readonly protocolType: ProtocolType

  /**
   * 建立与服务器的连接
   *
   * @throws Error 连接失败时抛出异常
   */
  connect(): Promise<void>

  /**
   * 断开与服务器的连接
   * 应在 finally 块中调用以确保资源释放
   */
  disconnect(): Promise<void>

  /**
   * 测试服务器连接
   *
   * @returns ConnectionTestResult 包含成功状态和可选错误信息
   */
  testConnection(): Promise<ConnectionTestResult>

  /**
   * 获取新邮件（流式）
   *
   * 设计要点：
   * - 返回 AsyncGenerator，支持 for await...of 消费
   * - IMAP：基于 UID 增量范围查询，利用 client.fetch 原生流式
   * - POP3：UIDL 全量拉取 -> 本地 Diff -> RETR 串行下载
   * - 单封失败时记录日志继续，不中断整体流程
   *
   * @returns AsyncGenerator<FetchedEmail, void, unknown>
   */
  fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown>

  /**
   * 标记邮件为已读
   *
   * 协议支持情况：
   * - IMAP：正常执行 STORE +FLAGS \Seen
   * - POP3：不支持，优雅降级为 No-op
   *
   * @param identifier - 邮件唯一标识（IMAP: uid, POP3: uidl）
   */
  markAsRead(identifier: EmailIdentifier): Promise<void>

  /**
   * 移动邮件到指定文件夹
   *
   * 协议支持情况：
   * - IMAP：正常执行 MOVE 或 COPY + STORE \Deleted
   * - POP3：不支持，优雅降级为 No-op
   *
   * @param identifier - 邮件唯一标识
   * @param folder - 目标文件夹名称
   */
  moveToFolder(identifier: EmailIdentifier, folder: string): Promise<void>

  /**
   * 删除邮件
   *
   * 协议支持情况：
   * - IMAP：标记 \Deleted 并执行 EXPUNGE
   * - POP3：执行 DELE 命令
   *
   * @param identifier - 邮件唯一标识
   */
  deleteMessage(identifier: EmailIdentifier): Promise<void>
}
```

### 2.3 错误处理类型

```typescript
// packages/backend/src/services/types/mail-fetcher.types.ts

/**
 * 邮件获取错误类型
 */
export enum MailFetcherErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  FETCH_FAILED = 'FETCH_FAILED',
  PARSE_FAILED = 'PARSE_FAILED',
  PROTOCOL_NOT_SUPPORTED = 'PROTOCOL_NOT_SUPPORTED',
}

/**
 * 邮件获取错误
 */
export class MailFetcherError extends Error {
  constructor(
    public readonly type: MailFetcherErrorType,
    message: string,
    public readonly identifier?: EmailIdentifier,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'MailFetcherError'
  }
}
```

---

## 三、POP3 Adapter 实现细节

### 3.1 Pop3Service 类结构

```typescript
// packages/backend/src/services/Pop3Service.ts

import POP3 from 'node-pop3'
import type { SettingsService } from './SettingsService'
import type {
  IMailFetcher,
  ConnectionTestResult,
  FetchedEmail,
  EmailIdentifier
} from './interfaces/IMailFetcher.interface'
import { MailParserService } from './MailParserService'

/**
 * POP3 配置
 */
interface Pop3Config {
  host: string
  port: number
  user: string
  password: string
  tls: boolean
}

/**
 * UIDL 列表项
 */
interface UidlItem {
  seq: number      // POP3 序列号
  uidl: string     // 服务端唯一标识
}

/**
 * POP3 Adapter 实现
 *
 * 特性：
 * - UIDL 全量拉取 + 本地 Diff 增量识别
 * - 倒序同步（最新邮件优先）
 * - 分批 Diff（Batch Size: 1000）
 * - RETR 串行流式下载
 * - 单封容错跳过
 *
 * 架构要点：
 * - Repository<Email> 通过构造函数注入，保持 IMailFetcher 接口纯粹性
 */
export class Pop3Service implements IMailFetcher {
  readonly protocolType = 'POP3' as const

  private pop3: POP3 | null = null
  private configCache: Pop3Config | null = null
  private readonly mailParser = new MailParserService()

  // 分批大小常量
  private readonly BATCH_SIZE = 1000

  constructor(
    private readonly settingsService: SettingsService,
    private readonly emailRepository: Repository<Email>  // 构造函数注入
  ) {}

  /**
   * 获取 POP3 配置（带缓存）
   */
  private async getConfig(): Promise<Pop3Config> {
    if (this.configCache) return this.configCache

    const host = await this.settingsService.get('POP3_HOST')
    const portStr = await this.settingsService.get('POP3_PORT')
    const user = await this.settingsService.get('POP3_USER')
    const password = await this.settingsService.get('POP3_PASSWORD')

    if (!host || !user || !password) {
      throw new Error('POP3 configuration is incomplete')
    }

    this.configCache = {
      host,
      port: portStr ? parseInt(portStr, 10) : 995,
      user,
      password,
      tls: true,
    }

    return this.configCache
  }

  // ... 其他方法实现见下文
}
```

### 3.2 UIDL 全量拉取与倒序处理

```typescript
// Pop3Service.ts (续)

/**
 * 获取服务端 UIDL 列表（倒序排列，最新邮件优先）
 */
private async fetchUidlList(): Promise<UidlItem[]> {
  const pop3 = await this.getPop3Client()

  // 执行 UIDL 命令获取全量列表
  // node-pop3 返回格式: { 1: 'uidl-string-1', 2: 'uidl-string-2', ... }
  const uidlMap = await pop3.UIDL()

  // 转换为数组并倒序
  const uidlList: UidlItem[] = Object.entries(uidlMap)
    .map(([seq, uidl]) => ({
      seq: parseInt(seq, 10),
      uidl: uidl as string,
    }))
    .reverse() // 关键：倒序，最新邮件优先处理

  return uidlList
}
```

### 3.3 分批本地 Diff 逻辑

```typescript
// Pop3Service.ts (续)

/**
 * 本地 Diff 查询：筛选出需要下载的新邮件 UIDL
 *
 * 流程：
 * 1. 将 UIDL 列表按 BATCH_SIZE 分片
 * 2. 逐片查询本地数据库已存在的 uidl
 * 3. 计算差集，返回需要下载的 UIDL
 */
private async diffWithLocal(uidlList: UidlItem[]): Promise<UidlItem[]> {
  const newUidlItems: UidlItem[] = []

  // 分批处理
  for (let i = 0; i < uidlList.length; i += this.BATCH_SIZE) {
    const batch = uidlList.slice(i, i + this.BATCH_SIZE)
    const batchUidls = batch.map(item => item.uidl)

    // 查询该批次中已存在于本地的 uidl
    const existingRecords = await this.emailRepository
      .createQueryBuilder('email')
      .select('email.uidl')
      .where('email.uidl IN (:...uidls)', { uidls: batchUidls })
      .getMany()

    const existingUidls = new Set(existingRecords.map(r => r.uidl))

    // 计算差集
    const newInBatch = batch.filter(item => !existingUidls.has(item.uidl))
    newUidlItems.push(...newInBatch)
  }

  return newUidlItems
}
```

### 3.4 RETR 串行流式下载 + 单封容错

```typescript
// Pop3Service.ts (续)

/**
 * 获取新邮件（流式）
 *
 * 实现要点：
 * 1. UIDL 全量拉取 + 倒序
 * 2. 分批 Diff 筛选新邮件
 * 3. 逐封 RETR 下载 -> 解析 -> yield
 * 4. 单封失败时记录日志继续，不中断流程
 */
async *fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown> {
  await this.connect()

  try {
    // Step 1: 获取 UIDL 列表（倒序）
    const uidlList = await this.fetchUidlList()

    if (uidlList.length === 0) {
      return
    }

    // Step 2: 本地 Diff 筛选新邮件
    const newUidlItems = await this.diffWithLocal(uidlList)

    if (newUidlItems.length === 0) {
      return
    }

    // Step 3: 逐封下载（串行流式）
    const pop3 = await this.getPop3Client()

    for (const item of newUidlItems) {
      try {
        // 执行 RETR 命令下载原始邮件
        const rawContent = await pop3.RETR(item.seq)

        // 解析 MIME 内容
        const parsed = await this.mailParser.parse(rawContent)

        // 组装并 yield（联合类型约束：POP3 必须有 uidl）
        const email: FetchedEmail = {
          uidl: item.uidl,  // POP3 必填
          subject: parsed.subject,
          from: parsed.from,
          date: parsed.date ?? new Date(),
          rawContent: rawContent,
          hasAttachments: parsed.hasAttachments,
          messageId: parsed.messageId,
          inReplyTo: parsed.inReplyTo,
          references: parsed.references,
        }

        yield email

      } catch (error) {
        // 单封容错：记录日志，继续下一封
        console.error(`[POP3] Failed to fetch email uidl=${item.uidl}:`, error)
        continue
      }
    }
  } finally {
    // 确保 POP3 连接关闭
    // 注意：node-pop3 的连接管理需根据实际 API 调整
  }
}
```

### 3.5 优雅降级（No-op）实现

```typescript
// Pop3Service.ts (续)

/**
 * 标记已读 - POP3 不支持，优雅降级为 No-op
 */
async markAsRead(identifier: EmailIdentifier): Promise<void> {
  // POP3 协议不支持服务端状态管理
  // 优雅降级：直接返回，不抛出异常
  // 上层业务可正常更新本地数据库状态
  return Promise.resolve()
}

/**
 * 移动文件夹 - POP3 不支持，优雅降级为 No-op
 */
async moveToFolder(identifier: EmailIdentifier, folder: string): Promise<void> {
  // POP3 协议不支持文件夹概念
  // 优雅降级：直接返回
  return Promise.resolve()
}

/**
 * 删除邮件 - POP3 支持 DELE 命令
 *
 * 事务性要点：
 * 根据 POP3 协议规范，DELE 命令仅标记邮件为"逻辑删除"，
 * 服务端只有在收到 QUIT 命令并正常进入 UPDATE 状态后，才会执行物理删除。
 * 因此必须在 DELE 后显式调用 QUIT，否则删除操作在网络断开后将失效。
 */
async deleteMessage(identifier: EmailIdentifier): Promise<void> {
  const pop3 = await this.getPop3Client()

  // 需要通过 UIDL 查找序列号
  const uidlList = await this.fetchUidlList()
  const item = uidlList.find(i => i.uidl === (identifier as { uidl: string }).uidl)

  if (!item) {
    throw new Error(`Email with uidl=${(identifier as { uidl: string }).uidl} not found`)
  }

  // 执行 DELE 命令（标记删除）
  await pop3.DELE(item.seq)

  // 关键：显式调用 QUIT 提交删除操作
  // 根据 POP3 协议，只有 QUIT 进入 UPDATE 状态后删除才会生效
  await pop3.QUIT()
}
```

---

## 四、IMAP Adapter 改造细节

### 4.1 ImapService 重构为 Adapter

**核心变更**：将现有 `ImapService` 改造为实现 `IMailFetcher` 接口，使用 `imapflow` 原生流式 API。

```typescript
// packages/backend/src/services/ImapService.ts

import { ImapFlow, type ImapFlowOptions } from 'imapflow'
import type { SettingsService } from './SettingsService'
import type {
  IMailFetcher,
  ConnectionTestResult,
  FetchedEmail,
  EmailIdentifier
} from './interfaces/IMailFetcher.interface'
import { MailParserService } from './MailParserService'

/**
 * IMAP Adapter 实现
 *
 * 改造要点：
 * - 实现 IMailFetcher 接口
 * - fetchNewEmails 改用 client.fetch 原生异步迭代器
 * - 真流式处理，O(1) 内存占用
 * - 单封容错跳过
 */
export class ImapService implements IMailFetcher {
  readonly protocolType = 'IMAP' as const

  private client: ImapFlow | null = null
  private configCache: ImapConfig | null = null

  constructor(private readonly settingsService: SettingsService) {}

  // ... getConfig, getClient 等方法保持现有实现 ...

  /**
   * 获取新邮件（真流式）
   *
   * 改造要点：
   * 1. 使用 client.fetch 原生异步迭代器
   * 2. 基于 LAST_IMAP_SYNCED_UID 增量范围查询
   * 3. 单封失败时记录日志继续
   */
  async *fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown> {
    const client = await this.getClient()

    try {
      await client.connect()
      await client.mailboxOpen('INBOX')

      // 获取上次同步的 UID
      const lastUidStr = await this.settingsService.get('LAST_IMAP_SYNCED_UID')
      const startUid = lastUidStr ? parseInt(lastUidStr, 10) + 1 : 1

      // 构建 UID 范围查询
      const fetchRange = `${startUid}:*`

      // 使用 imapflow 原生 fetch 异步迭代器
      // 关键：这是真流式，不会一次性加载所有邮件到内存
      const fetchStream = client.fetch(fetchRange, {
        uid: true,
        source: true,
        envelope: true,
        bodyStructure: true,
      })

      const mailParser = new MailParserService()

      // 流式消费
      for await (const message of fetchStream) {
        try {
          if (!message.uid || !message.source) {
            continue
          }

          // 解析 MIME 内容
          const parsed = await mailParser.parse(message.source)

          // 组装并 yield（联合类型约束：IMAP 必须有 uid）
          const email: FetchedEmail = {
            uid: message.uid,  // IMAP 必填
            subject: parsed.subject,
            from: parsed.from,
            date: parsed.date ?? message.envelope?.date ?? new Date(),
            rawContent: message.source.toString(),
            hasAttachments: parsed.hasAttachments,
            messageId: parsed.messageId,
            inReplyTo: parsed.inReplyTo,
            references: parsed.references,
          }

          yield email

        } catch (error) {
          // 单封容错：记录日志继续
          console.error(`[IMAP] Failed to process email uid=${message.uid}:`, error)
          continue
        }
      }

    } finally {
      // 保持连接池化，不在此处断开
      // 由 sync engine 统一管理生命周期
    }
  }

  /**
   * 标记已读 - IMAP 支持
   */
  async markAsRead(identifier: EmailIdentifier): Promise<void> {
    const client = await this.getClient()
    const uid = (identifier as { uid: number }).uid

    await client.messageFlagsAdd({ uid }, ['\\Seen'])
  }

  /**
   * 移动文件夹 - IMAP 支持
   */
  async moveToFolder(identifier: EmailIdentifier, folder: string): Promise<void> {
    const client = await this.getClient()
    const uid = (identifier as { uid: number }).uid

    await client.messageMove({ uid }, folder)
  }

  /**
   * 删除邮件 - IMAP 支持
   */
  async deleteMessage(identifier: EmailIdentifier): Promise<void> {
    const client = await this.getClient()
    const uid = (identifier as { uid: number }).uid

    await client.messageFlagsAdd({ uid }, ['\\Deleted'])
    await client.expunge()
  }

  // ... testConnection, connect, disconnect 等方法保持现有实现 ...
}
```

---

## 五、同步引擎调度与消费逻辑

### 5.1 MailFetcherFactory 工厂类

```typescript
// packages/backend/src/services/MailFetcherFactory.ts

import type { SettingsService } from './SettingsService'
import type { IMailFetcher } from './interfaces/IMailFetcher.interface'
import { ImapService } from './ImapService'
import { Pop3Service } from './Pop3Service'

/**
 * 邮件获取器工厂
 *
 * 职责：根据 PROTOCOL_TYPE 配置动态实例化对应的 Adapter
 *
 * 架构要点：
 * - Pop3Service 需要注入 Repository<Email> 用于本地 Diff 查询
 * - Repository 通过构造函数注入，保持 IMailFetcher 接口纯粹性
 */
export class MailFetcherFactory {
  private imapInstance: ImapService | null = null
  private pop3Instance: Pop3Service | null = null

  constructor(
    private readonly settingsService: SettingsService,
    private readonly emailRepository: Repository<Email>  // 注入 Repository
  ) {}

  /**
   * 获取邮件获取器实例
   *
   * @returns IMailFetcher 实现
   * @throws Error 配置无效时
   */
  async getFetcher(): Promise<IMailFetcher> {
    const protocolType = await this.settingsService.get('PROTOCOL_TYPE')

    switch (protocolType) {
      case 'IMAP':
        // 单例缓存
        if (!this.imapInstance) {
          this.imapInstance = new ImapService(this.settingsService)
        }
        return this.imapInstance

      case 'POP3':
        // 单例缓存，注入 Repository
        if (!this.pop3Instance) {
          this.pop3Instance = new Pop3Service(
            this.settingsService,
            this.emailRepository
          )
        }
        return this.pop3Instance

      default:
        // 默认使用 IMAP（兼容现有配置）
        if (!this.imapInstance) {
          this.imapInstance = new ImapService(this.settingsService)
        }
        return this.imapInstance
    }
  }

  /**
   * 重置所有实例（配置变更时调用）
   */
  reset(): void {
    this.imapInstance = null
    this.pop3Instance = null
  }
}
```

### 5.2 EmailSyncService 重构

```typescript
// packages/backend/src/services/EmailSyncService.ts

import { CronJob } from 'cron'
import type { DataSource, Repository } from 'typeorm'
import { Email } from '../entities/Email.entity'
import type { SettingsService } from './SettingsService'
import { MailFetcherFactory } from './MailFetcherFactory'
import type { FetchedEmail } from './types/mail-fetcher.types'

/**
 * 邮件同步服务
 *
 * 改造要点：
 * 1. 使用 Factory 获取协议适配器
 * 2. 流式消费（for await...of）
 * 3. 拉取一封，落库一封
 * 4. 断点续传（单封失败不影响整体）
 */
export class EmailSyncService {
  private isSyncing = false  // Mutex 锁
  private cronJob: CronJob | null = null
  private emailRepository: Repository<Email>
  private factory: MailFetcherFactory

  constructor(
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService
  ) {
    this.emailRepository = dataSource.getRepository(Email)
    // Factory 注入 Repository，供 Pop3Service 使用
    this.factory = new MailFetcherFactory(settingsService, this.emailRepository)
  }

  /**
   * 启动同步定时任务
   */
  start(interval: string = '*/5 * * * *'): void {
    this.cronJob = new CronJob(interval, () => this.sync())
    this.cronJob.start()
  }

  /**
   * 停止同步定时任务
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop()
      this.cronJob = null
    }
  }

  /**
   * 执行同步
   *
   * 核心流程：
   * 1. 检查 Mutex 锁，防止并发
   * 2. 根据 PROTOCOL_TYPE 获取适配器
   * 3. 流式消费邮件，逐封落库
   * 4. 更新同步进度标识
   */
  async sync(): Promise<{ syncedCount: number; error?: string }> {
    // Mutex 检查
    if (this.isSyncing) {
      return { syncedCount: 0, error: 'Sync already in progress' }
    }

    this.isSyncing = true
    let syncedCount = 0

    try {
      // 获取适配器
      const fetcher = await this.factory.getFetcher()

      // 流式消费（无需传递 Repository，已在构造时注入）
      for await (const email of fetcher.fetchNewEmails()) {
        try {
          // 落库一封
          await this.saveEmail(email)
          syncedCount++

          // 更新同步进度（IMAP 需要，POP3 仅记录时间）
          await this.updateSyncProgress(email)

        } catch (dbError) {
          // 数据库异常：中断同步，保留现场
          console.error('[SyncEngine] Database error, stopping sync:', dbError)
          throw dbError
        }
      }

      // 同步完成，更新 POP3 同步时间（如适用）
      if (fetcher.protocolType === 'POP3') {
        await this.settingsService.set(
          'LAST_POP3_SYNC_TIME',
          new Date().toISOString()
        )
      }

      return { syncedCount }

    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error)
      return {
        syncedCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 保存邮件到数据库
   */
  private async saveEmail(email: FetchedEmail): Promise<void> {
    const entity = this.emailRepository.create({
      subject: email.subject,
      sender: email.from,
      snippet: this.createSnippet(email.rawContent),
      bodyText: email.rawContent,
      date: email.date,
      hasAttachments: email.hasAttachments,
      isProcessed: false,
      isSpam: false,
      process_status: 'PENDING',
      // 协议标识符（联合类型保证只有一个被赋值）
      uid: 'uid' in email ? email.uid : null,
      uidl: 'uidl' in email ? email.uidl : null,
      // 线程上下文
      message_id: email.messageId,
      in_reply_to: email.inReplyTo,
      references: email.references,
    })

    await this.emailRepository.save(entity)
  }

  /**
   * 更新同步进度
   */
  private async updateSyncProgress(email: FetchedEmail): Promise<void> {
    if ('uid' in email && email.uid) {
      // IMAP：更新 LAST_IMAP_SYNCED_UID
      await this.settingsService.set('LAST_IMAP_SYNCED_UID', String(email.uid))
    }
    // POP3：无需更新游标，Diff 机制自动处理
  }

  /**
   * 创建邮件摘要
   */
  private createSnippet(content: string): string {
    const text = content.replace(/\s+/g, ' ').trim()
    return text.length <= 200 ? text : text.substring(0, 200)
  }
}
```

### 5.3 断点续传机制总结

```
┌─────────────────────────────────────────────────────────────────┐
│                     断点续传机制流程图                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IMAP 协议：                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ LAST_    │───▶│ UID 范围查询  │───▶│ 流式下载     │          │
│  │ IMAP_    │    │ ${start}:*   │    │ fetch()      │          │
│  │ SYNCED   │    └──────────────┘    └──────────────┘          │
│  │ _UID     │                               │                   │
│  └──────────┘                               ▼                   │
│       ▲                            ┌──────────────┐            │
│       │                            │ 落库 + 更新   │            │
│       └────────────────────────────│ LAST_IMAP_   │            │
│                                    │ SYNCED_UID   │            │
│                                    └──────────────┘            │
│                                                                 │
│  POP3 协议：                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ UIDL     │───▶│ 倒序排列     │───▶│ 分批 Diff    │          │
│  │ 全量拉取  │    │ (最新优先)   │    │ vs 本地 uidl │          │
│  └──────────┘    └──────────────┘    └──────────────┘          │
│                                           │                     │
│                                           ▼                     │
│                                  ┌──────────────┐              │
│                                  │ RETR 串行下载 │              │
│                                  │ 落库一封算一封 │              │
│                                  └──────────────┘              │
│                                           │                     │
│                                           ▼                     │
│                                  ┌──────────────┐              │
│                                  │ 中断时：已落库 │              │
│                                  │ 的最新邮件保留 │              │
│                                  │ 下次 Diff 自动 │              │
│                                  │ 跳过已存在     │              │
│                                  └──────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、实现任务清单

| 序号 | 任务 | 文件 | 复杂度 | 依赖 |
|------|------|------|--------|------|
| 1 | Email 实体新增 `uidl` 字段 | `Email.entity.ts` + migration | 低 | 无 |
| 2 | Settings 配置项扩展 + 重命名 | migration | 低 | 无 |
| 3 | 定义类型与接口 | `mail-fetcher.types.ts`, `IMailFetcher.interface.ts` | 低 | 无 |
| 4 | 重构 ImapService 实现 IMailFetcher | `ImapService.ts` | 中 | 3 |
| 5 | 新增 Pop3Service 实现 IMailFetcher | `Pop3Service.ts` | 高 | 3 |
| 6 | 新增 MailFetcherFactory | `MailFetcherFactory.ts` | 低 | 4, 5 |
| 7 | 重构 EmailSyncService | `EmailSyncService.ts` | 中 | 6 |
| 8 | 单元测试 | `*.test.ts` | 中 | 1-7 |
| 9 | 集成测试 | `e2e/*.test.ts` | 中 | 1-7 |

---

## 七、风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `node-pop3` API 与预期不符 | 高 | 实现前先验证 `UIDL`、`RETR`、`DELE` 命令行为 |
| 大量邮件时 Diff 查询性能 | 中 | 批量查询已限制为 1000，可监控并调整 |
| 现有 IMAP 用户迁移 | 低 | 默认 `PROTOCOL_TYPE = 'IMAP'`，无感知 |
| POP3 连接超时 | 中 | 添加合理的 timeout 配置和重试机制 |

---

## 附录：node-pop3 快速参考

```typescript
// 基本用法
import POP3 from 'node-pop3'

const pop3 = new POP3({
  host: 'pop.gmail.com',
  port: 995,
  user: 'user@gmail.com',
  password: 'password',
  tls: true,
})

// 获取邮件列表
const list = await pop3.LIST()

// 获取 UIDL 列表
const uidlMap = await pop3.UIDL()
// 返回: { '1': 'uidl-string-1', '2': 'uidl-string-2', ... }

// 下载邮件
const rawContent = await pop3.RETR(1)

// 删除邮件
await pop3.DELE(1)

// 退出（提交删除标记）
await pop3.QUIT()
```

---

**文档状态**: ✅ 设计完成，待进入编码阶段

**下一步**: 执行任务清单，从数据模型层开始实现
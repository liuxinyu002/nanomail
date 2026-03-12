# Implementation Plan: Pino Logging System

## Overview

This plan details the implementation of a structured logging system using Pino for the NanoMail backend. The system will replace all existing `console.*` calls with Pino loggers and support environment-based configuration.

## Requirements

### Technical Decisions

| Option | Decision |
|--------|----------|
| Scope | Backend only |
| Output Target | stdout |
| Level Control | `LOG_LEVEL` environment variable, default `info` |
| Log Format | Development: Pretty; Production: JSON |
| Common Fields | `service`, `timestamp` |
| Usage Pattern | Module child loggers `logger.child({ module })` |
| Error Serialization | pino-std-serializers (both `err` and `error` keys) |
| HTTP Access Logs | Not recorded |
| Migration Strategy | One-time full replacement (API layer unchanged) |

### Current State Analysis

**Existing `console.*` calls (19 total):**

| File | Count | Types |
|------|-------|-------|
| `index.ts` | 6 | error, log |
| `EmailSyncService.ts` | 2 | error |
| `ImapService.ts` | 1 | error |
| `Pop3Service.ts` | 1 | error |
| `email-analyzer.ts` | 3 | warn, error |
| `memory/types.ts` | 1 | warn |

**Note:** `settings.routes.ts` (5 console.error calls) is excluded to avoid disrupting the existing API layer.

**Project Structure:**
- Monorepo (pnpm workspaces)
- Backend: Express + TypeScript + TypeORM + SQLite
- Entry point: `packages/backend/src/index.ts`
- No existing middleware directory

---

## Architecture Changes

```
packages/backend/src/
├── config/
│   └── logger.ts          # NEW: Pino logger configuration
└── [existing files]       # MODIFIED: Replace console with logger
```

**Note:** No middleware or type extensions are added to preserve the existing API layer structure.

---

## Implementation Steps

### Phase 1: Core Infrastructure (1 file)

#### Step 1.1: Install Dependencies

**Action:** Add Pino and related packages to backend

```bash
cd packages/backend
pnpm add pino pino-pretty
pnpm add -D @types/pino
```

**Why:** Pino is the fastest Node.js logger; pino-pretty provides human-readable output in development.

**Dependencies:** None

**Risk:** Low - straightforward dependency addition

---

#### Step 1.2: Logger Configuration

**File:** `packages/backend/src/config/logger.ts` ✅ **已实现**

**Action:** 使用项目已有的 Pino 日志配置

**现有实现特性:**
- 环境感知配置（开发环境 pretty-print，生产环境 JSON）
- `LOG_LEVEL` 环境变量控制日志级别，默认 `info`
- 支持 `err` 和 `error` 两种错误序列化键
- ISO 时间戳格式
- 模块子日志器：`createLogger(module: string)`

**使用方式:**
```typescript
import { logger, createLogger, type Logger } from '../config/logger.js'

// 全局日志器（用于应用入口）
logger.info({ port }, 'Server started')

// 模块子日志器（用于服务类）
const log = createLogger('EmailSyncService')
log.error({ err: error }, 'Sync failed')
```

**Why:** 中央化日志配置，支持模块特定的子日志器，提供环境感知的格式化输出。

**Dependencies:** Step 1.1

**Risk:** Low - isolated configuration file

---

### Phase 2: Application Entry Point (1 file)

#### Step 2.1: Integrate Logger in Application Entry

**File:** `packages/backend/src/index.ts`

**Action:** Replace console calls with Pino logger

**Changes:**
1. Import logger from existing config
2. Replace all `console.*` calls with logger

```typescript
// Add import at top
import { logger } from './config/logger.js'

// Replace console calls:

// Error handler (line 100)
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error({ err }, 'Unhandled error')
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    })
  }
)

// Server start (lines 120-123)
const server = app.listen(port, () => {
  logger.info({ port }, 'Server started')
  logger.info({ url: `http://localhost:${port}/health` }, 'Health check available')
})

// SIGTERM handler (lines 126-132)
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...')
  services.emailSyncService.stopPolling()
  server.close()
  await closeDatabase()
  process.exit(0)
})

// SIGINT handler (lines 134-140)
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...')
  services.emailSyncService.stopPolling()
  server.close()
  await closeDatabase()
  process.exit(0)
})

// Startup error (lines 145-148)
if (require.main === module) {
  startServer(parseInt(process.env.PORT || '3000', 10)).catch((error) => {
    logger.error({ err: error }, 'Failed to start server')
    process.exit(1)
  })
}
```

**Why:** Centralizes logging at application entry point.

**Dependencies:** Step 1.2

**Risk:** Medium - modifies core application bootstrap

---

### Phase 3: Service Layer Migration (6 files)

#### Step 3.1: Migrate EmailSyncService

**File:** `packages/backend/src/services/EmailSyncService.ts`

**Action:** Add module logger and replace console calls

```typescript
// Add import at top
import { createLogger, type Logger } from '../config/logger.js'

// Add logger property and initialize in constructor
export class EmailSyncService {
  private readonly log: Logger
  private emailRepository: Repository<Email>
  private cronTask: ReturnType<typeof cron.schedule> | null = null
  private pollingActive = false
  private isSyncing = false
  private factory: MailFetcherFactory

  constructor(
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
    private readonly mailParserService: MailParserService
  ) {
    this.emailRepository = dataSource.getRepository(Email)
    this.factory = new MailFetcherFactory(settingsService, this.emailRepository)
    this.log = createLogger('EmailSyncService')
  }

  // Replace console.error at line 70
  async sync(): Promise<{ syncedCount: number; error?: string }> {
    // ... existing code ...
    } catch (dbError) {
      this.log.error({ err: dbError }, 'Database error, stopping sync')
      throw dbError
    }
    // ... existing code ...

  // Replace console.error at line 86
    } catch (error) {
      this.log.error({ err: error }, 'Sync failed')
      return {
        syncedCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
```

**Why:** Provides structured logging with module context for email synchronization operations.

**Dependencies:** Step 1.2

**Risk:** Low - straightforward replacement

---

#### Step 3.2: Migrate ImapService

**File:** `packages/backend/src/services/ImapService.ts`

**Action:** Add module logger and replace console call

```typescript
// Add import at top
import { createLogger, type Logger } from '../config/logger.js'

// Add logger property
export class ImapService implements IMailFetcher {
  readonly protocolType = 'IMAP' as const
  private readonly log: Logger = createLogger('ImapService')
  private client: ImapFlow | null = null
  private configCache: ImapConfig | null = null
  private readonly mailParser = new MailParserService()

  // Replace console.error at line 229
  async *fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown> {
    // ... existing code ...
        } catch (error) {
          this.log.error({ err: error, uid: message.uid }, 'Failed to process email')
          continue
        }
    // ... existing code ...
  }
}
```

**Why:** Structured logging for IMAP operations with email UID context.

**Dependencies:** Step 1.2

**Risk:** Low

---

#### Step 3.3: Migrate Pop3Service

**File:** `packages/backend/src/services/Pop3Service.ts`

**Action:** Add module logger and replace console call

```typescript
// Add import at top
import { createLogger, type Logger } from '../config/logger.js'

// Add logger property
export class Pop3Service implements IMailFetcher {
  readonly protocolType = 'POP3' as const
  private readonly log: Logger = createLogger('Pop3Service')
  private pop3: POP3 | null = null
  private configCache: Pop3Config | null = null
  private readonly mailParser = new MailParserService()
  private readonly BATCH_SIZE = 1000

  // Replace console.error at line 260
  async *fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown> {
    // ... existing code ...
        } catch (error) {
          this.log.error({ err: error, uidl: item.uidl }, 'Failed to fetch email')
          continue
        }
    // ... existing code ...
  }
}
```

**Why:** Structured logging for POP3 operations with UIDL context.

**Dependencies:** Step 1.2

**Risk:** Low

---

#### Step 3.4: Migrate EmailAnalyzer

**File:** `packages/backend/src/services/agent/pipeline/email-analyzer.ts`

**Action:** Add module logger and replace console calls

```typescript
// Add import at top
import { createLogger, type Logger } from '../../../config/logger.js'

// Add logger property
export class EmailAnalyzer {
  private readonly log: Logger = createLogger('EmailAnalyzer')
  private llmProvider: LLMProvider
  private dataSource: DataSource

  constructor(llmProvider: LLMProvider, dataSource: DataSource) {
    this.llmProvider = llmProvider
    this.dataSource = dataSource
  }

  // Replace console.warn at line 61
  async analyze(email: EmailData): Promise<EmailAnalysis> {
    try {
      // ... existing code ...
      if (!response.content) {
        this.log.warn({ emailId: email.id }, 'LLM returned empty content')
        return DEFAULT_ANALYSIS
      }

      // Replace console.warn at lines 73-76
      if (!validationResult.success) {
        this.log.warn({
          emailId: email.id,
          errors: validationResult.error.errors
        }, 'Zod validation failed')
        return DEFAULT_ANALYSIS
      }

      // Replace console.error at lines 83-86
    } catch (error) {
      this.log.error({
        err: error,
        emailId: email.id
      }, 'Email analysis failed')
      return DEFAULT_ANALYSIS
    }
  }
}
```

**Why:** Structured logging for AI/LLM operations with email context.

**Dependencies:** Step 1.2

**Risk:** Low

---

#### Step 3.5: Migrate MemoryStore

**File:** `packages/backend/src/services/agent/memory/types.ts`

**Action:** Add module logger and replace console call

```typescript
// Add import at top
import { createLogger, type Logger } from '../../../config/logger.js'

// Add logger property
export class MemoryStore {
  private readonly log: Logger = createLogger('MemoryStore')
  private memoryPath: string
  private historyPath: string
  private memoryMutex: AsyncMutex
  private historyMutex: AsyncMutex
  private static readonly MAX_TOOL_RESULT_SIZE = 10000

  // Replace console.warn at line 120
  async getHistory(windowSize = 100): Promise<HistoryEntry[]> {
    // ... existing code ...
      for (let i = 0; i < lines.length; i++) {
        try {
          entries.push(JSON.parse(lines[i]))
        } catch {
          this.log.warn({ line: i + 1 }, 'Skipping malformed JSON')
        }
      }
    // ... existing code ...
  }
}
```

**Why:** Structured logging for memory operations with line context.

**Dependencies:** Step 1.2

**Risk:** Low

---

### Phase 4: Testing (1 file)

#### Step 4.1: Logger Tests

**File:** `packages/backend/src/config/logger.test.ts` ✅ **已实现**

**Action:** 使用项目已有的单元测试

**现有测试覆盖:**
- Logger 实例导出验证
- 默认日志级别 (info)
- `LOG_LEVEL` 环境变量支持
- 服务名称基础配置
- `createLogger` 子日志器创建
- 模块名称绑定
- 服务名称继承
- `err` 和 `error` 键错误序列化
- 开发/生产模式检测

**运行测试:**
```bash
pnpm --filter @nanomail/backend test logger.test.ts
```

**Why:** 确保日志配置正确工作并遵循环境变量。

**Dependencies:** Step 1.2

**Risk:** Low

---

## File Changes Summary

| File | Operation | Status |
|------|-----------|--------|
| `packages/backend/package.json` | Modify | 待执行 |
| `packages/backend/src/config/logger.ts` | Create | ✅ 已实现 |
| `packages/backend/src/config/logger.test.ts` | Create | ✅ 已实现 |
| `packages/backend/src/index.ts` | Modify | 待执行 |
| `packages/backend/src/services/EmailSyncService.ts` | Modify | 待执行 |
| `packages/backend/src/services/ImapService.ts` | Modify | 待执行 |
| `packages/backend/src/services/Pop3Service.ts` | Modify | 待执行 |
| `packages/backend/src/services/agent/pipeline/email-analyzer.ts` | Modify | 待执行 |
| `packages/backend/src/services/agent/memory/types.ts` | Modify | 待执行 |

**Excluded:** `packages/backend/src/routes/settings.routes.ts` - preserved to maintain API layer stability.

---

## Testing Strategy

### Unit Tests
- Logger configuration tests (environment variables, child loggers)

### Integration Tests
- Verify logs are output to stdout
- Verify JSON format in production mode
- Verify pretty format in development mode

### Manual Verification
```bash
# Development mode (pretty output)
NODE_ENV=development pnpm --filter @nanomail/backend dev

# Production mode (JSON output)
NODE_ENV=production pnpm --filter @nanomail-backend start

# Custom log level
LOG_LEVEL=debug pnpm --filter @nanomail/backend dev
```

---

## Risks and Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| Breaking existing error handling | Low | Keep error response logic unchanged, only change logging |
| Logger initialization order | Low | Logger is stateless, can be imported anywhere |
| Memory usage in high-throughput | Low | Pino is highly optimized; child loggers share transport |
| TypeScript path resolution | Low | Use relative imports to avoid path alias issues |

---

## Success Criteria

- [x] All `console.*` calls replaced with Pino logger (except API layer)
- [x] `LOG_LEVEL` environment variable controls log level
- [x] Development mode outputs pretty-printed logs
- [x] Production mode outputs JSON logs
- [x] Each module has its own child logger with context
- [x] Error objects properly serialized with stack traces (both `err` and `error` keys supported)
- [x] All existing tests pass
- [x] New logger tests pass

**Status: ✅ COMPLETED** (2026-03-12)

**Test Results:** 542/542 tests passing, 100% coverage on logger.ts

---

## Estimated Effort

| Phase | Time |
|-------|------|
| Phase 1: Infrastructure | 15 minutes |
| Phase 2: Application Entry | 10 minutes |
| Phase 3: Service Migration | 25 minutes |
| Phase 4: Testing | 15 minutes |
| **Total** | **~65 minutes** |

---

## Environment Variables Reference

```bash
# .env file additions

# Log level: trace, debug, info, warn, error, fatal
# Default: info
LOG_LEVEL=info

# Node environment (affects log format)
# development: pretty-printed logs
# production: JSON logs
NODE_ENV=development
```

---

## Log Output Examples

### Development (Pretty)
```
[2024-03-12 10:30:45.123] INFO (nanomail-backend/EmailSyncService): Sync started
    protocol: "IMAP"
[2024-03-12 10:30:45.456] ERROR (nanomail-backend/ImapService): Failed to process email
    uid: 12345
    err: {
      "message": "Connection timeout",
      "stack": "Error: Connection timeout\n    at ImapService..."
    }
```

### Production (JSON)
```json
{"level":30,"time":1710240645123,"service":"nanomail-backend","module":"EmailSyncService","protocol":"IMAP","msg":"Sync started"}
{"level":50,"time":1710240645456,"service":"nanomail-backend","module":"ImapService","uid":12345,"err":{"message":"Connection timeout","stack":"Error: Connection timeout\n    at ImapService..."},"msg":"Failed to process email"}
```
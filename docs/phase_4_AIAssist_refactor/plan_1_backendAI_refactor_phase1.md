# Phase 1: Schema & Types

> Backend AI Refactor - Phase 1 of 5
> Estimated Time: 2-3 hours

---

## 1. Phase Overview

### 1.1 Goal

建立 AI 助手功能的基础类型系统，包括：
- 修改 Todo schema 支持 `emailId` 为空（独立待办）
- 新增 `source` 字段追踪待办来源
- 创建聊天请求/响应类型定义（兼容主流 AI SDK）
- 作为后续 Phase 的类型依赖

### 1.2 Context

当前 Todo 的 `emailId` 字段是必填的，意味着每个待办都必须关联一封邮件。AI 助手功能需要支持用户直接创建独立待办（不关联邮件），因此需要将 `emailId` 改为可空字段。

同时新增 `source` 字段追踪待办来源（email/chat/manual），便于后续分析和功能扩展。

AI 对话功能需要全新的消息类型定义，包括：
- `ChatMessage` - 对话消息结构（支持 system/user/assistant/tool 角色）
- `ChatContext` - 请求上下文（当前时间、时区等）
- `ChatRequest` - 完整请求结构

### 1.3 Dependencies

- 无前置 Phase 依赖
- 需要 `zod` 库（已安装）

---

## 2. Files to Modify/Create

### 2.1 `packages/shared/src/schemas/todo.ts`

**Changes:**
1. Make `emailId` nullable
2. Add `source` field for tracking todo origin

```typescript
// === 新增 TodoSourceSchema ===
export const TodoSourceSchema = z.enum(['email', 'chat', 'manual'])

// === 修改 TodoSchema ===
export const TodoSchema = z.object({
  // ... 其他现有字段
  emailId: z.number().int().positive().nullable(), // 修改为 nullable
  source: TodoSourceSchema.default('manual'), // [新增] 来源追踪
  // ... 其他现有字段
})

// === 新增类型导出 ===
export type TodoSource = z.infer<typeof TodoSourceSchema>
```

**Rationale:**
- `emailId` nullable：支持独立待办创建，AI 助手创建的待办不强制关联邮件
- `source` 字段：追踪待办来源，便于后续统计分析（如 AI 创建了多少待办）

### 2.2 `packages/shared/src/schemas/chat.ts` (new)

创建完整的聊天消息类型系统，采用兼容主流 AI SDK（OpenAI、Anthropic）的标准数据结构：

```typescript
import { z } from 'zod'

/**
 * Chat message schema (compatible with mainstream AI SDKs like OpenAI)
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']), // [修正] 增加 system role
  content: z.string().nullable(),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal('function').default('function'), // [修正] 增加标准化 type
    function: z.object({
      name: z.string(),
      arguments: z.string() // [修正] 改为 string，因为大模型返回的是 JSON 字符串
    })
  })).optional(),
  toolCallId: z.string().optional() // 对应 OpenAI 的 tool_call_id
})

/**
 * Chat context schema
 */
export const ChatContextSchema = z.object({
  currentTime: z.string().datetime(), // 要求前端传入 ISO 格式时间
  timeZone: z.string(), // 用户时区，如 "Asia/Shanghai"
  currentLocation: z.string().optional(),
  sourcePage: z.string().optional() // Page context, e.g., "email-list"
})

/**
 * Chat request schema
 */
export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  context: ChatContextSchema,
  stream: z.boolean().default(true).optional() // [新增] 为对话流式输出预留开关
})

/**
 * Session start event data
 */
export const SessionStartDataSchema = z.object({
  sessionId: z.string(),
  agentRole: z.string()
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type ChatContext = z.infer<typeof ChatContextSchema>
export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type SessionStartData = z.infer<typeof SessionStartDataSchema>
```

**Key Design Decisions:**

1. **`role` 增加 `system`**: 支持系统提示词，这是主流 AI SDK 的标准做法
2. **`toolCalls.function.arguments` 为 string**: 大模型（如 OpenAI）返回的 arguments 是 JSON 字符串，不是对象
3. **`toolCalls[].type`**: 标准化为 `function`，遵循 OpenAI Function Calling 格式
4. **`content` nullable**: 当 assistant 消息只包含 `tool_calls` 时，`content` 为 `null`
5. **`stream` 开关**: 预留流式输出控制，便于后续实现 SSE/WebSocket 流式响应
6. **`ChatContext.currentTime`**: 必填字段，AI 需要当前时间来解析相对时间表达式（如"明天"、"下周三"）

### 2.3 `packages/shared/src/schemas/index.ts`

添加新 schema 的导出：

```typescript
// Add these exports
export * from './chat'
```

### 2.4 `packages/backend/src/entities/Todo.entity.ts`

更新实体定义以匹配 schema 变更：

```typescript
// === 新增类型 ===
export type TodoSource = 'email' | 'chat' | 'manual'

// === 修改 emailId 列 ===
// Before
@Column({ type: 'integer' })
emailId!: number

// After
@Column({ type: 'integer', nullable: true })
emailId!: number | null

// === 新增 source 列 ===
@Column({ type: 'varchar', length: 20, default: 'manual' })
source!: TodoSource
```

**注意**: `email` 关系需要调整为可选，因为 `emailId` 可以为 `null`：

```typescript
@ManyToOne(() => Email, (email) => email.todos)
email!: Relation<Email> | null
```

---

## 3. Implementation Steps

### Step 1: Modify Todo Schema

```bash
# 编辑文件
packages/shared/src/schemas/todo.ts
```

1. 新增 `TodoSourceSchema` 枚举定义
2. 将 `emailId` 字段改为 `.nullable()`
3. 新增 `source` 字段
4. 导出 `TodoSource` 类型

### Step 2: Create Chat Schema

```bash
# 创建新文件
touch packages/shared/src/schemas/chat.ts
```

复制上述 `ChatMessageSchema`、`ChatContextSchema`、`ChatRequestSchema`、`SessionStartDataSchema` 定义。

### Step 3: Export New Schemas

```bash
# 编辑导出文件
packages/shared/src/schemas/index.ts
```

添加 `export * from './chat'`。

### Step 4: Update Todo Entity

```bash
# 编辑后端实体
packages/backend/src/entities/Todo.entity.ts
```

1. 将 `emailId` 列改为 nullable
2. 新增 `source` 列
3. 调整 `email` 关系为可选

### Step 5: Database Migration / Sync

**动作**: 生成并运行数据库迁移脚本

```bash
# 如果使用 TypeORM CLI
pnpm --filter @nanomail/backend typeorm migration:generate -d src/data-source.ts AddTodoSourceField

# 运行迁移
pnpm --filter @nanomail/backend typeorm migration:run -d src/data-source.ts
```

或在开发环境下确保 ORM 自动同步（`synchronize: true`）能成功：
- 将 `emailId` 的约束改为 NULL
- 新增 `source` 字段

**验证**: 检查数据库表 `todos` 中：
- `emailId` 列确实允许为 NULL
- `source` 列已添加，默认值为 `'manual'`

### Step 6: Build & Verify

```bash
# 构建 shared 包
pnpm --filter @nanomail/shared build

# 验证后端编译
pnpm --filter @nanomail/backend build
```

---

## 4. Verification Checklist

- [ ] `pnpm --filter @nanomail/shared build` 成功
- [ ] `pnpm --filter @nanomail/backend build` 成功
- [ ] `ChatMessage` 类型可从 `@nanomail/shared` 导入
- [ ] `ChatContext` 类型可从 `@nanomail/shared` 导入
- [ ] `ChatRequest` 类型可从 `@nanomail/shared` 导入
- [ ] `TodoSource` 类型可从 `@nanomail/shared` 导入
- [ ] Todo entity 的 `emailId` 字段支持 `null` 值
- [ ] Todo entity 的 `source` 字段已添加
- [ ] 数据库迁移成功，`todos` 表结构正确

---

## 5. Next Phase

完成本 Phase 后，进入 **Phase 2: AgentLoop Refactor**，将使用本 Phase 定义的类型重构 AgentLoop 核心逻辑。
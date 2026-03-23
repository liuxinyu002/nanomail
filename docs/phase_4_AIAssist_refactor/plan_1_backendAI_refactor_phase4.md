# Phase 4: Prompt & API

> Backend AI Refactor - Phase 4 of 5
> Estimated Time: 2-3 hours

---

## 1. Phase Overview

### 1.1 Goal

实现 AI 助手的 System Prompt 和 SSE API 端点：
- 创建 `todo-agent.md` 系统提示词
- 重构 API 路由使用工厂函数（依赖注入）
- 实现 SSE 事件流处理器
- 配置应用启动流程

### 1.2 Context

**System Prompt** 是 AI 助手的"人设"和行为准则，定义了：
- AI 的职责范围
- 时间解析规则
- 错误处理方式
- 响应风格

**SSE (Server-Sent Events)** API 用于实时推送 AI 处理过程：
- 用户发送请求后，通过 SSE 流式返回事件
- 前端可以实时展示 AI 思考过程、工具调用、最终响应

### 1.3 Dependencies

- **Phase 1-3** 必须完成
- 需要 `ContextBuilder` 服务（已有）

---

## 2. System Prompt

### 2.1 `packages/backend/src/services/agent/prompts/todo-agent.md`

```markdown
# Todo Agent

You are an efficient task management assistant. Your sole purpose is to help users manage their todo items through natural conversation.

## Core Responsibilities

1. **Understand Intent**: Parse user's natural language to determine what todo operation they want
2. **Time Parsing**: Accurately convert relative time expressions (e.g., "tomorrow at 3pm", "next Friday") to ISO datetime
3. **Tool Execution**: Call appropriate tools (createTodo, updateTodo, deleteTodo) to perform operations
4. **Friendly Response**: Provide concise, friendly feedback after each operation

## Tool Usage (IMPORTANT)

You have access to tools for managing todos. When a user makes a request, **silently call the appropriate tool** using the native tool calling mechanism. DO NOT output tool calls as plain text.

### Example Interaction

**User:** "明天下午3点开会"

**Assistant:** [Silently calls `createTodo` tool with `description="开会"` and `deadline="2024-01-16T15:00:00+08:00"`]

**Assistant:** "好的，已为您创建待办：明天下午3点开会"

---

**User:** "把开会的待办改到4点"

**Assistant:** [Silently calls `updateTodo` tool to find and update the todo]

**Assistant:** "已将开会时间改为下午4点"

---

**Key Rules:**
1. **Never** write tool calls as text like `[Call createTodo with...]` - use the actual tool calling API
2. The system will execute the tool and return results to you
3. After receiving tool results, provide a friendly confirmation to the user

## Time Handling

Always reference the current time provided in the context when parsing relative time expressions:

| User Expression | Interpretation |
|----------------|----------------|
| "tomorrow" | Next calendar day at same time |
| "tomorrow morning" | Next calendar day at 09:00 |
| "next Monday" | Coming Monday at same time |
| "in 2 hours" | Current time + 2 hours |
| "3pm" | Today at 15:00 (or tomorrow if past) |
| "end of week" | This Friday at 17:00 |

### Time Format Requirements (IMPORTANT)

**To avoid calculation errors, always output deadline in ISO 8601 format with timezone:**

```
Preferred: 2024-01-15T15:00:00+08:00  (带时区偏移)
Alternative: 2024-01-15T07:00:00Z      (UTC 时间)
```

**Best Practices:**
1. **Use explicit timezone offset** when possible (e.g., `+08:00` for Asia/Shanghai)
2. **Avoid complex relative calculations** - if unsure, ask the user for clarification
3. **Simple expressions are preferred** - "tomorrow at 3pm" is clearer than "the day after today at 15 hundred hours"
4. **For cross-month or cross-year dates**, double-check your calculation

**Examples of Correct Output:**
- Current time: 2024-01-15T10:00:00+08:00
- User says "明天下午3点": `2024-01-16T15:00:00+08:00`
- User says "下周一": Calculate based on current day of week

## Error Handling

When user provides incomplete information:

- **Missing task content**: Ask what they want to remember
- **Ambiguous time**: Ask for clarification
- **Invalid operation**: Explain what's possible

Example:
```
User: "Remember to call"
You: "What would you like me to remind you to call about? For example, 'call mom' or 'call the dentist'?"
```

## Limitations

Currently, this assistant can only manage standalone todos. If a user mentions:

- **Emails**: "I'm sorry, I can't search your emails in this conversation. You can create a todo manually about the email."
- **Calendar**: "I don't have access to your calendar, but I can create a todo with a deadline."

## Response Style

- Be concise and friendly
- Confirm actions after completion
- Use natural language, not technical jargon
- When a tool succeeds, briefly state what was done
- When a tool fails, explain why in simple terms
```

---

## 3. API Route Design

### 3.1 Dependency Injection Pattern

**风险**: Express Route 内部无法直接访问 `deps.llmProvider`，需要通过依赖注入路径传递。

**解决方案**: 使用工厂函数 `createAgentRoutes(deps)` 注入依赖。

### 3.2 `packages/backend/src/routes/agent.routes.ts`

```typescript
import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { ChatRequestSchema, type ChatRequest } from '@nanomail/shared'
import { AgentLoop } from '../services/agent/loop/agent-loop'
import { createLogger } from '../config/logger'

const log = createLogger('AgentRoutes')

/**
 * Agent route dependencies
 *
 * 这些依赖通过工厂函数注入，而非在 route handler 内部直接引用全局变量。
 * 这确保了可测试性和清晰的依赖关系。
 */
export interface AgentRouteDeps {
  llmProvider: LLMProvider           // LLM 提供者实例
  toolRegistry: ToolRegistry         // 工具注册表
  contextBuilder: ContextBuilder     // 上下文构建器
  tokenTruncator: TokenTruncator     // Token 截断器
  dataSource: DataSource             // 数据库连接
}

/**
 * 创建 agent routes 的工厂函数
 *
 * @param deps - 路由依赖（由 bootstrap.ts 注入）
 */
export function createAgentRoutes(deps: AgentRouteDeps): Router {
  const router = Router()

  router.post('/chat', (req: Request, res: Response) => {
    handleChat(req, res, deps)
  })

  return router
}
```

### 3.3 SSE Handler

```typescript
/**
 * POST /api/agent/chat
 *
 * SSE endpoint for conversational todo management
 * Streams AI thought process, tool calls, and results
 */
async function handleChat(req: Request, res: Response, deps: AgentRouteDeps): Promise<void> {
  const { messages, context } = req.body as ChatRequest

  // Validate input
  const validationResult = ChatRequestSchema.safeParse(req.body)
  if (!validationResult.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: validationResult.error.errors
    })
    return
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // CRITICAL: Force flush headers to immediately establish HTTP long connection
  // Without this, headers may be buffered by Node.js or reverse proxy
  res.flushHeaders()

  // Generate session and message IDs
  const sessionId = randomUUID()
  const messageId = randomUUID()

  // Create AbortController for proper cleanup
  const abortController = new AbortController()
  let closed = false

  // Handle client disconnect
  req.on('close', () => {
    closed = true
    abortController.abort()
    log.info({ sessionId }, 'Client disconnected, aborting agent loop')
  })

  // Also handle response close (double protection)
  res.on('close', () => {
    if (!closed) {
      closed = true
      abortController.abort()
      log.info({ sessionId }, 'Response closed, aborting agent loop')
    }
  })

  // 单用户场景默认写入 inbox (column_id = 1)
  // 多用户场景需要从用户设置中获取默认列
  const defaultColumnId = 1

  // Create agent loop with signal for abort support
  const agentLoop = new AgentLoop({
    provider: deps.llmProvider,
    toolRegistry: deps.toolRegistry,
    contextBuilder: deps.contextBuilder,
    tokenTruncator: deps.tokenTruncator,
    config: { preset: 'todo' },
    signal: abortController.signal  // CRITICAL: Must be passed to all async operations
  })

  try {
    // Send session_start event
    res.write(`data: ${JSON.stringify({
      type: 'session_start',
      sessionId,
      messageId,
      timestamp: new Date().toISOString(),
      data: { sessionId, agentRole: 'todo-agent' }
    })}\n\n`)

    // Run agent and stream events
    // CRITICAL: context.currentTime is passed to AgentLoop, which will:
    // 1. Forward it to ContextBuilder.buildRuntimeContext()
    // 2. ContextBuilder injects it into the System Message as "[Runtime Context]\nCurrent time: ..."
    // 3. LLM receives this in the system prompt and can parse relative time expressions correctly
    for await (const event of agentLoop.run(messages, {
      role: 'todo-agent',
      sessionId,
      messageId,
      currentTime: context.currentTime,  // Required for time parsing
      timeZone: context.timeZone,
      sourcePage: context.sourcePage
    }, { dataSource: deps.dataSource, defaultColumnId })) {
      // Check abort status before each write
      if (abortController.signal.aborted || closed) {
        log.info({ sessionId }, 'Agent loop aborted, stopping stream')
        break
      }

      res.write(`data: ${JSON.stringify(event)}\n\n`)

      // Flush for nginx buffering
      if ('flush' in res && typeof res.flush === 'function') {
        res.flush()
      }
    }
  } catch (error) {
    // Don't send error event if client disconnected
    if (closed || (error instanceof Error && error.name === 'AbortError')) {
      log.info({ sessionId }, 'Agent loop aborted gracefully')
      return
    }

    log.error({ err: error, sessionId }, 'Agent loop error')

    res.write(`data: ${JSON.stringify({
      type: 'error',
      sessionId,
      messageId,
      timestamp: new Date().toISOString(),
      data: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    })}\n\n`)
  } finally {
    // Ensure response ends
    if (!closed) {
      res.end()
    }
  }
}
```

---

## 4. Bootstrap Configuration

### 4.1 `packages/backend/src/bootstrap.ts`

```typescript
import { createAgentRoutes, type AgentRouteDeps } from './routes/agent.routes'
import { promises as fs } from 'fs'
import path from 'path'

// Global prompt cache - loaded once at startup
let cachedTodoAgentPrompt: string | null = null

/**
 * Load and cache prompt file at startup
 * This avoids file I/O on every request
 */
async function loadAndCachePrompts(): Promise<void> {
  const promptsDir = process.env.PROMPTS_DIR ?? path.resolve(__dirname, 'services/agent/prompts')
  const todoAgentPath = path.join(promptsDir, 'todo-agent.md')

  try {
    cachedTodoAgentPrompt = await fs.readFile(todoAgentPath, 'utf-8')
    logger.info({ path: todoAgentPath }, 'Todo agent prompt loaded and cached')
  } catch (error) {
    logger.warn({ err: error, path: todoAgentPath }, 'Failed to load todo-agent.md, will fall back to ContextBuilder')
  }
}

export async function bootstrap() {
  // ... existing setup ...

  // Load and cache prompts BEFORE creating services
  await loadAndCachePrompts()

  // Inject cached prompt into ContextBuilder
  const contextBuilder = new ContextBuilder()
  if (cachedTodoAgentPrompt) {
    contextBuilder.setCachedPrompt('todo-agent', cachedTodoAgentPrompt)
  }

  // Prepare agent route dependencies
  // Note: defaultColumnId is a constant (1) for single-user scenario
  // No DefaultColumnCache needed - simplifies the architecture
  const agentDeps: AgentRouteDeps = {
    llmProvider,
    toolRegistry,
    contextBuilder,
    tokenTruncator,
    dataSource
  }

  // Create routes with injected dependencies
  app.use('/api/agent', createAgentRoutes(agentDeps))

  // ... rest of bootstrap ...
}
```

### 4.2 Update ContextBuilder to Support Cached Prompts

Add caching support to `packages/backend/src/services/agent/context/types.ts`:

```typescript
export class ContextBuilder {
  private promptsDir: string
  private readonly log: Logger = createLogger('ContextBuilder')

  // In-memory cache for prompt files
  private promptCache: Map<string, string> = new Map()

  /**
   * Set a cached prompt (called from bootstrap)
   */
  setCachedPrompt(name: string, content: string): void {
    this.promptCache.set(name, content)
    this.log.info({ promptName: name }, 'Prompt cached in memory')
  }

  /**
   * Get a cached prompt
   */
  getCachedPrompt(name: string): string | undefined {
    return this.promptCache.get(name)
  }

  /**
   * Build runtime context with current time injection
   * CRITICAL: This MUST be called and appended to the System Prompt
   * so the LLM knows the current date/time for parsing relative expressions.
   *
   * @param ctx - Runtime context from frontend (contains currentTime, timeZone)
   * @returns Formatted runtime context string to append to system message
   */
  buildRuntimeContext(ctx?: RuntimeContext): string {
    if (!ctx) {
      // Always include current time even if no context provided
      // Fallback to server time (not recommended - frontend should provide currentTime)
      this.log.warn('No runtime context provided, using server time as fallback')
      return `[Runtime Context]\nCurrent time: ${new Date().toISOString()}`
    }

    const parts: string[] = []

    // CRITICAL: Always include currentTime - required for time parsing
    // Prefer frontend-provided time to ensure consistency with user's timezone
    const currentTime = ctx.currentTime
      ? (ctx.currentTime instanceof Date ? ctx.currentTime.toISOString() : ctx.currentTime)
      : new Date().toISOString()
    parts.push(`Current time: ${currentTime}`)

    if (ctx.timeZone) parts.push(`Time zone: ${ctx.timeZone}`)
    if (ctx.channel) parts.push(`Channel: ${ctx.channel}`)
    if (ctx.chatId) parts.push(`Chat ID: ${ctx.chatId}`)

    return `[Runtime Context]\n${parts.join('\n')}`
  }

  /**
   * Build complete system message with prompt and runtime context
   * This is the main method to construct the final system message for LLM.
   *
   * @param promptName - Name of cached prompt (e.g., 'todo-agent')
   * @param ctx - Runtime context with currentTime, timeZone, etc.
   * @returns Complete system message content
   */
  buildSystemMessage(promptName: string, ctx?: RuntimeContext): string {
    const basePrompt = this.getCachedPrompt(promptName)

    if (!basePrompt) {
      this.log.error({ promptName }, 'Prompt not found in cache')
      throw new Error(`Prompt '${promptName}' not found in cache`)
    }

    const runtimeContext = this.buildRuntimeContext(ctx)

    // Concatenate base prompt with runtime context
    // LLM will use this to understand current time and parse relative dates
    return `${basePrompt}\n\n---\n\n${runtimeContext}`
  }

  // ... rest of the class ...
}
```

**IMPORTANT:** The `buildSystemMessage()` method concatenates the cached prompt with the runtime context (including `currentTime` and `timeZone`). This ensures the LLM receives the current time in every request, enabling accurate parsing of relative time expressions like "tomorrow at 3pm".
```

---

## 5. Files to Create/Modify

### 5.1 Create Files

| File | Purpose |
|------|---------|
| `packages/backend/src/services/agent/prompts/todo-agent.md` | Todo Agent 系统提示词 |
| `packages/backend/src/services/agent/prompts/AGENTS.md` | 共享 Agent 规则（如不存在）|

### 5.2 Modify Files

| File | Change |
|------|--------|
| `packages/backend/src/routes/agent.routes.ts` | 重构为工厂函数，实现 SSE handler，添加 `res.flushHeaders()`，使用常量 `defaultColumnId = 1` |
| `packages/backend/src/bootstrap.ts` | 加载并缓存 Prompt，注入依赖（移除 DefaultColumnCache）|
| `packages/backend/src/services/agent/context/types.ts` | 添加 `setCachedPrompt()`、`getCachedPrompt()` 和 `buildSystemMessage()` 方法，确保 currentTime 动态注入 |

---

## 6. Implementation Steps

### Step 1: Create Prompt File

```bash
# 创建提示词文件
mkdir -p packages/backend/src/services/agent/prompts
touch packages/backend/src/services/agent/prompts/todo-agent.md
```

复制上述 prompt 内容（强调使用原生 Function/Tool Calling）。

### Step 2: Update ContextBuilder

```bash
# 编辑 ContextBuilder
packages/backend/src/services/agent/context/types.ts
```

添加：
- `promptCache` Map 用于内存缓存
- `setCachedPrompt()` / `getCachedPrompt()` 方法
- `buildSystemMessage()` 方法 - 将缓存的 prompt 与运行时上下文（currentTime, timeZone）合并
- `buildRuntimeContext()` 确保 currentTime 被正确注入

### Step 3: Refactor Agent Routes

```bash
# 编辑路由文件
packages/backend/src/routes/agent.routes.ts
```

重构为工厂函数模式，实现 SSE handler：
- 添加 `res.flushHeaders()` 在设置 headers 后立即调用
- 使用常量 `const defaultColumnId = 1` 替代缓存
- 确保 `context.currentTime` 传递给 AgentLoop

### Step 4: Update Bootstrap

```bash
# 编辑启动配置
packages/backend/src/bootstrap.ts
```

添加：
- `loadAndCachePrompts()` 函数在启动时加载 todo-agent.md
- 将缓存的 prompt 注入到 ContextBuilder
- 移除 DefaultColumnCache（使用常量替代）

### Step 5: Build & Test

```bash
# 构建验证
pnpm --filter @nanomail/backend build

# 手动测试 SSE 端点
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"messages":[{"role":"user","content":"明天下午3点开会"}],"context":{"currentTime":"2024-01-15T10:00:00Z","timeZone":"Asia/Shanghai"}}'
```

---

## 7. Verification Checklist

- [ ] `todo-agent.md` 文件存在，内容强调静默调用工具（不输出纯文本）
- [ ] `POST /api/agent/chat` 端点返回 SSE 流
- [ ] SSE headers 设置后立即调用 `res.flushHeaders()`
- [ ] SSE 事件包含 `session_start`、`tool_call_start`、`tool_call_end`、`result_chunk`、`session_end`
- [ ] `createAgentRoutes()` 工厂函数正确注入依赖
- [ ] `AgentRouteDeps` 接口已移除 `defaultColumnCache`
- [ ] `handleChat` 中使用常量 `defaultColumnId = 1`
- [ ] `ContextBuilder` 添加了 `setCachedPrompt()`、`getCachedPrompt()` 和 `buildSystemMessage()` 方法
- [ ] `buildSystemMessage()` 将 currentTime/timeZone 动态拼接到 System Prompt
- [ ] Bootstrap 在启动时加载并缓存 `todo-agent.md`
- [ ] Bootstrap 已移除 DefaultColumnCache 初始化
- [ ] 客户端断开连接时正确中止处理

---

## 8. Manual Testing

### 8.1 Test SSE Endpoint

```bash
# 启动后端服务
pnpm --filter @nanomail/backend dev

# 测试创建待办
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "messages": [{"role": "user", "content": "明天下午3点开会"}],
    "context": {
      "currentTime": "2024-01-15T10:00:00Z",
      "timeZone": "Asia/Shanghai"
    }
  }'
```

**Expected Output:**
```
data: {"type":"session_start","sessionId":"...","messageId":"...","timestamp":"...","data":{...}}

data: {"type":"tool_call_start","data":{"toolName":"createTodo","toolInput":{...}}}

data: {"type":"tool_call_end","data":{"toolName":"createTodo","toolOutput":{...}}}

data: {"type":"result_chunk","data":{"content":"好的，已为您创建待办..."}}

data: {"type":"session_end",...}
```

### 8.2 Test Abort Handling

1. 发送请求
2. 在响应完成前关闭连接（Ctrl+C）
3. 检查服务端日志确认正确中止

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API Route dependency injection | Cannot access deps in route | Use factory function `createAgentRoutes(deps)` with explicit DI |
| SSE memory leak | Server resource waste | Pass `signal` to all LLM API calls; double-check abort before each write |
| SSE connection delay | Client waits for first event | Call `res.flushHeaders()` immediately after setting headers |
| Prompt file I/O on every request | Performance degradation | Cache prompt in memory at bootstrap time via `ContextBuilder.setCachedPrompt()` |
| LLM cannot parse relative time | Incorrect deadline calculation | `buildSystemMessage()` dynamically injects `currentTime` and `timeZone` into System Prompt |
| Default column ID hardcoded | Multi-user scenario limitation | Use constant `defaultColumnId = 1` for now; multi-user support requires user settings lookup |

---

## 10. Next Phase

完成本 Phase 后，进入 **Phase 5: Cleanup**，清理废弃代码和更新测试。
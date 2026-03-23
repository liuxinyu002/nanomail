# Phase 2: AgentLoop Refactor

> Backend AI Refactor - Phase 2 of 5
> Estimated Time: 4-6 hours

---

## 1. Phase Overview

### 1.1 Goal

重构 AgentLoop 核心模块，使其从邮件处理专用转变为通用 AI Agent 框架：
- 支持多种 Agent 角色（当前实现 `todo-agent`）
- 实现 Re-prompt 机制（Function Calling 循环）
- 添加 Token 截断保护（防止 tool_call/tool_output 拆散）
- 实现 SSE 事件流

### 1.2 Context

**Agent Loop 机制（CRITICAL）**

AgentLoop 不是线性管道，而是一个**循环（Re-prompt 机制）**：

```
┌─────────────────────────────────────────────────────────────┐
│                      AgentLoop.run()                         │
│                                                              │
│  ┌─────────┐    ┌──────────────┐    ┌───────────────────┐   │
│  │ LLM     │───►│ tool_calls?  │───►│ Execute Tools     │   │
│  │ Call    │    │              │    │ (append results)  │   │
│  └─────────┘    └──────────────┘    └─────────┬─────────┘   │
│       │              │ No                      │             │
│       │              ▼                         │             │
│       │      ┌──────────────┐                  │             │
│       │      │ Return text  │◄─────────────────┘             │
│       │      │ content      │  Append tool_result            │
│       │      └──────────────┘  to messages, loop back        │
│       │              │                                        │
│       │              ▼                                        │
│       │      Yield result_chunk events                       │
│       │              │                                        │
│       ▼              ▼                                        │
│  session_end event                                           │
└─────────────────────────────────────────────────────────────┘
```

**为什么需要循环？**

如果没有循环，流程会在工具执行后（step 5）结束，用户永远收不到 AI 确认消息（如"好的，已经为您创建了待办"）。Re-prompt 机制（steps 6-8）让 LLM 能基于工具执行结果生成自然语言响应。

### 1.3 Dependencies

- **Phase 1** 必须完成（需要 `ChatMessage`、`ChatContext` 类型）
- 需要 `dayjs` 库（Phase 3 安装，本 Phase 可先不依赖）

---

## 2. Architecture Design

### 2.1 System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Chat Page    │───►│ LocalStorage │───►│ Messages Array   │   │
│  │ (React)      │    │ (History)    │    │ (Full Context)   │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /api/agent/chat (SSE)
                              │ Body: { messages, context }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ AgentRouter  │───►│ AgentLoop    │───►│ LLM Provider     │   │
│  │ (SSE Stream) │    │ (Generalized)│    │ (LiteLLM)        │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Tool Registry                          │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │   │
│  │  │createTodo  │ │updateTodo  │ │deleteTodo  │            │   │
│  │  └────────────┘ └────────────┘ └────────────┘            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 SSE Event Sequence

```
Frontend                        Backend API                      AgentLoop / Tools
   |                                 |                                  |
   |-- POST /chat {messages} ------->|                                  |
   |                                 |--- 1. AgentLoop.run(messages) -->|
   |<-- [SSE] session_start ---------|                                  |
   |                                 |                                  |-- 2. Call LLM (Prompt + Context)
   |                                 |                                  |<- 3. LLM returns ToolCall
   |<-- [SSE] tool_call_start -------|                                  |
   |                                 |                                  |-- 4. Execute createTodo()
   |                                 |                                  |<- 5. Tool execution finishes
   |<-- [SSE] tool_call_end ---------|                                  |
   |    (Frontend updates local Todo)|                                  |
   |                                 |                                  |-- 6. Append ToolResult to messages
   |                                 |                                  |-- 7. Call LLM AGAIN (Re-prompt)
   |                                 |                                  |<- 8. LLM returns pure Text
   |<-- [SSE] result_chunk (stream) -|                                  |
   |<-- [SSE] session_end -----------|                                  |
   |                                 |<-- Loop terminates --------------|
```

---

## 3. Files to Modify/Create

### 3.1 `packages/backend/src/services/agent/loop/types.ts`

**Changes:**
- 更新 `ConversationEventType`（移除业务特定事件）
- 添加 `AgentContext` 接口
- 移除 `AgentEmail` 接口（不再需要）

```typescript
/**
 * Conversation event types for SSE streaming
 *
 * NOTE: Business-specific events (todos_created, todos_updated, etc.) are intentionally
 * omitted to keep AgentLoop generic. Frontend should listen to `tool_call_end` and
 * parse toolOutput to update local state based on toolName.
 */
export type ConversationEventType =
  | 'session_start'      // Session initialized
  | 'thinking'           // AI reasoning (collapsible in UI)
  | 'tool_call_start'    // Tool invocation started
  | 'tool_call_end'      // Tool invocation completed (frontend uses this to update UI)
  | 'result_chunk'       // Final response chunk (typewriter effect)
  | 'session_end'        // Session completed
  | 'error'              // Error occurred

/**
 * Base event structure
 */
export interface ConversationEvent {
  type: ConversationEventType
  sessionId: string      // Unique session identifier
  messageId: string      // Maps to frontend message bubble
  timestamp: string      // ISO datetime
  data: ThinkingData | ToolCallData | ResultChunkData | ErrorData | null
}

/**
 * AI thinking/reasoning content
 */
export interface ThinkingData {
  content: string        // Chain-of-thought content
}

/**
 * Final response content for user
 */
export interface ResultChunkData {
  content: string        // User-facing message chunk
}

/**
 * Tool call data
 */
export interface ToolCallData {
  toolName: string
  toolInput: Record<string, unknown>
  toolOutput?: Record<string, unknown>  // Only in tool_call_end
  truncated?: boolean     // If output was truncated for SSE
}

/**
 * Error data
 */
export interface ErrorData {
  code: string
  message: string
  details?: Record<string, unknown>
}

/**
 * Agent context passed to AgentLoop.run()
 */
export interface AgentContext {
  role: AgentRole           // 'todo-agent' | future roles
  sessionId: string         // Generated UUID
  messageId: string         // For SSE event mapping
  currentTime: string       // ISO datetime from request
  timeZone: string          // User timezone
  sourcePage?: string       // Optional page context
}
```

### 3.2 `packages/backend/src/services/agent/loop/agent-loop.ts`

**Key Changes:**

1. **Remove email dependency**
   ```typescript
   // Before
   async *run(instruction: string, email: Email): AsyncGenerator<ProgressEvent>

   // After
   async *run(
     messages: ChatMessage[],
     context: AgentContext,
     deps: ToolDeps
   ): AsyncGenerator<ConversationEvent>
   ```

2. **Dynamic tool loading**
   ```typescript
   const TOOL_SETS: Record<AgentRole, string[]> = {
     'todo-agent': ['createTodo', 'updateTodo', 'deleteTodo'],
     // Future roles can be added here
   }
   ```

3. **System prompt building with time context**
   ```typescript
   private async buildSystemPrompt(context: AgentContext): Promise<string> {
     const rolePrompt = await this.contextBuilder.buildSystemPrompt(context.role)
     const timeContext = `
Current Time: ${context.currentTime}
Timezone: ${context.timeZone}
Date: ${new Date(context.currentTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
     `.trim()

     return `${rolePrompt}\n\n${timeContext}`
   }
   ```

4. **CRITICAL: Signal propagation for abort support**
   ```typescript
   // 最大迭代次数限制，防止 LLM 陷入无限循环
   const MAX_STEPS = 20;

   async *run(
     messages: ChatMessage[],
     context: AgentContext,
     deps: ToolDeps
   ): AsyncGenerator<ConversationEvent> {
     // ... setup code ...

     let currentStep = 0;

     while (currentStep < MAX_STEPS) {
       currentStep++;

       // CRITICAL: Pass signal to LLM provider
       const response = await this.llmProvider.chat(
         conversationMessages,
         systemPrompt,
         tools,
         { signal: this.signal }  // AbortSignal for cancellation
       )

       // Check if aborted after LLM call
       if (this.signal?.aborted) {
         throw new DOMException('Agent loop aborted', 'AbortError')
       }

       // 没有工具调用，正常结束循环
       if (!response.tool_calls || response.tool_calls.length === 0) {
         break;
       }

       // ... tool execution code ...

       for (const toolCall of response.tool_calls) {
         // Check abort before each tool execution
         if (this.signal?.aborted) {
           throw new DOMException('Agent loop aborted', 'AbortError')
         }

         // CRITICAL: 捕获工具执行错误，作为 tool_result 反馈给 LLM
         let toolOutput: Record<string, unknown>;
         try {
           toolOutput = await this.executeTool(toolCall, deps)
         } catch (error) {
           // 不抛出异常，而是将错误信息作为工具输出
           toolOutput = {
             error: error instanceof Error ? error.message : String(error),
             status: 'failed'
           };
           log.warn({ toolCallId: toolCall.id, error }, 'Tool execution failed, feeding error back to LLM');
         }

         // 将 toolOutput append 到 messages，继续下一轮循环
         // ...
       }
     }

     // 达到最大步数，强制结束并向前端 yield 友好提示
     if (currentStep >= MAX_STEPS) {
       yield {
         type: 'error',
         sessionId: context.sessionId,
         messageId: context.messageId,
         timestamp: new Date().toISOString(),
         data: {
           code: 'MAX_STEPS_EXCEEDED',
           message: 'AI 思考时间过长，已自动终止。请尝试简化您的问题。',
           details: { steps: MAX_STEPS }
         }
       };
       return;
     }
   }
   ```

### 3.3 `packages/backend/src/services/agent/loop/token-truncator.ts` (new)

**CRITICAL**: 截断历史消息时保护 tool_call/tool_output 成对关系

```typescript
import { createLogger } from '../../../config/logger'

const log = createLogger('TokenTruncator')

/**
 * TokenTruncator - 截断历史消息，同时保护 tool_call/tool_output 成对关系
 *
 * 风险: 在多轮 Function Calling 场景中，截断历史消息时可能把 `tool_call` 请求
 * 和其对应的 `tool_output` 结果拆散。一旦拆散，LLM API 会抛出 400 Bad Request 错误。
 */
export class TokenTruncator {
  /**
   * 截断消息数组，确保 tool_call 和 tool_result 保持成对
   *
   * 规则：
   * 1. 如果移除 assistant 消息中包含 tool_calls，必须同时移除后续的 tool role 消息
   * 2. 绝不允许 tool role 消息出现在对应的 assistant tool_calls 之前
   */
  truncate(
    messages: ChatMessage[],
    maxTokens: number,
    tokenCounter: (msg: ChatMessage) => number
  ): ChatMessage[] {
    if (messages.length === 0) return messages

    // 计算当前 token 总数
    let totalTokens = messages.reduce((sum, msg) => sum + tokenCounter(msg), 0)

    // 如果不需要截断，直接返回
    if (totalTokens <= maxTokens) return messages

    // 从头部开始移除消息，但要保护成对关系
    const result = [...messages]
    let i = 0

    while (totalTokens > maxTokens && i < result.length) {
      const msg = result[i]

      // 检查是否是带有 tool_calls 的 assistant 消息
      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        // 找到所有对应的 tool role 消息
        const toolCallIds = new Set(msg.toolCalls.map(tc => tc.id))
        let toolMessagesToRemove = 0

        // 计算有多少个连续的 tool 消息需要一起移除
        for (let j = i + 1; j < result.length; j++) {
          if (result[j].role === 'tool' && toolCallIds.has(result[j].toolCallId || '')) {
            toolMessagesToRemove++
          } else {
            break // 遇到非 tool 消息，停止
          }
        }

        // 成对移除：assistant (with tool_calls) + 对应的 tool messages
        const tokensToRemove = result
          .slice(i, i + 1 + toolMessagesToRemove)
          .reduce((sum, m) => sum + tokenCounter(m), 0)

        result.splice(i, 1 + toolMessagesToRemove)
        totalTokens -= tokensToRemove
      } else if (msg.role === 'tool') {
        // 孤立的 tool 消息（没有对应的 tool_calls），可以直接移除
        // 但这种情况不应该发生，记录警告
        log.warn({ toolCallId: msg.toolCallId }, 'Orphan tool message detected, removing')
        result.splice(i, 1)
        totalTokens -= tokenCounter(msg)
      } else {
        // 普通消息（user, assistant without tool_calls），直接移除
        result.splice(i, 1)
        totalTokens -= tokenCounter(msg)
      }
    }

    // 验证结果：确保没有孤立的 tool 消息
    const isValid = this.validateMessagePairs(result)

    // 容错机制：如果验证失败，保留最后一条 user 消息
    // 保证用户的当前提问能得到响应是最高优先级
    if (!isValid) {
      log.error(
        { originalLength: messages.length, truncatedLength: result.length },
        '[TokenTruncator] Validation failed, applying fallback: keeping last user message only'
      )

      // 找到最后一条 user 消息
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
      if (lastUserMessage) {
        return [lastUserMessage]
      }

      // 极端情况：没有 user 消息，返回空数组
      return []
    }

    return result
  }

  /**
   * 验证消息数组的成对关系
   *
   * 容错策略：如果发现孤立的 tool 消息，不直接抛出异常导致服务崩溃，
   * 而是记录错误日志并返回 false，让调用方决定如何处理。
   * 保证用户的当前提问能得到响应是最高优先级。
   */
  private validateMessagePairs(messages: ChatMessage[]): boolean {
    const toolCallIds = new Set<string>()
    let hasOrphanToolMessage = false

    for (const msg of messages) {
      // 收集所有 tool_calls 的 ID
      if (msg.role === 'assistant' && msg.toolCalls) {
        msg.toolCalls.forEach(tc => toolCallIds.add(tc.id))
      }

      // 验证 tool 消息是否有对应的 tool_call
      if (msg.role === 'tool') {
        if (!msg.toolCallId || !toolCallIds.has(msg.toolCallId)) {
          log.error(
            { toolCallId: msg.toolCallId },
            '[TokenTruncator] Orphan tool message detected'
          )
          hasOrphanToolMessage = true
        }
      }
    }

    return !hasOrphanToolMessage
  }
}
```

### 3.4 `packages/backend/src/services/agent/context/types.ts`

添加 `'todo-agent'` 到 `AgentRole` 类型：

```typescript
export type AgentRole = 'todo-agent' // | 'draft-agent' | future roles
```

### 3.5 默认列 ID 常量

使用常量定义默认列 ID，简化实现：

```typescript
// packages/backend/src/services/agent/tools/constants.ts

/**
 * 默认列 ID 常量
 * 新创建的 Todo 默认放入此列
 */
export const DEFAULT_COLUMN_ID = 1
```

---

## 4. Implementation Steps

### Step 1: Update Types

```bash
# 编辑类型定义
packages/backend/src/services/agent/loop/types.ts
```

更新 `ConversationEventType`，添加 `AgentContext` 接口。

### Step 2: Create TokenTruncator

```bash
# 创建新文件
touch packages/backend/src/services/agent/loop/token-truncator.ts
```

实现 `TokenTruncator` 类。

### Step 3: Refactor AgentLoop

```bash
# 编辑核心文件
packages/backend/src/services/agent/loop/agent-loop.ts
```

重构 `run()` 方法，实现循环机制和 signal 传播。

### Step 4: Update AgentRole Type

```bash
# 编辑角色类型
packages/backend/src/services/agent/context/types.ts
```

添加 `'todo-agent'` 到类型定义。

### Step 5: Build & Test

```bash
# 构建验证
pnpm --filter @nanomail/backend build

# 运行相关测试
pnpm --filter @nanomail/backend test -- --grep "AgentLoop"
pnpm --filter @nanomail/backend test -- --grep "TokenTruncator"
```

---

## 5. Verification Checklist

- [ ] `ConversationEventType` 不包含业务特定事件（如 `todos_created`）
- [ ] `AgentContext` 接口定义完整
- [ ] `TokenTruncator` 实现成对移除逻辑
- [ ] `TokenTruncator.validateMessagePairs()` 返回 boolean 而非抛出异常
- [ ] `TokenTruncator.truncate()` 在验证失败时使用容错策略
- [ ] `AgentLoop.run()` 支持 `MAX_STEPS` 限制
- [ ] `AgentLoop` 捕获工具执行错误并反馈给 LLM
- [ ] `AgentLoop` 正确传播 `signal` 到所有异步操作
- [ ] 达到 `MAX_STEPS` 时向前端 yield 友好错误提示
- [ ] 单元测试通过

---

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM infinite loop | Resource exhaustion, token cost blowout | `MAX_STEPS = 5` limits iterations; yield friendly error to user when exceeded |
| Tool execution failure | SSE connection break, no user feedback | Catch tool errors, feed as `tool_result` to LLM for natural language explanation |
| Token truncation breaks tool pairs | 400 Bad Request from LLM API | `TokenTruncator` ensures tool_call/tool_output are always removed together |
| Orphan tool messages in truncation | Service crash on validation | `validateMessagePairs` returns boolean instead of throwing; fallback to last user message only |
| SSE memory leak | Server resource waste | Pass `signal` to all LLM API calls; check abort before each write |

---

## 7. Next Phase

完成本 Phase 后，进入 **Phase 3: Todo Tools**，实现 `createTodo`、`updateTodo`、`deleteTodo` 工具。
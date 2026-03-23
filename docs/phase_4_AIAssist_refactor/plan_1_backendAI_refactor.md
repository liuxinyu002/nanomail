# Backend AI Refactor Plan

> Phase 4 - AI Assist Feature Refactor
> Version: 1.0
> Date: 2026-03-19

## 1. Overview

### 1.1 Goal

Refactor the backend agent module to support a conversational todo management interface. The AI assistant should understand natural language, parse time expressions, and perform CRUD operations on todos through multi-turn dialogue.

### 1.2 Scope

| Module | Change Type | Description |
|--------|-------------|-------------|
| Todo Schema | Modification | Allow `emailId` to be nullable |
| AgentLoop | Refactor | Generalize to support multiple agent roles |
| Tools | New | `createTodo`, `updateTodo`, `deleteTodo` |
| Prompts | New | `todo-agent.md` system prompt |
| API Routes | New | `POST /api/agent/chat` (SSE) |
| SSE Events | New | Rich event types for frontend animation |

### 1.3 Out of Scope

- Email association feature (search-emails tool)
- Conversation persistence in database (handled by frontend LocalStorage)
- Multi-user support (MVP single user)

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
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Database (SQLite)                       │   │
│  │                    Todo Entity                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **User Input** → Frontend captures message, appends to local history
2. **Request** → Frontend sends `{ messages, context }` to `/api/agent/chat`
3. **Processing** → Backend creates AgentLoop with `todo-agent` role
4. **Agent Loop** → The core processing cycle (see 2.3 Agent Loop Mechanism)
5. **Response** → Final `session_end` event with assistant message

### 2.3 Agent Loop Mechanism (CRITICAL)

The AgentLoop is **not a linear pipeline** but a **loop (Re-prompt mechanism)**:

#### 2.3.1 Loop Flow Diagram

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

#### 2.3.2 Single Request Processing Sequence (SSE Event Flow)

The following sequence diagram shows a complete "closed-loop" request flow, clarifying the SSE events and the re-prompt mechanism:

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

**Key Points:**

1. **Loop Condition**: Continue while LLM returns `tool_calls`
2. **Tool Result Handling**: After tool execution, append `tool` role message with result
3. **Re-prompt**: Send updated messages (including tool result) back to LLM
4. **Termination**: Only end session when LLM returns text `content` without `tool_calls`

**Why This Matters:**

Without the loop, the flow would end after tool execution (step 5), and users would never receive AI confirmation like "好的，已经为您创建了待办". The re-prompt mechanism (steps 6-8) enables the LLM to generate a natural language response based on tool execution results.

#### 2.3.1 Token Truncation Protection (CRITICAL)

> **风险**: 在多轮 Function Calling 场景中，截断历史消息时可能把 `tool_call` 请求和其对应的 `tool_output` 结果拆散。一旦拆散，LLM API 会抛出 400 Bad Request 错误。

**保护策略**: 移除历史消息时，必须保证成对移除。

```typescript
/**
 * TokenTruncator - 截断历史消息，同时保护 tool_call/tool_output 成对关系
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
        console.warn('[TokenTruncator] Orphan tool message detected, removing')
        result.splice(i, 1)
        totalTokens -= tokenCounter(msg)
      } else {
        // 普通消息（user, assistant without tool_calls），直接移除
        result.splice(i, 1)
        totalTokens -= tokenCounter(msg)
      }
    }

    // 验证结果：确保没有孤立的 tool 消息
    this.validateMessagePairs(result)

    return result
  }

  /**
   * 验证消息数组的成对关系
   */
  private validateMessagePairs(messages: ChatMessage[]): void {
    const toolCallIds = new Set<string>()

    for (const msg of messages) {
      // 收集所有 tool_calls 的 ID
      if (msg.role === 'assistant' && msg.toolCalls) {
        msg.toolCalls.forEach(tc => toolCallIds.add(tc.id))
      }

      // 验证 tool 消息是否有对应的 tool_call
      if (msg.role === 'tool') {
        if (!msg.toolCallId || !toolCallIds.has(msg.toolCallId)) {
          throw new Error(
            `[TokenTruncator] Validation failed: orphan tool message with toolCallId=${msg.toolCallId}`
          )
        }
      }
    }
  }
}
```

**Implementation Pattern:**

```typescript
async *run(messages: ChatMessage[], context: AgentContext): AsyncGenerator<ConversationEvent> {
  const conversationMessages = [...messages]

  while (true) {
    // 1. Call LLM
    const response = await this.llmProvider.chat(conversationMessages, systemPrompt, tools)

    // 2. Yield thinking event if present
    if (response.thinking) {
      yield { type: 'thinking', data: { content: response.thinking } }
    }

    // 3. Check for tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
      for (const toolCall of response.tool_calls) {
        yield { type: 'tool_call_start', data: { toolName: toolCall.name, toolInput: toolCall.arguments } }

        const result = await this.executeTool(toolCall)

        yield { type: 'tool_call_end', data: { toolName: toolCall.name, toolOutput: result } }

        // Append assistant message with tool_calls
        conversationMessages.push({
          role: 'assistant',
          content: null,
          toolCalls: response.tool_calls
        })

        // Append tool result message
        conversationMessages.push({
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: toolCall.id
        })
      }
      // Loop continues - LLM will see tool results and generate response
      continue
    }

    // 4. No tool calls - LLM returned text content
    if (response.content) {
      yield { type: 'result_chunk', data: { content: response.content } }
    }

    // 5. Session end
    yield { type: 'session_end', data: null }
    break
  }
}
```

---

## 3. Detailed Specifications

### 3.1 Todo Schema Modification

**File:** `packages/shared/src/schemas/todo.ts`

**Change:** Make `emailId` nullable

```typescript
// Before
emailId: z.number().int().positive(),

// After
emailId: z.number().int().positive().nullable(),
```

**Impact:**
- Update `Todo.entity.ts` to reflect nullable field
- Update existing queries that assume `emailId` exists
- Migration not required (SQLite, existing records keep their values)

### 3.2 SSE Event Types

**File:** `packages/backend/src/services/agent/loop/types.ts` (extend)

> **Design Decision**: AgentLoop 作为通用模块，不应硬编码业务特定事件（如 `todos_created`）。
> 前端通过监听 `tool_call_end` 事件，解析 `toolName` 和 `toolOutput` 来更新本地状态。

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
```

#### 3.2.1 Frontend Event Handling Pattern

前端只监听 `tool_call_end` 事件，根据 `toolName` 和 `toolOutput` 更新本地状态：

```typescript
// Frontend event handler example
function handleSSEEvent(event: ConversationEvent) {
  switch (event.type) {
    case 'tool_call_end': {
      const { toolName, toolOutput } = event.data as ToolCallData

      if (toolOutput?.success) {
        switch (toolName) {
          case 'createTodo':
            // Add new todo to local list
            setTodos(prev => [...prev, toolOutput.todo])
            break
          case 'updateTodo':
            // Update existing todo
            setTodos(prev => prev.map(t =>
              t.id === toolOutput.todo.id ? toolOutput.todo : t
            ))
            break
          case 'deleteTodo':
            // Remove todo from list
            setTodos(prev => prev.filter(t => t.id !== toolOutput.todo.id))
            break
        }
      }
      break
    }
    // ... handle other event types
  }
}
```

### 3.3 Chat Request/Response

**File:** `packages/shared/src/schemas/chat.ts` (new)

```typescript
import { z } from 'zod'

/**
 * Chat message schema
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool']),
  content: z.string().nullable(),  // null when assistant only has tool_calls
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.unknown())
  })).optional(),
  toolCallId: z.string().optional()
})

/**
 * Chat context schema
 */
export const ChatContextSchema = z.object({
  currentTime: z.string().datetime(),    // Required for time parsing
  timeZone: z.string(),                   // User timezone, e.g., "Asia/Shanghai"
  currentLocation: z.string().optional(), // Optional location context
  sourcePage: z.string().optional()       // Page context, e.g., "email-list"
})

/**
 * Chat request schema
 */
export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  context: ChatContextSchema
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

### 3.4 AgentLoop Generalization

**File:** `packages/backend/src/services/agent/loop/agent-loop.ts`

**Key Changes:**

1. **Remove email dependency**
   ```typescript
   // Before
   async *run(instruction: string, email: Email): AsyncGenerator<ProgressEvent>

   // After
   async *run(messages: ChatMessage[], context: AgentContext): AsyncGenerator<ConversationEvent>
   ```

2. **New AgentContext interface**
   ```typescript
   export interface AgentContext {
     role: AgentRole           // 'todo-agent' | future roles
     sessionId: string         // Generated UUID
     messageId: string         // For SSE event mapping
     currentTime: string       // ISO datetime from request
     timeZone: string          // User timezone
     sourcePage?: string       // Optional page context
   }
   ```

3. **Dynamic tool loading**
   ```typescript
   const TOOL_SETS: Record<AgentRole, string[]> = {
     'todo-agent': ['createTodo', 'updateTodo', 'deleteTodo'],
     // Future roles can be added here
   }
   ```

4. **System prompt building**
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

### 3.5 Todo Tools

**File:** `packages/backend/src/services/agent/tools/todo-tools.ts` (new)

#### 3.5.1 createTodo Tool

```typescript
export const createTodoTool = {
  name: 'createTodo',
  description: 'Create a new todo item. Use this when the user wants to remember or schedule a task.',
  parameters: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'The task content (1-2000 characters)'
      },
      deadline: {
        type: 'string',
        description: 'ISO 8601 datetime string, e.g., 2023-10-27T15:00:00Z. Can be in the past for logging purposes.'
      },
      priority: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        description: 'Task priority (1=lowest, 5=highest). Default is 3.'
      }
    },
    required: ['description']
  },
  handler: async (params: CreateTodoParams, deps: ToolDeps): Promise<ToolResult> => {
    const { description, deadline, priority } = params
    const { dataSource, defaultColumnId } = deps

    // Validation
    if (!description || description.trim().length === 0) {
      return {
        success: false,
        reason: 'EMPTY_DESCRIPTION',
        message: 'Task description cannot be empty'
      }
    }

    if (description.length > 2000) {
      return {
        success: false,
        reason: 'DESCRIPTION_TOO_LONG',
        message: `Task description exceeds 2000 characters (current: ${description.length})`
      }
    }

    // Validate and normalize deadline format if provided
    let normalizedDeadline: Date | null = null
    if (deadline) {
      // Use dayjs for robust time parsing and validation
      // Supports ISO 8601 formats: 2024-01-15T15:00:00+08:00, 2024-01-15T07:00:00Z
      const parsed = parseDateTime(deadline)
      if (!parsed.isValid) {
        return {
          success: false,
          reason: 'INVALID_DEADLINE_FORMAT',
          message: `Deadline format is invalid. Expected ISO 8601 format (e.g., 2024-01-15T15:00:00+08:00). Received: ${deadline}`
        }
      }
      normalizedDeadline = parsed.toDate()
    }

    // Check for duplicates (within last 5 minutes)
    const recentTodo = await dataSource.getRepository(Todo).findOne({
      where: {
        description,
        createdAt: MoreThan(new Date(Date.now() - 5 * 60 * 1000))
      }
    })

    if (recentTodo) {
      // CRITICAL: Do NOT create duplicate - delegate to LLM to ask user
      // This prevents accidental duplicates from network retries
      return {
        success: false,
        reason: 'DUPLICATE_DETECTED',
        message: `检测到5分钟内已存在相同内容的待办（ID: ${recentTodo.id}）。请询问用户是否确认要再次创建，如果用户确认，可以使用不同的描述或稍后重试。`,
        existingTodo: formatTodoForResponse(recentTodo)
      }
    }

    // Create todo
    const todo = dataSource.getRepository(Todo).create({
      description,
      deadline: normalizedDeadline,
      boardColumnId: defaultColumnId,
      status: 'pending',
      emailId: null
    })
    await dataSource.getRepository(Todo).save(todo)

    return {
      success: true,
      message: `Todo created successfully with ID ${todo.id}`,
      todo: formatTodoForResponse(todo)
    }
  }
}
```

#### 3.5.2 updateTodo Tool

```typescript
export const updateTodoTool = {
  name: 'updateTodo',
  description: 'Update an existing todo item. Use this when the user wants to modify a previously created task.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'The ID of the todo to update (required)'
      },
      description: {
        type: 'string',
        description: 'New task content (1-2000 characters)'
      },
      deadline: {
        type: 'string',
        description: 'New deadline as ISO 8601 datetime string, or null to remove'
      },
      status: {
        type: 'string',
        enum: ['pending', 'in_progress', 'completed'],
        description: 'New status'
      },
      notes: {
        type: 'string',
        description: 'Additional notes (max 2000 characters)'
      }
    },
    required: ['id']
  },
  handler: async (params: UpdateTodoParams, deps: ToolDeps): Promise<ToolResult> => {
    const { id, description, deadline, status, notes } = params
    const { dataSource } = deps

    // Check existence
    const todo = await dataSource.getRepository(Todo).findOne({ where: { id } })
    if (!todo) {
      return {
        success: false,
        reason: 'TODO_NOT_FOUND',
        message: `Todo with ID ${id} does not exist`
      }
    }

    // Validate description if provided
    if (description !== undefined) {
      if (!description || description.trim().length === 0) {
        return {
          success: false,
          reason: 'EMPTY_DESCRIPTION',
          message: 'Task description cannot be empty'
        }
      }
      if (description.length > 2000) {
        return {
          success: false,
          reason: 'DESCRIPTION_TOO_LONG',
          message: `Task description exceeds 2000 characters`
        }
      }
    }

    // Validate deadline format if provided
    if (deadline !== undefined && deadline !== null) {
      const parsed = parseDateTime(deadline)
      if (!parsed.isValid) {
        return {
          success: false,
          reason: 'INVALID_DEADLINE_FORMAT',
          message: `Deadline format is invalid. Expected ISO 8601 format. Received: ${deadline}`
        }
      }
    }

    // Validate notes length if provided
    if (notes !== undefined && notes !== null && notes.length > 2000) {
      return {
        success: false,
        reason: 'NOTES_TOO_LONG',
        message: 'Notes exceed 2000 characters'
      }
    }

    // Update fields
    if (description !== undefined) todo.description = description
    if (deadline !== undefined) todo.deadline = deadline ? new Date(deadline) : null
    if (status !== undefined) todo.status = status
    if (notes !== undefined) todo.notes = notes

    await dataSource.getRepository(Todo).save(todo)

    return {
      success: true,
      message: `Todo ${id} updated successfully`,
      todo: formatTodoForResponse(todo)
    }
  }
}
```

#### 3.5.3 deleteTodo Tool

```typescript
export const deleteTodoTool = {
  name: 'deleteTodo',
  description: 'Delete a todo item. Use this when the user wants to remove or cancel a task.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'The ID of the todo to delete (required)'
      }
    },
    required: ['id']
  },
  handler: async (params: DeleteTodoParams, deps: ToolDeps): Promise<ToolResult> => {
    const { id } = params
    const { dataSource } = deps

    // Check existence
    const todo = await dataSource.getRepository(Todo).findOne({ where: { id } })
    if (!todo) {
      return {
        success: false,
        reason: 'TODO_NOT_FOUND',
        message: `Todo with ID ${id} does not exist`
      }
    }

    // Store info before deletion
    const deletedInfo = formatTodoForResponse(todo)

    await dataSource.getRepository(Todo).remove(todo)

    return {
      success: true,
      message: `Todo ${id} deleted successfully`,
      todo: deletedInfo
    }
  }
}
```

#### 3.5.4 Common Types & Utilities

```typescript
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Initialize dayjs plugins
dayjs.extend(customParseFormat)
dayjs.extend(utc)
dayjs.extend(timezone)

interface ToolDeps {
  dataSource: DataSource
  defaultColumnId: number  // Fetched from BoardColumn where isDefault = true
}

interface ToolResult {
  success: boolean
  reason?: string          // Error code when success = false
  warning?: string         // Warning code when success = true
  message: string          // Human-readable message (for LLM to process)
  todo?: {
    id: number
    description: string
    deadline: string | null
    status: string
    boardColumnId: number
  }
  existingTodo?: {         // Returned when duplicate is detected
    id: number
    description: string
    deadline: string | null
    status: string
  }
}

/**
 * Parse datetime string with robust validation
 * Supports ISO 8601 formats with timezone
 */
function parseDateTime(input: string): { isValid: boolean; toDate(): Date | null } {
  // Try parsing with dayjs - supports multiple ISO 8601 formats
  const parsed = dayjs(input)

  if (!parsed.isValid()) {
    return { isValid: false, toDate: () => null }
  }

  return {
    isValid: true,
    toDate: () => parsed.toDate()
  }
}

function formatTodoForResponse(todo: Todo): ToolResult['todo'] {
  return {
    id: todo.id,
    description: todo.description,
    deadline: todo.deadline?.toISOString() ?? null,
    status: todo.status,
    boardColumnId: todo.boardColumnId
  }
}
```

### 3.6 Todo Agent Prompt

**File:** `packages/backend/src/services/agent/prompts/todo-agent.md` (new)

```markdown
# Todo Agent

You are an efficient task management assistant. Your sole purpose is to help users manage their todo items through natural conversation.

## Core Responsibilities

1. **Understand Intent**: Parse user's natural language to determine what todo operation they want
2. **Time Parsing**: Accurately convert relative time expressions (e.g., "tomorrow at 3pm", "next Friday") to ISO datetime
3. **Tool Execution**: Call appropriate tools (createTodo, updateTodo, deleteTodo) to perform operations
4. **Friendly Response**: Provide concise, friendly feedback after each operation

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

## Examples

### Creating a Todo
```
User: "明天下午3点开会"
You: [Call createTodo with description="开会", deadline="2024-01-16T15:00:00Z"]
You: "好的，已为您创建待办：明天下午3点开会"
```

### Updating a Todo
```
User: "改成4点"
You: [Call updateTodo with id from context, deadline="2024-01-16T16:00:00Z"]
You: "已将时间修改为下午4点"
```

### Deleting a Todo
```
User: "算了，不开会了"
You: [Call deleteTodo with id from context]
You: "好的，已取消这个待办"
```
```

### 3.7 API Route

**File:** `packages/backend/src/routes/agent.routes.ts` (extend)

#### 3.7.1 Dependency Injection Setup

> **风险**: Express Route 内部无法直接访问 `deps.llmProvider`，需要通过依赖注入路径传递。

```typescript
// packages/backend/src/routes/agent.routes.ts

import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { ChatRequestSchema, type ChatRequest } from '@nanomail/shared'
import { AgentLoop } from '../services/agent/loop/agent-loop'
import { DefaultColumnCache } from '../services/agent/cache/default-column-cache'

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
  defaultColumnCache: DefaultColumnCache  // 默认列缓存（单例）
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

#### 3.7.2 Default Column Cache (Startup Optimization)

> **风险**: `defaultColumnId` 的获取在每次聊天请求中都会执行一次 DB 查询，造成不必要的性能开销。
>
> **修正**: 后端启动时缓存到内存中，由单例服务提供访问。

```typescript
// packages/backend/src/services/agent/cache/default-column-cache.ts

import type { DataSource } from 'typeorm'
import { BoardColumn } from '../../../entities/BoardColumn.entity'
import { createLogger } from '../../config/logger'

const log = createLogger('DefaultColumnCache')

/**
 * 默认列缓存服务
 *
 * 在应用启动时加载并缓存 defaultColumnId，避免每次请求都查询数据库。
 */
export class DefaultColumnCache {
  private cachedColumnId: number | null = null
  private initialized = false

  constructor(private dataSource: DataSource) {}

  /**
   * 初始化缓存（应用启动时调用）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const defaultColumn = await this.dataSource.getRepository(BoardColumn).findOne({
        where: { isDefault: true }
      })

      if (!defaultColumn) {
        log.warn('No default column found, will use fallback ID 1')
        this.cachedColumnId = 1
      } else {
        this.cachedColumnId = defaultColumn.id
        log.info({ columnId: this.cachedColumnId }, 'Default column cached')
      }

      this.initialized = true
    } catch (error) {
      log.error({ err: error }, 'Failed to initialize default column cache')
      this.cachedColumnId = 1  // Fallback
      this.initialized = true
    }
  }

  /**
   * 获取默认列 ID
   *
   * 如果缓存未初始化，会同步返回 fallback 值并记录警告。
   */
  getColumnId(): number {
    if (!this.initialized) {
      log.warn('DefaultColumnCache not initialized, using fallback ID 1')
      return 1
    }
    return this.cachedColumnId ?? 1
  }

  /**
   * 刷新缓存（管理员修改默认列后调用）
   */
  async refresh(): Promise<void> {
    this.initialized = false
    await this.initialize()
  }
}
```

#### 3.7.3 SSE Handler with Memory Leak Prevention

> **风险**: `req.on('close', ...)` 触发 `abortController.abort()`，但如果底层 LLM API 请求不支持 `signal`，请求仍会在后台消耗服务器资源。
>
> **修正**: 确保 `AgentLoop.run()` 内部所有 LLM API 调用都正确挂载 `signal`。

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

  // Get default column ID from cache (no DB query)
  const defaultColumnId = deps.defaultColumnCache.getColumnId()

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
    for await (const event of agentLoop.run(messages, {
      role: 'todo-agent',
      sessionId,
      messageId,
      currentTime: context.currentTime,
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

#### 3.7.4 AgentLoop Signal Propagation (CRITICAL)

`AgentLoop` 必须将 `signal` 传递给所有异步操作：

```typescript
// packages/backend/src/services/agent/loop/agent-loop.ts

async *run(
  messages: ChatMessage[],
  context: AgentContext,
  deps: ToolDeps
): AsyncGenerator<ConversationEvent> {
  // ... setup code ...

  while (true) {
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

    // ... tool execution code ...

    for (const toolCall of response.tool_calls) {
      // Check abort before each tool execution
      if (this.signal?.aborted) {
        throw new DOMException('Agent loop aborted', 'AbortError')
      }

      const result = await this.executeTool(toolCall, deps)
      // ...
    }
  }
}
```

#### 3.7.5 Bootstrap Configuration

```typescript
// packages/backend/src/bootstrap.ts

import { createAgentRoutes, type AgentRouteDeps } from './routes/agent.routes'
import { DefaultColumnCache } from './services/agent/cache/default-column-cache'

export async function bootstrap() {
  // ... existing setup ...

  // Create and initialize default column cache
  const defaultColumnCache = new DefaultColumnCache(dataSource)
  await defaultColumnCache.initialize()

  // Prepare agent route dependencies
  const agentDeps: AgentRouteDeps = {
    llmProvider,
    toolRegistry,
    contextBuilder,
    tokenTruncator,
    dataSource,
    defaultColumnCache
  }

  // Create routes with injected dependencies
  app.use('/api/agent', createAgentRoutes(agentDeps))

  // ... rest of bootstrap ...
}
```
```

---

## 4. Implementation Phases

### Phase 1: Schema & Types (2-3 hours)

**Files to modify/create:**

1. `packages/shared/src/schemas/todo.ts`
   - Change `emailId` to nullable

2. `packages/shared/src/schemas/chat.ts` (new)
   - `ChatMessageSchema`
   - `ChatContextSchema`
   - `ChatRequestSchema`

3. `packages/shared/src/schemas/index.ts`
   - Export new schemas

4. `packages/backend/src/entities/Todo.entity.ts`
   - Update `emailId` column to nullable

**Verification:**
```bash
pnpm --filter @nanomail/shared build
pnpm --filter @nanomail/backend build
```

### Phase 2: AgentLoop Refactor (4-6 hours)

**Files to modify:**

1. `packages/backend/src/services/agent/loop/types.ts`
   - Update `ConversationEventType` (remove business-specific events)
   - Add `AgentContext` interface
   - Remove `AgentEmail` interface (no longer needed)

2. `packages/backend/src/services/agent/loop/agent-loop.ts`
   - Refactor `run()` method signature
   - Implement dynamic tool loading
   - Update system prompt building with time context
   - Update SSE event emission
   - **CRITICAL**: Ensure `signal` is passed to all LLM API calls

3. `packages/backend/src/services/agent/loop/token-truncator.ts` (new)
   - Implement `TokenTruncator` class
   - Add tool_call/tool_output pair protection logic
   - Add validation method

4. `packages/backend/src/services/agent/context/types.ts`
   - Add `'todo-agent'` to `AgentRole` type

5. `packages/backend/src/services/agent/cache/default-column-cache.ts` (new)
   - Implement `DefaultColumnCache` singleton
   - Startup caching logic

**Verification:**
```bash
pnpm --filter @nanomail/backend test -- --grep "AgentLoop"
pnpm --filter @nanomail/backend test -- --grep "TokenTruncator"
```

### Phase 3: Todo Tools (3-4 hours)

**Prerequisites:**

```bash
# Install dayjs for datetime parsing
pnpm --filter @nanomail/backend add dayjs
```

**Files to create:**

1. `packages/backend/src/services/agent/tools/todo-tools.ts`
   - `createTodoTool`
   - `updateTodoTool`
   - `deleteTodoTool`
   - `parseDateTime` utility with dayjs

2. `packages/backend/src/services/agent/tools/registry.ts`
   - Register todo tools
   - Add `getToolsForRole()` method

**Files to modify:**

1. `packages/backend/src/services/agent/tools/types.ts`
   - Add `ToolDeps` interface
   - Add `ToolResult` interface

**Verification:**
```bash
pnpm --filter @nanomail/backend test -- --grep "todo-tools"
```

### Phase 4: Prompt & API (2-3 hours)

**Files to create:**

1. `packages/backend/src/services/agent/prompts/todo-agent.md`
   - System prompt for todo agent

2. `packages/backend/src/services/agent/prompts/AGENTS.md`
   - Shared agent rules (if not exists)

**Files to modify:**

1. `packages/backend/src/routes/agent.routes.ts`
   - Refactor to use factory function `createAgentRoutes(deps)`
   - Add `AgentRouteDeps` interface
   - Implement SSE handler with proper signal propagation
   - Remove `/draft` endpoint (deprecated)

2. `packages/backend/src/bootstrap.ts`
   - Initialize `DefaultColumnCache` at startup
   - Inject dependencies into `createAgentRoutes()`

**Verification:**
```bash
pnpm --filter @nanomail/backend build
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"messages":[{"role":"user","content":"明天下午3点开会"}],"context":{"currentTime":"2024-01-15T10:00:00Z","timeZone":"Asia/Shanghai"}}'
```

### Phase 5: Cleanup (1-2 hours)

**Files to remove/modify:**

1. Remove draft-agent related files:
   - `packages/backend/src/services/agent/prompts/draft-agent.md` (if exists)

2. Update `ContextBuilder.ROLE_CONFIG`:
   - Remove `'draft-agent'` entry
   - Add `'todo-agent'` entry

3. Update tests to reflect new architecture

**Verification:**
```bash
pnpm test
pnpm build
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Module | Test Cases |
|--------|------------|
| `createTodo` | Empty description, long description, valid creation, duplicate rejection (verify LLM receives proper message) |
| `updateTodo` | Non-existent ID, valid update, partial update, invalid deadline format |
| `deleteTodo` | Non-existent ID, valid deletion |
| `AgentLoop` | Tool call + re-prompt flow, SSE event emission, abort handling, multiple tool calls in sequence |
| `TokenTruncator` | Pair removal when truncating assistant+tool messages, orphan tool message detection, validation error on broken pairs |
| `DefaultColumnCache` | Successful initialization, fallback when no default column, refresh after column change |

### 5.2 Integration Tests

| Scenario | Steps |
|----------|-------|
| Create todo | POST /chat → verify SSE events → check database |
| Multi-turn update | Create → Update → verify final state |
| Error handling | Invalid request → verify error event |
| Abort handling | POST /chat → close connection mid-stream → verify no memory leak |
| Signal propagation | POST /chat → abort → verify LLM API call is cancelled |

### 5.3 Manual Testing

1. Start backend server
2. Use curl or Postman to test SSE endpoint
3. Verify events arrive in correct order
4. Test abort (close connection mid-stream)
5. Verify server resources are released after abort (check with `lsof` or process monitor)

---

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM context loss | AI forgets todo IDs | Frontend maintains full history; tool results include IDs |
| Tool output too large | SSE blocked | Truncate tool output in `tool_call_end` event |
| Time parsing errors | Wrong deadlines | Prompt includes clear time format examples; tool layer validates with dayjs |
| Race conditions | Duplicate todos | Check within 5-minute window, reject creation and let LLM ask user for confirmation |
| LLM time calculation errors | Invalid ISO format | Require timezone offset in prompt; validate at tool layer |
| **Token truncation breaks tool pairs** | **400 Bad Request from LLM API** | **TokenTruncator ensures tool_call/tool_output are always removed together** |
| **API Route dependency injection** | **Cannot access deps in route** | **Use factory function `createAgentRoutes(deps)` with explicit DI** |
| **Default column query per request** | **Unnecessary DB load** | **Cache `defaultColumnId` at startup via `DefaultColumnCache` singleton** |
| **SSE memory leak** | **Server resource waste** | **Pass `signal` to all LLM API calls; double-check abort before each write** |

---

## 7. Dependencies

### 7.1 Internal Dependencies

- `@nanomail/shared` - Schemas and types
- `packages/backend/src/entities/Todo.entity.ts` - Todo entity
- `packages/backend/src/entities/BoardColumn.entity.ts` - Default column
- `packages/backend/src/config/logger.ts` - Pino logger

### 7.2 External Dependencies

- **dayjs** - Lightweight datetime parsing and validation (new)
  - Plugins: `customParseFormat`, `utc`, `timezone`
  - Alternative: `date-fns` (heavier but more modular)
- Existing: `typeorm`, `express`, `zod`

### 7.3 New Internal Modules

| Module | Purpose |
|--------|---------|
| `TokenTruncator` | Context window management with tool pair protection |
| `DefaultColumnCache` | Startup-cached default column ID singleton |
| `AgentRouteDeps` | Type-safe dependency injection for routes |

---

## 8. Acceptance Criteria

- [ ] `emailId` is nullable in Todo schema
- [ ] `POST /api/agent/chat` endpoint returns SSE stream
- [ ] SSE events include only generic types (no business-specific events like `todos_created`)
- [ ] Frontend can parse `tool_call_end` to update local todo state
- [ ] `createTodo` tool creates todo and returns ID
- [ ] `updateTodo` tool modifies existing todo
- [ ] `deleteTodo` tool removes todo
- [ ] `todo-agent.md` prompt file exists
- [ ] AgentLoop no longer depends on email parameter
- [ ] `TokenTruncator` protects tool_call/tool_output pairs during truncation
- [ ] `DefaultColumnCache` initializes at startup and serves cached value
- [ ] `AgentRouteDeps` interface defines all route dependencies
- [ ] `createAgentRoutes()` factory function injects dependencies
- [ ] `signal` is passed to all LLM API calls for proper abort handling
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Draft-agent code removed

---

## 9. Future Considerations

- **Email association**: Add `search-emails` tool when needed
- **Batch operations**: Create multiple todos in one call
- **Recurring todos**: Support "every Monday" expressions
- **Smart suggestions**: AI proactively suggests related todos
# Phase 3: Todo Tools

> Backend AI Refactor - Phase 3 of 5
> Estimated Time: 3-4 hours

---

## 1. Phase Overview

### 1.1 Goal

实现 AI 助手的 Todo CRUD 工具：
- `createTodo` - 创建待办
- `updateTodo` - 更新待办
- `deleteTodo` - 删除待办

每个工具需要：
- JSON Schema 参数定义（供 LLM 理解）
- 参数验证逻辑
- 数据库操作
- 标准化返回格式

### 1.2 Context

工具是 AgentLoop 与业务系统交互的桥梁。LLM 决定调用哪个工具后，AgentLoop 会执行对应的 handler 函数，并将结果返回给 LLM 用于生成最终响应。

**关键设计决策：**

1. **防重保护**: 创建前检查两种重复场景：
   - 5 分钟内创建相同内容（防止网络重试）
   - 存在同名且未完成的待办（业务逻辑去重）
2. **时间解析**: 使用 `dayjs` 库解析和验证 ISO 8601 时间格式，增加正则预检防止自然语言误解析
3. **标准化返回**: 所有工具返回统一格式的 `ToolResult`
4. **防 LLM 幻觉**: JSON Schema 中添加 `additionalProperties: false`，防止 LLM 生成未定义参数
5. **空值处理**: `notes` 字段 trim 后为空则存为 `null`，避免无意义空格
6. **来源追踪**: `createTodo` 创建的待办默认 `source: 'chat'`，便于后续统计分析 AI 创建的待办数量

### 1.3 Dependencies

- **Phase 1** 完成（需要 `Todo` schema 修改）
- **Phase 2** 完成（需要 `ToolDeps` 接口）
- 需要安装 `dayjs` 库

---

## 2. Prerequisites

```bash
# Install dayjs for datetime parsing
pnpm --filter @nanomail/backend add dayjs
```

---

## 3. Tool Specifications

### 3.1 Common Types

```typescript
// packages/backend/src/services/agent/tools/types.ts

import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { MoreThan, In } from 'typeorm'
import { Todo } from '../../entities/Todo'

// Initialize dayjs plugins
dayjs.extend(customParseFormat)
dayjs.extend(utc)
dayjs.extend(timezone)

// ============================================
// Dependency Injection Interface
// ============================================

interface ToolDeps {
  dataSource: DataSource
  defaultColumnId: number  // Fetched from BoardColumn where isDefault = true
}

// ============================================
// Tool Result Interface
// ============================================

interface ToolResult {
  success: boolean
  reason?: string          // Error code when success = false: EMPTY_DESCRIPTION, DESCRIPTION_TOO_LONG, INVALID_DEADLINE_FORMAT, DUPLICATE_DETECTED, TODO_NOT_FOUND, NOTES_TOO_LONG, DATABASE_ERROR
  warning?: string         // Warning code when success = true
  message: string          // Human-readable message (for LLM to process)
  todo?: {
    id: number
    description: string
    deadline: string | null
    status: string
    boardColumnId: number
    notes?: string | null
    source: 'email' | 'chat' | 'manual'
  }
  existingTodo?: {         // Returned when duplicate is detected
    id: number
    description: string
    deadline: string | null
    status: string
    notes?: string | null
    source: 'email' | 'chat' | 'manual'
  }
}

// ============================================
// Tool Parameter Interfaces
// ============================================

interface CreateTodoParams {
  description: string
  deadline?: string | null
  notes?: string | null
  forceCreate?: boolean
}

interface UpdateTodoParams {
  id: number
  description?: string
  deadline?: string | null
  status?: 'pending' | 'in_progress' | 'completed'
  notes?: string | null
}

interface DeleteTodoParams {
  id: number
}

// ============================================
// Helper Functions
// ============================================

/**
 * Parse datetime string with robust validation
 * Supports ISO 8601 formats with timezone
 *
 * IMPORTANT: Pre-check for valid format to prevent dayjs from misinterpreting
 * natural language inputs like "tomorrow" as valid dates.
 */
function parseDateTime(input: string): { isValid: boolean; toDate(): Date | null } {
  // Pre-check: input must contain at least one digit to be a valid date
  // This prevents dayjs from accepting "tomorrow", "next week", etc.
  if (!input || !/\d/.test(input)) {
    return { isValid: false, toDate: () => null }
  }

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
    boardColumnId: todo.boardColumnId,
    notes: todo.notes ?? null,
    source: todo.source
  }
}

export type {
  ToolDeps,
  ToolResult,
  CreateTodoParams,
  UpdateTodoParams,
  DeleteTodoParams
}
export { parseDateTime, formatTodoForResponse }
export { MoreThan, In }
```

### 3.2 createTodo Tool

**Purpose:** 创建新的待办事项

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| description | string | Yes | 任务内容（1-2000 字符）|
| deadline | string | No | ISO 8601 datetime，如 `2024-01-15T15:00:00+08:00` |
| notes | string | No | 备注（最大 2000 字符）|
| forceCreate | boolean | No | 设为 true 以跳过防重检查（仅当用户明确确认创建重复任务后使用）|

**Validation Rules:**
1. `description` 不能为空
2. `description` 不能超过 2000 字符
3. `deadline` 必须是有效的 ISO 8601 格式
4. 检查 5 分钟内是否有重复内容（除非 `forceCreate: true`）
5. `notes` 不能超过 2000 字符

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
      notes: {
        type: 'string',
        description: 'Additional notes for the task (max 2000 characters)'
      },
      forceCreate: {
        type: 'boolean',
        description: 'Set to true ONLY if the user explicitly confirmed they want to create a duplicate task after a DUPLICATE_DETECTED warning. This bypasses the 5-minute duplicate check.'
      }
    },
    required: ['description'],
    additionalProperties: false  // Prevent LLM hallucination of undefined parameters
  },
  handler: async (params: CreateTodoParams, deps: ToolDeps): Promise<ToolResult> => {
    const { description, deadline, notes, forceCreate } = params
    const { dataSource, defaultColumnId } = deps

    try {
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

      // Validate notes length if provided, normalize empty strings to null
      let normalizedNotes: string | null = null
      if (notes !== undefined && notes !== null) {
        const trimmedNotes = notes.trim()
        if (trimmedNotes.length === 0) {
          normalizedNotes = null  // Empty string -> null
        } else if (trimmedNotes.length > 2000) {
          return {
            success: false,
            reason: 'NOTES_TOO_LONG',
            message: 'Notes exceed 2000 characters'
          }
        } else {
          normalizedNotes = trimmedNotes
        }
      }

      // Validate and normalize deadline format if provided
      let normalizedDeadline: Date | null = null
      if (deadline) {
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

      // Check for duplicates:
      // 1. Within last 5 minutes (network retry protection)
      // 2. Same description with pending/in_progress status (business logic duplicate)
      // Skip if forceCreate is true
      if (!forceCreate) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        const existingTodo = await dataSource.getRepository(Todo).findOne({
          where: [
            // Condition 1: Created within 5 minutes with same description
            { description, createdAt: MoreThan(fiveMinutesAgo) },
            // Condition 2: Same description and still incomplete
            { description, status: In(['pending', 'in_progress']) }
          ]
        })

        if (existingTodo) {
          // Determine which condition matched for better user feedback
          const isRecent = existingTodo.createdAt > fiveMinutesAgo
          const isIncomplete = ['pending', 'in_progress'].includes(existingTodo.status)

          let warningContext = ''
          if (isRecent && isIncomplete) {
            warningContext = '（5分钟内创建且未完成）'
          } else if (isRecent) {
            warningContext = '（5分钟内已创建）'
          } else {
            warningContext = '（存在同名未完成待办）'
          }

          // CRITICAL: Do NOT create duplicate - delegate to LLM to ask user
          // LLM should set forceCreate=true on next call if user confirms
          return {
            success: false,
            reason: 'DUPLICATE_DETECTED',
            message: `检测到重复待办${warningContext}（ID: ${existingTodo.id}）。请询问用户是否确认要再次创建。如果用户确认，请在下次调用时将 forceCreate 参数设置为 true。`,
            existingTodo: formatTodoForResponse(existingTodo)
          }
        }
      }

      // Create todo
      // source 默认为 'chat'，因为此工具通过 AI 助手调用
      const todo = dataSource.getRepository(Todo).create({
        description,
        deadline: normalizedDeadline,
        boardColumnId: defaultColumnId,
        status: 'pending',
        emailId: null,
        notes: normalizedNotes,
        source: 'chat'
      })
      await dataSource.getRepository(Todo).save(todo)

      return {
        success: true,
        message: `Todo created successfully with ID ${todo.id}`,
        todo: formatTodoForResponse(todo)
      }
    } catch (error) {
      // Database error handling
      return {
        success: false,
        reason: 'DATABASE_ERROR',
        message: `Failed to create todo due to a system error. Please try again later.`
      }
    }
  }
}
```

### 3.3 updateTodo Tool

**Purpose:** 更新现有待办事项

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | integer | Yes | 待办 ID |
| description | string | No | 新的任务内容 |
| deadline | string | No | 新的截止时间（ISO 8601）|
| status | string | No | 新状态：pending/in_progress/completed |
| notes | string | No | 备注（最大 2000 字符）|

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
        type: ['string', 'null'],  // Allow null to remove deadline
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
    required: ['id'],
    additionalProperties: false  // Prevent LLM hallucination of undefined parameters
  },
  handler: async (params: UpdateTodoParams, deps: ToolDeps): Promise<ToolResult> => {
    const { id, description, deadline, status, notes } = params
    const { dataSource } = deps

    try {
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

      // Validate and parse deadline if provided
      let newDeadline = todo.deadline
      if (deadline !== undefined) {
        if (deadline === null) {
          newDeadline = null
        } else {
          const parsed = parseDateTime(deadline)
          if (!parsed.isValid) {
            return {
              success: false,
              reason: 'INVALID_DEADLINE_FORMAT',
              message: `Deadline format is invalid. Expected ISO 8601 format. Received: ${deadline}`
            }
          }
          // IMPORTANT: Use dayjs parsed result instead of new Date() for timezone consistency
          newDeadline = parsed.toDate()
        }
      }

      // Validate notes length if provided, normalize empty strings to null
      let newNotes = todo.notes
      if (notes !== undefined) {
        if (notes === null) {
          newNotes = null
        } else {
          const trimmedNotes = notes.trim()
          if (trimmedNotes.length === 0) {
            newNotes = null  // Empty string -> null
          } else if (trimmedNotes.length > 2000) {
            return {
              success: false,
              reason: 'NOTES_TOO_LONG',
              message: 'Notes exceed 2000 characters'
            }
          } else {
            newNotes = trimmedNotes
          }
        }
      }

      // Update fields
      if (description !== undefined) todo.description = description
      todo.deadline = newDeadline
      if (status !== undefined) todo.status = status
      todo.notes = newNotes

      await dataSource.getRepository(Todo).save(todo)

      return {
        success: true,
        message: `Todo ${id} updated successfully`,
        todo: formatTodoForResponse(todo)
      }
    } catch (error) {
      // Database error handling
      return {
        success: false,
        reason: 'DATABASE_ERROR',
        message: `Failed to update todo due to a system error. Please try again later.`
      }
    }
  }
}
```

### 3.4 deleteTodo Tool

**Purpose:** 删除待办事项

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | integer | Yes | 待办 ID |

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
    required: ['id'],
    additionalProperties: false  // Prevent LLM hallucination of undefined parameters
  },
  handler: async (params: DeleteTodoParams, deps: ToolDeps): Promise<ToolResult> => {
    const { id } = params
    const { dataSource } = deps

    try {
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
    } catch (error) {
      // Database error handling
      return {
        success: false,
        reason: 'DATABASE_ERROR',
        message: `Failed to delete todo due to a system error. Please try again later.`
      }
    }
  }
}
```

---

## 4. Tool Registry

### 4.1 `packages/backend/src/services/agent/tools/registry.ts`

```typescript
import { createTodoTool, updateTodoTool, deleteTodoTool } from './todo-tools'
import type { Tool } from './types'

/**
 * Tool registry for different agent roles
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  constructor() {
    // Register todo tools
    this.register(createTodoTool)
    this.register(updateTodoTool)
    this.register(deleteTodoTool)
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * Get all tools for a specific agent role
   */
  getToolsForRole(role: AgentRole): Tool[] {
    const TOOL_SETS: Record<AgentRole, string[]> = {
      'todo-agent': ['createTodo', 'updateTodo', 'deleteTodo']
    }

    const toolNames = TOOL_SETS[role] || []
    return toolNames
      .map(name => this.tools.get(name))
      .filter((t): t is Tool => t !== undefined)
  }

  /**
   * Get JSON Schema for LLM function calling
   */
  getToolSchemasForRole(role: AgentRole): object[] {
    return this.getToolsForRole(role).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }
}
```

---

## 5. Files to Create/Modify

### 5.1 Create Files

| File | Purpose |
|------|---------|
| `packages/backend/src/services/agent/tools/todo-tools.ts` | Todo CRUD 工具实现 |
| `packages/backend/src/services/agent/tools/registry.ts` | 工具注册表 |

### 5.2 Modify Files

| File | Change |
|------|--------|
| `packages/backend/src/services/agent/tools/types.ts` | 添加 `ToolDeps`、`ToolResult` 接口 |

---

## 6. Implementation Steps

### Step 1: Install dayjs

```bash
pnpm --filter @nanomail/backend add dayjs
```

### Step 2: Create Types

```bash
# 编辑类型文件
packages/backend/src/services/agent/tools/types.ts
```

添加 `ToolDeps`、`ToolResult` 接口和工具函数。

### Step 3: Create Todo Tools

```bash
# 创建工具文件
touch packages/backend/src/services/agent/tools/todo-tools.ts
```

实现 `createTodoTool`、`updateTodoTool`、`deleteTodoTool`。

### Step 4: Create Tool Registry

```bash
# 创建注册表文件
touch packages/backend/src/services/agent/tools/registry.ts
```

实现 `ToolRegistry` 类。

### Step 5: Test

```bash
# 运行工具测试
pnpm --filter @nanomail/backend test -- --grep "todo-tools"
```

---

## 7. Verification Checklist

- [ ] `createTodoTool` 创建待办并返回 ID
- [ ] `createTodoTool` 检测 5 分钟内重复并返回 `DUPLICATE_DETECTED`
- [ ] `createTodoTool` 检测同名未完成待办并返回 `DUPLICATE_DETECTED`（新增）
- [ ] `createTodoTool` 使用 `forceCreate=true` 绕过防重检查创建重复待办
- [ ] `createTodoTool` 支持创建时添加 `notes` 字段
- [ ] `createTodoTool` 将空 `notes` 存为 `null`（新增）
- [ ] `createTodoTool` 创建待办时默认 `source: 'chat'`（新增）
- [ ] `updateTodoTool` 更新现有待办
- [ ] `updateTodoTool` 使用 dayjs 解析结果赋值 deadline（避免 `new Date()` 不一致）
- [ ] `updateTodoTool` 返回 `TODO_NOT_FOUND` 当 ID 不存在
- [ ] `updateTodoTool` 将空 `notes` 存为 `null`（新增）
- [ ] `deleteTodoTool` 删除待办
- [ ] `deleteTodoTool` 返回 `TODO_NOT_FOUND` 当 ID 不存在
- [ ] 所有工具 handler 包含 try-catch 数据库异常捕获
- [ ] `parseDateTime` 正确解析 ISO 8601 格式
- [ ] `parseDateTime` 拒绝自然语言输入如 "tomorrow"（新增）
- [ ] `ToolRegistry.getToolsForRole('todo-agent')` 返回三个工具
- [ ] 单元测试通过

---

## 8. Unit Test Cases

| Module | Test Cases |
|--------|------------|
| `createTodo` | Empty description, long description, valid creation, duplicate detection within 5 min (verify LLM receives `DUPLICATE_DETECTED` with `existingTodo`), duplicate with existing incomplete todo (new), duplicate with `forceCreate=true` (should succeed), notes field support, empty notes → null (new), notes length validation, source field defaults to 'chat' (new) |
| `updateTodo` | Non-existent ID, valid update, partial update, invalid deadline format, deadline set to null, deadline timezone consistency (dayjs vs new Date), notes update, empty notes → null (new), database error handling |
| `deleteTodo` | Non-existent ID, valid deletion, database error handling |
| `parseDateTime` | Valid ISO 8601, invalid format, natural language rejection (e.g., "tomorrow", "next week") (new) |

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Time parsing errors | Wrong deadlines | Prompt includes clear time format examples; tool layer validates with dayjs + regex pre-check |
| Race conditions | Duplicate todos | Check within 5-minute window OR existing incomplete todo with `forceCreate` override |
| LLM time calculation errors | Invalid ISO format | Require timezone offset in prompt; validate at tool layer |
| Agent infinite loop (duplicate) | User stuck in confirmation loop | `forceCreate` parameter allows LLM to break the loop after explicit user confirmation |
| Database errors | Unhandled exceptions | All handlers wrapped in try-catch, returning `DATABASE_ERROR` to LLM gracefully |
| Timezone inconsistency | Deadline saved incorrectly | Use dayjs parsed result (`parsed.toDate()`) instead of native `new Date()` for consistency |
| LLM hallucinated parameters | Unexpected tool calls | `additionalProperties: false` in JSON Schema prevents undefined parameters |
| Natural language date input | dayjs misinterprets "tomorrow" as valid date | Regex pre-check `/\d/.test(input)` rejects inputs without digits |
| Empty notes strings | Meaningless whitespace in database | Trim and normalize to `null` when empty |

---

## 10. Critical Design Notes

### 10.1 增强防重逻辑

**问题场景：**
仅检查"5分钟内重复"不够完善，用户可能忘记已存在同名未完成任务。

**解决方案：**
双重条件检查（OR 关系）：
```typescript
where: [
  // 条件1：5分钟内创建（网络重试保护）
  { description, createdAt: MoreThan(fiveMinutesAgo) },
  // 条件2：同名且未完成（业务去重）
  { description, status: In(['pending', 'in_progress']) }
]
```

**用户反馈优化：**
返回消息包含匹配原因：
- "5分钟内创建且未完成"
- "5分钟内已创建"
- "存在同名未完成待办"

### 10.2 forceCreate 防死循环机制

**问题场景：**
```
LLM 检测到重复 → 询问用户 → 用户确认创建 → LLM 再次调用（相同参数）
→ 仍然被防重拦截 → 死循环
```

**解决方案：**
- `forceCreate` 参数默认为 `false`
- 当检测到重复时，返回消息明确告知 LLM："如果用户确认，请在下次调用时将 forceCreate 参数设置为 true"
- LLM 在用户确认后，设置 `forceCreate=true` 绕过防重检查

### 10.3 时间解析一致性

**问题：** `new Date(deadline)` 在不同 Node.js 版本处理时区时可能与 dayjs 结果不一致。

**解决方案：** 在 updateTodo 中，已通过 dayjs 解析验证的时间，直接使用 `parsed.toDate()` 而非 `new Date(deadline)`。

### 10.4 Phase 4 铺垫：上下文时间注入

**问题：** 当用户说"帮我建一个明天的待办"时，LLM 无法知道当前日期时间，无法计算准确的 ISO 8601 字符串。

**Phase 4 实现要点：**
在 System Prompt 中动态注入当前上下文时间：
```typescript
// 在构建 system prompt 时注入
const now = new Date()
const systemPrompt = `
当前服务器时间：${now.toISOString()}
用户本地时区：${userTimezone || 'UTC'}

当用户使用相对时间词（如"明天"、"下周"），请根据当前时间计算准确的 ISO 8601 datetime。
`
```

这确保 LLM 能够正确计算相对时间并传递给工具。

### 10.5 JSON Schema 防幻觉设计

**问题：** LLM 可能生成未定义的工具参数，导致意外行为。

**解决方案：**
所有工具的 JSON Schema 必须包含 `additionalProperties: false`：
```typescript
parameters: {
  type: 'object',
  properties: { ... },
  required: ['...'],
  additionalProperties: false  // 强制禁止未定义参数
}
```

**类型修复：**
`deadline` 字段支持 `null` 值移除截止时间：
```typescript
deadline: {
  type: ['string', 'null'],  // 数组类型支持多类型
  description: '... or null to remove'
}
```

### 10.6 数据处理健壮性

**空值处理：**
- `notes` 字段在存储前执行 `.trim()`
- trim 后长度为 0 则存为 `null`
- 避免 DB 中存入无意义的空格或空字符串

**日期解析防护：**
```typescript
// 防止 dayjs 将 "tomorrow" 解析为今天+1
if (!input || !/\d/.test(input)) {
  return { isValid: false, toDate: () => null }
}
```

---

## 11. Next Phase

完成本 Phase 后，进入 **Phase 4: Prompt & API**，实现 AI Prompt 和 SSE API 路由。
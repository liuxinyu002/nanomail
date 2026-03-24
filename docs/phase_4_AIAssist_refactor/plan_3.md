# Plan 3: 工具错误状态展示

> AI Chat 页面工具执行错误状态的正确展示实现方案

---

## 1. 需求重述

### 1.1 背景

当前 AI Chat 页面存在工具执行状态显示问题：

| 组件 | 当前状态 | 问题 |
|------|---------|------|
| 后端 `agent-loop.ts` | 正确返回 `{ error, status: 'failed' }` | 无问题 |
| 前端 `useChat.ts` | 硬编码 `status: 'success'` | **问题根源** |
| UI `ToolStatusBadge` | 已支持 `error` 状态 | 因数据问题从未被激活 |
| UI `ToolCallAccordion` | 已统计 `errorCount` | 因数据问题无法正确显示 |

### 1.2 用户需求

1. **状态正确展示**：工具执行失败时，状态徽章显示红色 X 图标
2. **错误详情可折叠**：错误消息默认折叠，点击可展开查看详情
3. **消息过滤**：`role="tool"` 的原始数据不作为独立对话消息展示（已实现）

### 1.3 成功标准

- [ ] 工具执行成功时，显示绿色勾号图标
- [ ] 工具执行失败时，显示红色 X 图标
- [ ] 错误消息正确传递到 `ToolStatusBadge.message` 字段
- [ ] `ToolCallAccordion` 正确显示 "Completed with N errors" 摘要
- [ ] 测试覆盖工具成功/失败两种场景

---

## 2. 技术方案

### 2.1 问题根源分析

**文件**: `packages/frontend/src/hooks/useChat.ts`

**问题代码** (第 290 行):

```typescript
case 'tool_call_end':
  if (assistantMsg) {
    setMessages(prev => prev.map(msg =>
      msg.id === assistantMsg.id
        ? {
            ...msg,
            toolCalls: msg.toolCalls?.map(tc =>
              tc.id === event.data.toolCallId
                ? { ...tc, status: 'success' as const, output: event.data.toolOutput }  // 问题：硬编码
                : tc
            ),
          }
        : msg
    ))
  }
  break
```

**后端返回的数据结构**:

```typescript
// agent-loop.ts:470-479
toolOutput = {
  error: error instanceof Error ? error.message : String(error),
  status: 'failed'
}
```

### 2.2 解决方案设计

#### 方案 A：从 toolOutput 推断状态（推荐）

**优点**：
- 改动最小，仅修改前端
- 向后兼容，不需要修改后端事件结构

**缺点**：
- 状态推断逻辑耦合在数据流层

**实现逻辑**:

```typescript
function inferToolStatus(toolOutput: Record<string, unknown>): {
  status: 'success' | 'error'
  message?: string
} {
  // 后端返回 { status: 'failed', error: '...' } 表示失败
  if (toolOutput?.status === 'failed') {
    return {
      status: 'error',
      message: typeof toolOutput.error === 'string'
        ? toolOutput.error
        : 'Tool execution failed'
    }
  }
  // 其他情况视为成功
  return { status: 'success' }
}
```

#### 方案 B：后端事件增加 status 字段

**优点**：
- 前后端契约更明确
- 类型更安全

**缺点**：
- 需要修改后端事件类型定义
- 涉及更多文件改动

**决策**：采用方案 A，改动最小，风险最低。

### 2.3 数据流修改

```
后端 tool_call_end 事件
    │
    │  data: { toolOutput: { error?: string, status?: 'failed' | ... } }
    ▼
前端 handleEvent()
    │
    │  推断状态 + 提取错误消息
    ▼
ToolCallStatus: { status: 'success' | 'error', message?: string }
    │
    ▼
ToolStatusBadge 渲染
```

---

## 3. 实现步骤

### Phase 1: 核心修复（1 个文件）

#### Step 1.1: 添加状态推断工具函数

**文件**: `packages/frontend/src/hooks/useChat.ts`

**位置**: 在 `pruneMessagesForStorage` 函数之后添加

```typescript
/**
 * Infers tool call status from backend toolOutput.
 *
 * Backend returns:
 * - Success: { result: ..., ... } or other valid output
 * - Failure: { error: string | object, status: 'failed' }
 *
 * @param toolOutput - The tool output from backend
 * @returns Status and optional error message for UI display
 */
function inferToolStatus(toolOutput?: Record<string, unknown>): {
  status: 'success' | 'error'
  message?: string
} {
  if (!toolOutput) {
    return { status: 'success' }
  }

  // Backend explicitly marks failure with status: 'failed'
  if (toolOutput.status === 'failed') {
    let errorMessage: string

    if (typeof toolOutput.error === 'string') {
      errorMessage = toolOutput.error
    } else if (toolOutput.error && typeof toolOutput.error === 'object') {
      // Handle nested error objects: { error: { message: "..." } }
      errorMessage = (toolOutput.error as Record<string, unknown>).message as string
        || JSON.stringify(toolOutput.error)
    } else {
      errorMessage = 'Tool execution failed'
    }

    return {
      status: 'error',
      message: errorMessage
    }
  }

  // All other cases are considered success
  return { status: 'success' }
}
```

#### Step 1.2: 修改 tool_call_end 处理逻辑

**文件**: `packages/frontend/src/hooks/useChat.ts`

**位置**: `handleEvent` 函数中的 `case 'tool_call_end'` 分支

**修改前**:

```typescript
case 'tool_call_end':
  if (assistantMsg) {
    setMessages(prev => prev.map(msg =>
      msg.id === assistantMsg.id
        ? {
            ...msg,
            toolCalls: msg.toolCalls?.map(tc =>
              tc.id === event.data.toolCallId
                ? { ...tc, status: 'success' as const, output: event.data.toolOutput }
                : tc
            ),
          }
        : msg
    ))
    // ... tool message creation
  }
  break
```

**修改后**:

```typescript
case 'tool_call_end':
  if (assistantMsg) {
    // Infer status from backend toolOutput
    const { status, message } = inferToolStatus(event.data.toolOutput)

    // 1. Update the tool call status in assistant message
    setMessages(prev => prev.map(msg =>
      msg.id === assistantMsg.id
        ? {
            ...msg,
            toolCalls: msg.toolCalls?.map(tc =>
              tc.id === event.data.toolCallId
                ? {
                    ...tc,
                    status,
                    output: event.data.toolOutput,
                    message  // Error message for UI display
                  }
                : tc
            ),
          }
        : msg
    ))

    // 2. Create a tool result message for conversation history
    // NOTE: This tool message is appended to state to maintain the full
    // conversation history for LLM context. The UI layer filters out
    // role="tool" messages from display (see MessageList.tsx).
    const toolMessage = createUIMessage(
      'tool',
      JSON.stringify(event.data.toolOutput),
      event.data.toolCallId
    )
    setMessages(prev => [...prev, toolMessage])
  }
  break
```

> **说明**: `role="tool"` 消息的追加逻辑用于维持完整的对话历史，以便发送给 LLM 时包含工具调用结果上下文。UI 渲染层（`MessageList.tsx`）会过滤这些消息，不会展示给用户。

#### Step 1.3: 错误详情折叠面板 UI 实现

> **重要**: 错误详情折叠是 MVP 必做项，不可跳过。因为 error message 可能是极长的堆栈报错或 JSON 字符串，直接平铺展示会严重破坏主聊天界面排版。

**目标**: 保持 UI 简洁，仅显示红色 X 图标和简短错误提示，用户点击才查看详情。

**方案 A: 使用原生 `<details>` 和 `<summary>` 标签（推荐）**

修改 `ToolStatusBadge` 组件：

```tsx
// packages/frontend/src/components/chat/ToolStatusBadge.tsx

{status === 'error' && message && (
  <details className="ml-2">
    <summary className="cursor-pointer text-xs text-red-400 hover:text-red-300">
      点击查看错误详情
    </summary>
    <pre className="mt-2 p-2 bg-red-900/20 rounded text-xs text-red-300 overflow-x-auto max-w-md whitespace-pre-wrap break-words">
      {message}
    </pre>
  </details>
)}
```

**方案 B: 复用现有 Accordion 逻辑**

如果项目已有 Accordion 组件，可在 `ToolCallAccordion` 中扩展错误展示逻辑：

```tsx
// 在 ToolCallAccordion 组件中
{errorCount > 0 && (
  <Accordion type="single" collapsible>
    <AccordionItem value="errors">
      <AccordionTrigger className="text-red-400 text-sm">
        {errorCount} 个工具执行失败
      </AccordionTrigger>
      <AccordionContent>
        {toolCalls
          .filter(tc => tc.status === 'error')
          .map(tc => (
            <div key={tc.id} className="py-2 border-b border-red-900/30 last:border-0">
              <div className="font-medium text-red-300">{tc.name}</div>
              <pre className="mt-1 text-xs text-red-400/80 overflow-x-auto">
                {tc.message}
              </pre>
            </div>
          ))}
      </AccordionContent>
    </AccordionItem>
  </Accordion>
)}
```

**验收标准**:
- [ ] 错误消息默认折叠，不影响主聊天界面布局
- [ ] 用户点击可展开查看完整错误详情
- [ ] 长错误消息支持滚动或换行，不会撑破容器

---

### Phase 2: 测试覆盖

#### Step 2.1: 添加工具执行失败测试

**文件**: `packages/frontend/src/hooks/useChat.test.tsx`

**位置**: 在 `describe('sendMessage')` 块中添加

```typescript
describe('tool call error status', () => {
  it('should show error status when tool execution fails', async () => {
    const events: ConversationEvent[] = [
      {
        type: 'tool_call_start',
        data: {
          toolCallId: 'call-1',
          toolName: 'create_todo',
          toolInput: { description: 'Test' },
        },
      },
      {
        type: 'tool_call_end',
        data: {
          toolCallId: 'call-1',
          toolName: 'create_todo',
          toolInput: {},
          toolOutput: {
            error: 'Database connection failed',
            status: 'failed'
          },
        },
      },
      { type: 'session_end', data: null },
    ]
    mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('Create a todo')
    })

    const assistantMessage = result.current.messages[1]
    expect(assistantMessage.toolCalls).toHaveLength(1)
    expect(assistantMessage.toolCalls?.[0].status).toBe('error')
    expect(assistantMessage.toolCalls?.[0].message).toBe('Database connection failed')
  })

  it('should show success status for successful tool execution', async () => {
    const events: ConversationEvent[] = [
      {
        type: 'tool_call_start',
        data: {
          toolCallId: 'call-1',
          toolName: 'create_todo',
          toolInput: {},
        },
      },
      {
        type: 'tool_call_end',
        data: {
          toolCallId: 'call-1',
          toolName: 'create_todo',
          toolInput: {},
          toolOutput: { success: true, id: 1 },
        },
      },
      { type: 'session_end', data: null },
    ]
    mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('Create a todo')
    })

    const assistantMessage = result.current.messages[1]
    expect(assistantMessage.toolCalls).toHaveLength(1)
    expect(assistantMessage.toolCalls?.[0].status).toBe('success')
  })

  it('should handle missing error message gracefully', async () => {
    const events: ConversationEvent[] = [
      {
        type: 'tool_call_start',
        data: {
          toolCallId: 'call-1',
          toolName: 'create_todo',
          toolInput: {},
        },
      },
      {
        type: 'tool_call_end',
        data: {
          toolCallId: 'call-1',
          toolName: 'create_todo',
          toolInput: {},
          toolOutput: { status: 'failed' },  // No error field
        },
      },
      { type: 'session_end', data: null },
    ]
    mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('Create a todo')
    })

    const assistantMessage = result.current.messages[1]
    expect(assistantMessage.toolCalls?.[0].status).toBe('error')
    expect(assistantMessage.toolCalls?.[0].message).toBe('Tool execution failed')
  })

  it('should handle nested error object', async () => {
    const events: ConversationEvent[] = [
      {
        type: 'tool_call_start',
        data: {
          toolCallId: 'call-1',
          toolName: 'create_todo',
          toolInput: {},
        },
      },
      {
        type: 'tool_call_end',
        data: {
          toolCallId: 'call-1',
          toolName: 'create_todo',
          toolInput: {},
          toolOutput: {
            error: { message: 'Connection timeout', code: 'ETIMEDOUT' },
            status: 'failed'
          },
        },
      },
      { type: 'session_end', data: null },
    ]
    mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('Create a todo')
    })

    const assistantMessage = result.current.messages[1]
    expect(assistantMessage.toolCalls?.[0].status).toBe('error')
    expect(assistantMessage.toolCalls?.[0].message).toBe('Connection timeout')
  })

  it('should handle mixed success and error tool calls', async () => {
    const events: ConversationEvent[] = [
      { type: 'tool_call_start', data: { toolCallId: 'call-1', toolName: 'create_todo', toolInput: {} } },
      { type: 'tool_call_end', data: { toolCallId: 'call-1', toolName: 'create_todo', toolInput: {}, toolOutput: { success: true } } },
      { type: 'tool_call_start', data: { toolCallId: 'call-2', toolName: 'update_todo', toolInput: {} } },
      { type: 'tool_call_end', data: { toolCallId: 'call-2', toolName: 'update_todo', toolInput: {}, toolOutput: { error: 'Not found', status: 'failed' } } },
      { type: 'session_end', data: null },
    ]
    mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('Do stuff')
    })

    const assistantMessage = result.current.messages[1]
    expect(assistantMessage.toolCalls).toHaveLength(2)
    expect(assistantMessage.toolCalls?.[0].status).toBe('success')
    expect(assistantMessage.toolCalls?.[1].status).toBe('error')
    expect(assistantMessage.toolCalls?.[1].message).toBe('Not found')
  })
})
```

#### Step 2.2: 更新现有测试断言

**文件**: `packages/frontend/src/hooks/useChat.test.tsx`

**位置**: 现有测试 `'should prune toolCalls input/output before saving to sessionStorage'`

**修改**: 更新断言以验证 error 状态也能正确保存

```typescript
it('should preserve error status in pruned toolCalls', async () => {
  const events: ConversationEvent[] = [
    {
      type: 'tool_call_start',
      data: {
        toolCallId: 'call-1',
        toolName: 'create_todo',
        toolInput: {},
      },
    },
    {
      type: 'tool_call_end',
      data: {
        toolCallId: 'call-1',
        toolName: 'create_todo',
        toolInput: {},
        toolOutput: { error: 'Failed', status: 'failed' },
      },
    },
    { type: 'session_end', data: null },
  ]
  mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

  const { result } = renderHook(() => useChat())

  await act(async () => {
    await result.current.sendMessage('Create todo')
  })

  await waitFor(() => {
    expect(sessionStorageMock.setItem).toHaveBeenCalled()
  })

  const savedData = JSON.parse(sessionStorageMock.setItem.mock.calls.at(-1)?.[1] || '[]')
  const assistantMessage = savedData.find((m: UIMessage) => m.role === 'assistant')

  expect(assistantMessage.toolCalls[0].status).toBe('error')
  expect(assistantMessage.toolCalls[0].message).toBe('Failed')
  // input and output should still be stripped
  expect(assistantMessage.toolCalls[0].input).toBeUndefined()
  expect(assistantMessage.toolCalls[0].output).toBeUndefined()
})
```

---

## 4. 风险评估

### 4.1 风险矩阵

| 风险 | 可能性 | 影响 | 等级 | 缓解措施 |
|------|--------|------|------|---------|
| 状态推断逻辑错误 | 低 | 中 | **中** | 充分的单元测试覆盖 |
| 后端返回格式变化 | 低 | 高 | **中** | 添加防御性代码，默认视为成功 |
| sessionStorage 溢出 | 低 | 低 | **低** | 已有数据修剪机制 |
| UI 组件未正确渲染 | 低 | 中 | **低** | 组件已实现，仅需数据正确 |

### 4.2 回归风险

**影响范围**:
- `useChat.ts` - 核心数据流处理
- `useChat.test.tsx` - 测试文件

**不涉及**:
- 后端代码无需修改
- UI 组件已实现，无需修改
- 类型定义已存在，无需修改

### 4.3 兼容性考虑

1. **向后兼容**: 如果后端未返回 `status` 字段，默认视为成功
2. **类型安全**: `ToolCallStatus` 接口已定义 `status` 和 `message` 字段
3. **数据修剪**: 错误消息会保留在 `message` 字段，不被修剪

---

## 5. 测试计划

### 5.1 单元测试

| 测试场景 | 文件 | 预期结果 |
|---------|------|---------|
| 工具执行成功 | `useChat.test.tsx` | `status: 'success'` |
| 工具执行失败（有错误消息） | `useChat.test.tsx` | `status: 'error'`, `message: '错误消息'` |
| 工具执行失败（无错误消息） | `useChat.test.tsx` | `status: 'error'`, `message: 'Tool execution failed'` |
| 工具执行失败（嵌套错误对象） | `useChat.test.tsx` | `status: 'error'`, `message: 'Connection timeout'` |
| 混合成功/失败 | `useChat.test.tsx` | 各自状态正确 |
| 数据修剪保留错误消息 | `useChat.test.tsx` | `message` 字段保留 |

### 5.2 集成测试（手动）

1. **成功场景**:
   - 发送 "创建一个 todo"
   - 验证工具调用显示绿色勾号

2. **失败场景**:
   - 触发工具执行错误（如无效参数）
   - 验证工具调用显示红色 X
   - 验证 `ToolCallAccordion` 显示 "Completed with 1 error"

3. **混合场景**:
   - 多个工具调用，部分成功部分失败
   - 验证状态分别正确显示

### 5.3 E2E 测试（可选）

如需要，可在 Phase 4 添加 Playwright E2E 测试：

```typescript
test('tool error status displays correctly', async ({ page }) => {
  await page.goto('/chat')

  // Trigger a failing tool call
  await page.fill('input', 'delete non-existent todo')
  await page.press('input', 'Enter')

  // Wait for response
  await page.waitForSelector('[data-testid="tool-status-error"]')

  // Verify error icon is displayed
  const errorBadge = await page.locator('[data-testid="tool-status-error"]')
  await expect(errorBadge).toBeVisible()
})
```

---

## 6. 文件变更清单

| 文件 | 操作 | 变更内容 |
|------|------|---------|
| `packages/frontend/src/hooks/useChat.ts` | 修改 | 添加 `inferToolStatus` 函数，修改 `tool_call_end` 处理逻辑 |
| `packages/frontend/src/hooks/useChat.test.tsx` | 修改 | 添加错误状态测试用例，更新现有测试断言 |
| `packages/frontend/src/components/chat/ToolStatusBadge.tsx` | 修改 | 添加错误详情折叠展示（或 `ToolCallAccordion.tsx`） |

**无新增文件**，无后端修改。

---

## 7. 验收检查清单

- [ ] `inferToolStatus` 函数正确实现（含嵌套错误对象处理）
- [ ] `tool_call_end` 处理逻辑正确调用 `inferToolStatus`
- [ ] 错误消息正确传递到 `ToolCallStatus.message`
- [ ] `ToolStatusBadge` 在 error 状态显示红色 X 图标
- [ ] `ToolCallAccordion` 正确统计错误数量
- [ ] **错误详情折叠面板正确实现（默认折叠，点击展开）**
- [ ] 单元测试全部通过
- [ ] 手动测试成功/失败场景正常
- [ ] 无控制台错误

---

## 8. 后续优化建议（可选）

1. **重试机制**: 对于可重试的错误，添加重试按钮
2. **错误分类**: 区分网络错误、验证错误、系统错误，提供不同的用户指导
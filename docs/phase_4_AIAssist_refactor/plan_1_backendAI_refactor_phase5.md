# Phase 5: Cleanup

> Backend AI Refactor - Phase 5 of 5
> Estimated Time: 1-2 hours

---

## 1. Phase Overview

### 1.1 Goal

清理废弃代码，完成最终验证：
- 移除 draft-agent 相关文件
- 更新 ContextBuilder 配置
- 更新测试以反映新架构
- 完成最终构建验证

### 1.2 Context

在重构过程中，旧的 `draft-agent` 功能已被新的 `todo-agent` 取代。本 Phase 确保代码库干净，没有遗留的无用代码。

### 1.3 Dependencies

- **Phase 1-4** 必须完成

---

## 2. Files to Remove

### 2.1 Draft Agent Prompt

```bash
# 如果存在，移除
rm packages/backend/src/services/agent/prompts/draft-agent.md
```

### 2.2 Other Draft-Related Files

检查并移除任何其他与 draft-agent 相关的文件：

```bash
# 查找相关文件
grep -r "draft-agent" packages/backend/src/
```

---

## 3. Files to Modify

### 3.1 `packages/backend/src/services/agent/context/builder.ts`

更新 `ROLE_CONFIG`：

```typescript
// Before
const ROLE_CONFIG = {
  'draft-agent': {
    promptFile: 'draft-agent.md',
    // ...
  }
}

// After
const ROLE_CONFIG = {
  'todo-agent': {
    promptFile: 'todo-agent.md',
    // ...
  }
}
```

### 3.2 Test Files

更新测试文件以反映新架构：

| Test File | Update |
|-----------|--------|
| `agent-loop.test.ts` | 使用 `ChatMessage[]` 而非 `instruction + email` |
| `agent.routes.test.ts` | 测试新的 `/chat` 端点 |
| 其他相关测试 | 适配新 API |

---

## 4. Implementation Steps

### Step 1: Remove Draft Agent Files

```bash
# 检查并移除
find packages/backend/src -name "*draft*" -type f

# 如果确认无用，移除
rm packages/backend/src/services/agent/prompts/draft-agent.md
```

### Step 2: Update ContextBuilder

```bash
# 编辑配置
packages/backend/src/services/agent/context/builder.ts
```

移除 `draft-agent` 配置，添加 `todo-agent` 配置。

### Step 3: Update Tests

```bash
# 更新测试文件
packages/backend/src/services/agent/loop/agent-loop.test.ts
packages/backend/src/routes/agent.routes.test.ts
```

### Step 4: Final Build & Test

```bash
# 运行所有测试
pnpm test

# 构建所有包
pnpm build

# 类型检查
pnpm --filter @nanomail/backend typecheck
```

---

## 5. Verification Checklist

### 5.1 Build Verification

- [ ] `pnpm build` 成功
- [ ] 无 TypeScript 编译错误
- [ ] 无未使用的导入警告

### 5.2 Test Verification

- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 覆盖率满足要求（80%+）

### 5.3 Functionality Verification

- [ ] `POST /api/agent/chat` 端点正常工作
- [ ] `createTodo` 工具创建待办成功
- [ ] `updateTodo` 工具更新待办成功
- [ ] `deleteTodo` 工具删除待办成功
- [ ] SSE 事件流正常
- [ ] 客户端断开时正确清理资源

### 5.4 Code Quality Verification

- [ ] 无 `draft-agent` 相关代码残留
- [ ] 无 `console.log` 调用（使用 pino logger）
- [ ] 无硬编码字符串（使用 shared schema 枚举）

---

## 6. Final Acceptance Criteria

### 6.1 Schema & Types

- [ ] `emailId` is nullable in Todo schema
- [ ] `ChatMessage` type available from `@nanomail/shared`
- [ ] `ChatContext` type available from `@nanomail/shared`
- [ ] `ChatRequest` type available from `@nanomail/shared`

### 6.2 API

- [ ] `POST /api/agent/chat` endpoint returns SSE stream
- [ ] SSE events include only generic types (no business-specific events like `todos_created`)
- [ ] Frontend can parse `tool_call_end` to update local todo state

### 6.3 Tools

- [ ] `createTodo` tool creates todo and returns ID
- [ ] `createTodo` rejects duplicates within 5 minutes
- [ ] `updateTodo` tool modifies existing todo
- [ ] `deleteTodo` tool removes todo

### 6.4 Architecture

- [ ] `todo-agent.md` prompt file exists
- [ ] AgentLoop no longer depends on email parameter
- [ ] `TokenTruncator` protects tool_call/tool_output pairs during truncation
- [ ] `DefaultColumnCache` initializes at startup and serves cached value
- [ ] `AgentRouteDeps` interface defines all route dependencies
- [ ] `createAgentRoutes()` factory function injects dependencies
- [ ] `signal` is passed to all LLM API calls for proper abort handling

### 6.5 Code Quality

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Draft-agent code removed
- [ ] No TypeScript errors
- [ ] No ESLint warnings

---

## 7. Post-Implementation Tasks

### 7.1 Documentation Update

- [ ] 更新 API 文档
- [ ] 更新架构图
- [ ] 更新 README（如有必要）

### 7.2 Deployment Checklist

- [ ] 确认环境变量配置
- [ ] 确认数据库迁移（如有）
- [ ] 确认日志配置

---

## 8. Troubleshooting

### 8.1 Build Errors

如果构建失败：
1. 检查 `@nanomail/shared` 是否正确构建
2. 检查类型导入路径
3. 运行 `pnpm install` 确保依赖安装

### 8.2 Test Failures

如果测试失败：
1. 检查测试数据是否正确
2. 检查 mock 是否正确配置
3. 检查数据库连接

### 8.3 Runtime Errors

如果运行时出错：
1. 检查 `DefaultColumnCache` 初始化
2. 检查 LLM Provider 配置
3. 检查数据库连接

---

## 9. Summary

完成本 Phase 后，Backend AI Refactor 全部完成。新的 AI 助手功能支持：

- 通过自然语言管理待办
- 多轮对话
- 实时 SSE 事件流
- 正确的资源清理
- 可扩展的 Agent 架构

后续可以基于此架构添加更多 Agent 角色（如 `email-agent`、`calendar-agent` 等）。
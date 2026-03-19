# Plan 6 Phase 0: Shared Schema Updates

> Part of: Phase 3 Todo Refactor - [Plan 6 Overview](./plan_6.md)

## Overview

实现 Todo 分组颜色同步功能，使 Board 列的颜色能够体现在 UI 的各个层面。采用**关系映射**架构，通过 JOIN 查询动态获取颜色，避免数据冗余和同步复杂度。

### 核心需求

| # | 需求 | 描述 |
|---|------|------|
| 1 | Board 列颜色 UI | 更改颜色时更新头部背景，移除颜色徽标 |
| 2 | Todo 颜色字段 | **API 响应中动态计算**，不物理存储 |
| 3 | Planner 颜色指示栏 | 左侧颜色条读取 Todo 的 color 字段 |

---

## Phase 0: Shared Schema Updates

> Risk: Low
> Dependencies: None

### Task 0.1: Update Todo Schema for Response/Payload Separation

**File**: `packages/shared/src/schemas/todo.ts`

**Action**: Ensure `color` field exists only in response schema, not in payload schemas

**验证要点**：

1. **TodoSchema (Response)** - 必须包含 `color` 字段
   - 前端需要此字段来渲染颜色
   - 类型：`z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable()`

2. **CreateTodoSchema (Payload)** - 不能包含 `color` 字段
   - 使用 `.strict()` 确保拒绝未知字段
   - 后端会从关联的 BoardColumn 动态获取颜色

3. **UpdateTodoSchema (Payload)** - 不能包含 `color` 字段
   - 同样使用 `.strict()` 模式
   - `color` 是只读衍生字段

**代码示例**：

```typescript
// packages/shared/src/schemas/todo.ts

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════
// Response Schema - API 返回给前端的 DTO
// ═══════════════════════════════════════════════════════════

export const TodoSchema = z.object({
  id: z.number().int().positive(),
  emailId: z.number().int().positive(),
  description: z.string().min(1).max(2000),
  status: TodoStatusSchema,
  deadline: z.string().datetime().nullable(),
  boardColumnId: z.number().int().positive().default(1),
  position: z.number().int().optional(),
  notes: z.string().max(2000).nullable().default(null),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(), // ✅ 响应包含 color
  createdAt: z.coerce.date()
})

export type Todo = z.infer<typeof TodoSchema>

// ═══════════════════════════════════════════════════════════
// Payload Schemas - 前端发送给后端的请求体
// ═══════════════════════════════════════════════════════════

export const CreateTodoSchema = z.object({
  emailId: z.number().int().positive(),
  description: z.string().min(1).max(2000),
  deadline: z.string().datetime().nullable().optional(),
  status: TodoStatusSchema.optional(),
  boardColumnId: z.number().int().positive().optional(),
  notes: z.string().max(2000).nullable().optional(),
  // ❌ 不包含 color - 衍生字段，由后端从 BoardColumn 动态计算
}).strict()

export const UpdateTodoSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: TodoStatusSchema.optional(),
  boardColumnId: z.number().int().positive().optional(),
  position: z.number().int().optional(),
  notes: z.string().max(2000).nullable().optional(),
  // ❌ 不包含 color - 衍生字段，前端无法修改
}).strict()

export type CreateTodo = z.infer<typeof CreateTodoSchema>
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>
```

**设计原则**：

| Schema 类型 | `color` 字段 | 原因 |
|-------------|--------------|------|
| `TodoSchema` (Response) | ✅ 包含 | 前端需要渲染颜色 |
| `CreateTodoSchema` | ❌ 不包含 | 衍生字段，后端自动从列获取 |
| `UpdateTodoSchema` | ❌ 不包含 | 衍生字段，不可通过 API 修改 |

**落地注意事项**：

1. **后端验证**：收到 `CreateTodo`/`UpdateTodo` 请求时，Zod 会拒绝包含 `color` 字段的请求体（`.strict()` 模式）

2. **前端类型安全**：TypeScript 会在编译时阻止前端误传 `color` 字段

3. **文档清晰**：Schema 定义即文档，开发者能清楚知道哪些字段可写

---

### Task 0.2: Rebuild Shared Package

**Command**: `pnpm --filter @nanomail/shared build`

**Verification**: TypeScript compilation succeeds in frontend and backend after import.

---

## Files Changed (Phase 0)

| File | Action |
|------|--------|
| `packages/shared/src/schemas/todo.ts` | MODIFY |

---

## Testing Checklist (Phase 0)

- [ ] `TodoSchema` includes `color` field (nullable)
- [ ] `CreateTodoSchema` does NOT include `color` field
- [ ] `UpdateTodoSchema` does NOT include `color` field
- [ ] `CreateTodoSchema.parse({ ..., color: '#FFF' })` throws error (strict mode)
- [ ] `UpdateTodoSchema.parse({ color: '#FFF' })` throws error (strict mode)
- [ ] `TodoSchema.parse({ ..., color: '#FFB5BA' })` succeeds
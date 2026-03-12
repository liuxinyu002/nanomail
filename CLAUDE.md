# NanoMail 项目指南

## 项目结构

```
packages/
├── frontend/     # React + Vite 前端应用
├── backend/      # Express + TypeScript 后端服务
└── shared/       # 共享类型和 Zod schemas（单一事实来源）
```

---

## Shared 模块使用规范

### 核心原则

**`@nanomail/shared` 是前后端类型定义的单一事实来源 (Single Source of Truth)**

### 强制规则

#### 1. 禁止重复定义类型

```typescript
// ❌ 错误：在前端或后端本地定义 interface
interface SettingsForm {
  IMAP_PASSWORD: string
}

// ✅ 正确：从 shared 导入类型
import type { SettingKey } from '@nanomail/shared'
```

#### 2. 新增类型必须放入 shared

任何同时被前后端使用的数据结构，必须在 `packages/shared/src/schemas/` 中定义：

| 场景 | 位置 |
|------|------|
| API 请求/响应类型 | `shared/schemas/` |
| 数据库实体类型 | `shared/schemas/` |
| 枚举/常量 | `shared/schemas/` |
| 仅前端/后端内部类型 | 各自包内定义 |

#### 3. Schema 定义规范

```typescript
// shared/schemas/example.ts
import { z } from 'zod'

// 1. 定义 Schema（用于运行时验证）
export const ExampleSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100)
})

// 2. 定义创建/更新用的 Schema
export const CreateExampleSchema = ExampleSchema.omit({ id: true })
export const UpdateExampleSchema = CreateExampleSchema.partial()

// 3. 导出类型（用于编译时类型检查）
export type Example = z.infer<typeof ExampleSchema>
export type CreateExample = z.infer<typeof CreateExampleSchema>
export type UpdateExample = z.infer<typeof UpdateExampleSchema>
```

#### 4. 导出规则

新增 schema 后，必须在 `shared/src/schemas/index.ts` 中导出：

```typescript
// shared/src/schemas/index.ts
export * from './email'
export * from './settings'
export * from './todo'
export * from './newSchema'  // 添加新导出
```

### 使用场景对照

| 场景 | 前端用法 | 后端用法 |
|------|----------|----------|
| 表单验证 | `CreateTodoSchema.parse(formData)` | `CreateTodoSchema.parse(req.body)` |
| 类型声明 | `import type { Todo } from '@nanomail/shared'` | 同左 |
| API 响应 | `TodoSchema.parse(response)` | `res.json(todo)` |

### 开发流程

1. **新增数据类型时**：
   - 先在 `shared/schemas/` 定义 schema 和类型
   - 在 `schemas/index.ts` 中导出
   - 运行 `pnpm --filter @nanomail/shared build`
   - 前后端再从 shared 导入使用

2. **修改现有类型时**：
   - 先修改 shared 中的定义
   - 重新构建 shared
   - 修复前后端编译错误

3. **代码审查检查项**：
   - 前端/后端是否存在本地定义的 interface 与 shared 重复
   - 是否有应该放入 shared 但未放入的类型
   - 字段命名是否与 shared schema 一致

### 常见错误示例

```typescript
// ❌ 错误 1：前端本地定义与 shared 不一致
interface SettingsForm {
  IMAP_PASSWORD: string  // shared 中是 IMAP_PASS
}

// ❌ 错误 2：硬编码字符串替代枚举
const status = 'pending'  // 应使用 TodoStatusSchema.Enum.pending

// ❌ 错误 3：后端单独定义类型
interface EmailData { ... }  // 应从 shared 导入

// ✅ 正确做法
import { TodoStatusSchema, type Todo } from '@nanomail/shared'
const status = TodoStatusSchema.Enum.pending
```

---

## 开发命令

```bash
# 构建所有包（shared 需要先构建）
pnpm build

# 单独构建 shared
pnpm --filter @nanomail/shared build

# 开发模式（watch）
pnpm --filter @nanomail/shared dev
```

---

## Git 工作流

- 提交格式：`<type>: <description>`
- 类型：feat, fix, refactor, docs, test, chore, perf, ci
- 创建 PR 前确保所有测试通过
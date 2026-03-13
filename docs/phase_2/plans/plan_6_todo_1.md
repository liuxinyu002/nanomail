# Plan 6 - Phase 1: 基础设施准备

> **阶段目标**: 安装必要依赖，扩展 Shared Schema 类型定义
> **预估时间**: 0.5h
> **前置依赖**: 无

---

## 任务上下文

Todo 日历视图功能需要以下基础设施支持：

1. **date-fns** - 日期处理库，用于日历网格计算、日期格式化
2. **Radix UI 组件** - 用于 Select、Popover、DropdownMenu 等交互组件
3. **Shared Schema 扩展** - 新增日期范围查询参数和更新字段的类型定义

---

## 任务清单

### 1. 安装 date-fns

```bash
pnpm --filter @nanomail/frontend add date-fns
```

### 2. 安装 Radix UI 组件

```bash
pnpm --filter @nanomail/frontend add @radix-ui/react-select @radix-ui/react-popover @radix-ui/react-dropdown-menu
```

### 3. 扩展 Shared Schema

**文件**: `packages/shared/src/schemas/todo.ts`

```typescript
// 新增日期范围查询参数 Schema
export const TodoDateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// 扩展 UpdateTodoSchema，允许更新更多字段
export const UpdateTodoSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  urgency: UrgencySchema.optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: TodoStatusSchema.optional(),
})

export type TodoDateRangeQuery = z.infer<typeof TodoDateRangeQuerySchema>
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>
```

### 4. 更新 Schema 导出

**文件**: `packages/shared/src/schemas/index.ts`

确保新增的 Schema 和类型被正确导出。

### 5. 重新构建 Shared 包

```bash
pnpm --filter @nanomail/shared build
```

---

## 验收标准

- [x] date-fns 安装成功，可以正常导入使用
- [x] Radix UI 组件安装成功
- [x] `TodoDateRangeQuerySchema` 和 `UpdateTodoSchema` 定义正确
- [x] 类型 `TodoDateRangeQuery` 和 `UpdateTodo` 可从 `@nanomail/shared` 导入
- [x] Shared 包构建成功，无类型错误

---

## 实现记录

**完成日期**: 2026-03-13

**安装的依赖**:
- `date-fns@^4.1.0` - 日期处理库
- `@radix-ui/react-select@^2.2.6` - 选择器组件
- `@radix-ui/react-popover@^1.1.15` - 弹出框组件
- `@radix-ui/react-dropdown-menu@^2.1.16` - 下拉菜单组件

**新增 Schema**:
- `TodoDateRangeQuerySchema` - 日期范围查询参数
- `UpdateTodoSchema` - Todo 更新字段验证（使用 .strict() 拒绝未知字段）

**测试覆盖**: 30 个测试用例全部通过

---

## 后续阶段

完成后进入 **Phase 2: 后端 API 扩展**
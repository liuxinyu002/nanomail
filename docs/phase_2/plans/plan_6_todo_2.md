# Plan 6 - Phase 2: 后端 API 扩展

> **阶段目标**: 新增 Todo CRUD 端点和日期范围查询支持
> **预估时间**: 1h
> **前置依赖**: Phase 1 完成（Shared Schema 已扩展）

---

## 任务上下文

当前后端 Todo API 仅支持基础的列表查询和创建。需要扩展以下能力：

1. **日期范围查询** - 支持按 `startDate`/`endDate` 筛选任务
2. **Todo 更新** - 支持 PATCH 更新 description、urgency、deadline、status
3. **Todo 删除** - 支持 DELETE 删除任务

---

## 现有代码参考

**文件**: `packages/backend/src/routes/todo.routes.ts`

当前路由结构（修改前需要理解）:
- `GET /api/todos` - 获取所有 todos（支持 status、urgency、emailId 筛选）
- `POST /api/todos` - 创建新 todo

---

## 任务清单

### 1. 扩展 GET /api/todos 支持日期范围查询

**文件**: `packages/backend/src/routes/todo.routes.ts`

```typescript
// GET /api/todos?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, status, urgency, emailId } = req.query

    // 日期范围筛选
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00Z`)
      const end = new Date(`${endDate}T23:59:59Z`)

      const todos = await todoRepository
        .createQueryBuilder('todo')
        .where('todo.deadline BETWEEN :start AND :end', { start, end })
        .orWhere('todo.deadline IS NULL')
        .orderBy('todo.deadline', 'ASC', 'NULLS LAST')
        .addOrderBy('todo.createdAt', 'ASC')
        .getMany()

      return res.json({ todos: formatTodos(todos) })
    }

    // 原有逻辑保持不变（status、urgency、emailId 筛选）
    // ...保留现有代码
  } catch (error) {
    next(error)
  }
})
```

### 2. 新增 PATCH /api/todos/:id 端点

```typescript
// PATCH /api/todos/:id - 更新 Todo
router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { description, urgency, deadline, status } = req.body

    // 验证请求体
    const validatedData = UpdateTodoSchema.parse(req.body)

    const todo = await todoRepository.findOne({ where: { id } })
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    // 更新字段
    if (validatedData.description !== undefined) todo.description = validatedData.description
    if (validatedData.urgency !== undefined) todo.urgency = validatedData.urgency
    if (validatedData.deadline !== undefined) todo.deadline = validatedData.deadline ? new Date(validatedData.deadline) : null
    if (validatedData.status !== undefined) todo.status = validatedData.status

    await todoRepository.save(todo)

    res.json(formatTodo(todo))
  } catch (error) {
    next(error)
  }
})
```

### 3. 新增 DELETE /api/todos/:id 端点

```typescript
// DELETE /api/todos/:id - 删除 Todo
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)

    const result = await todoRepository.delete(id)

    if (result.affected === 0) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})
```

---

## API 设计总结

| 端点 | 方法 | 参数 | 说明 |
|------|------|------|------|
| `/api/todos` | GET | `startDate`, `endDate` | 日期范围查询 |
| `/api/todos/:id` | PATCH | `description`, `urgency`, `deadline`, `status` | 更新 Todo |
| `/api/todos/:id` | DELETE | - | 删除 Todo，返回 204 |

---

## 验收标准

- [x] `GET /api/todos?startDate=2026-03-01&endDate=2026-03-31` 返回正确筛选结果
- [x] `PATCH /api/todos/:id` 支持更新 description/urgency/deadline/status
- [x] `DELETE /api/todos/:id` 正确删除并返回 204
- [x] 无效 ID 返回 404 错误
- [x] 请求体使用 Zod Schema 验证

---

## 实现记录

**完成日期**: 2026-03-13

**实现内容**:
1. `GET /api/todos` 支持日期范围查询（`startDate`/`endDate`），包含无 deadline 的 todos
2. `PATCH /api/todos/:id` 支持更新 description、urgency、deadline、status，使用 Zod 验证
3. `DELETE /api/todos/:id` 删除 todo，返回 204

**测试覆盖**: 28 个测试用例全部通过

**代码质量改进**:
- 提取 `formatTodo`、`applyFiltersToQueryBuilder`、`buildWhereClause` 辅助函数
- 添加完整的 JSDoc 文档注释

---

## 后续阶段

完成后进入 **Phase 3: 前端 Service 层扩展**
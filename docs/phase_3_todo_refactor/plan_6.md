# Plan 6: Todo Group Color Synchronization

> Part of: Phase 3 Todo Refactor

## Overview

实现 Todo 分组颜色同步功能，使 Board 列的颜色能够体现在 UI 的各个层面。采用**关系映射**架构，通过 JOIN 查询动态获取颜色，避免数据冗余和同步复杂度。

### 核心需求

| # | 需求 | 描述 |
|---|------|------|
| 1 | Board 列颜色 UI | 更改颜色时更新头部背景，移除颜色徽标 |
| 2 | Todo 颜色字段 | **API 响应中动态计算**，不物理存储 |
| 3 | Planner 颜色指示栏 | 左侧颜色条读取 Todo 的 color 字段 |

---

## Implementation Phases

| Phase | Description | File |
|-------|-------------|------|
| **Phase 0** | Shared Schema Updates | [plan_6_0.md](./plan_6_0.md) |
| **Phase 1** | Backend - Query with JOIN & DTO Formatting | [plan_6_1.md](./plan_6_1.md) |
| **Phase 2** | Frontend - ColumnHeader Redesign | [plan_6_2.md](./plan_6_2.md) |
| **Phase 3** | Frontend - BoardColumnDroppable Styling | [plan_6_3.md](./plan_6_3.md) |
| **Phase 4** | Frontend - PlannerTodoCard Update | [plan_6_4.md](./plan_6_4.md) |
| **Phase 5** | Frontend - Interaction Updates | [plan_6_5.md](./plan_6_5.md) |

---

## Architecture Comparison

### Original Approach (Deprecated)

```
┌──────────────────┐     ┌──────────────────┐
│   BoardColumn    │     │       Todo       │
├──────────────────┤     ├──────────────────┤
│ id               │     │ id               │
│ name             │     │ description      │
│ color ◄──────────┼─────┼─► color (copy)   │  ❌ 数据冗余
│ ...              │     │ boardColumnId    │
└──────────────────┘     └──────────────────┘

Problem: Column color change → Batch update all todos (O(n))
```

### New Approach (Recommended)

```
┌──────────────────┐     ┌──────────────────┐
│   BoardColumn    │     │       Todo       │
├──────────────────┤     ├──────────────────┤
│ id               │     │ id               │
│ name             │     │ description      │
│ color            │     │ boardColumnId ───┼──► JOIN → color (dynamic)
│ ...              │     │ ...              │
└──────────────────┘     └──────────────────┘

Benefit: Column color change → Update 1 record (O(1))
         API response: color from relation (no storage)
```

---

## Files Changed Summary

| File | Action | Phase |
|------|--------|-------|
| `packages/shared/src/schemas/todo.ts` | MODIFY | 0 |
| `packages/backend/src/routes/todo.routes.ts` | MODIFY | 1 |
| `packages/backend/src/entities/Todo.entity.ts` | VERIFY | 1 |
| `packages/frontend/src/features/todos/ColumnHeader.tsx` | MODIFY | 2 |
| `packages/frontend/src/features/todos/BoardColumnDroppable.tsx` | MODIFY | 3 |
| `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx` | MODIFY | 3 |
| `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx` | MODIFY | 4 |
| `packages/frontend/src/features/todos/BoardPanel.tsx` | MODIFY | 5 |
| `packages/frontend/src/hooks/useTodos.ts` | VERIFY | 5 |

---

## Implementation Order

推荐实施顺序：

0. **Phase 0** (Shared Schema) - 更新 Zod Schema，区分 Response/Payload
1. **Phase 1** (Backend JOIN Query) - 基础数据层，核心架构
2. **Phase 2** (ColumnHeader) - 可独立进行
3. **Phase 3** (BoardColumnDroppable) - UI 集成
4. **Phase 4** (PlannerTodoCard) - 可独立进行
5. **Phase 5** (Interaction Updates) - 集成测试

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| JOIN 查询性能 | Low | SQLite 适合小规模；TypeORM 关系查询优化 |
| 前后端颜色不一致 | Low | 前端使用 fallback 兜底 |
| 拖拽后颜色闪烁 | Low | invalidate refetch 或乐观更新 |
| 马卡龙色太浅影响可读性 | Low | 卡片保持纯白背景 + shadow-sm |

---

## Related Documents

- [Plan 5: Todo Card Detail Expansion](./plan_5.md)
- [Design System](../../SPEC/design-system.md)
- [Colors Constants](../../packages/frontend/src/constants/colors.ts)
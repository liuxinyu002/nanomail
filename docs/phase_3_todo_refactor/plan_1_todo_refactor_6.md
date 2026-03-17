# Plan 1: To-Do Module Refactoring - Phase 6: Code Cleanup

**Project**: NanoMail - Email client application
**Date**: 2026-03-17
**Phase**: 6 of 6
**Estimated Time**: 1-2 hours

---

## Context & Background

### Project Overview

Refactor the existing To-Do module from a simple urgency-based list view to a multi-panel interface with Inbox, Planner (calendar), and Kanban Board views, supporting drag-and-drop between views.

### Domain Model Changes

> **彻底重构模式**：废除旧的 `urgency` 枚举字段，将任务的优先级和状态完全交由看板的 `boardColumnId` 和物理位置 (`position`) 来决定。

**Before (Old Model)**:
```typescript
interface Todo {
  urgency: 'high' | 'medium' | 'low'  // ❌ 废弃
  // ...
}
```

**After (New Model)**:
```typescript
interface Todo {
  boardColumnId: number  // ✅ 任务状态由所在列决定
  position: number       // ✅ 列内排序
  // ...
}
```

### Default Column Structure

```typescript
const DEFAULT_COLUMNS = [
  { id: 1, name: '收件箱', order: 0, isSystem: true },  // Inbox
  { id: 2, name: '待处理', order: 1 },                   // Todo (原 high urgency)
  { id: 3, name: '进行中', order: 2 },                   // In Progress
  { id: 4, name: '已完成', order: 3 },                   // Done
]
```

---

## Objective

Remove all deprecated code related to the old `urgency` field and clean up any unused code after the refactoring is complete.

---

## Tasks

### Task 6.1: Backend Entity Cleanup

**File**: `packages/backend/src/entities/Todo.entity.ts`

Remove the `urgency` field:
```typescript
// ❌ REMOVE THIS FIELD
@Column({ type: 'text', nullable: true })
urgency!: string | null
```

**Migration Note**: If using TypeORM migrations, create a migration to drop the column:
```typescript
// In migration file
public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.dropColumn('todos', 'urgency')
}
```

### Task 6.2: Backend Routes Cleanup

**File**: `packages/backend/src/routes/todo.routes.ts`

Remove urgency-related code:

```typescript
// ❌ REMOVE: urgency filter in GET endpoint
if (urgency) {
  query = query.andWhere('todo.urgency = :urgency', { urgency })
}

// ❌ REMOVE: urgency in create/update validation
const { title, description, urgency, deadline, completed } = req.body

// ❌ REMOVE: urgency field in response mapping
return {
  id: todo.id,
  title: todo.title,
  urgency: todo.urgency,  // REMOVE
  // ...
}
```

### Task 6.3: Shared Schema Cleanup

**File**: `packages/shared/src/schemas/todo.ts`

Remove urgency from schema:
```typescript
// ❌ REMOVE THIS
urgency: z.enum(['high', 'medium', 'low']).optional()

// ❌ REMOVE THIS TYPE
export type TodoUrgency = 'high' | 'medium' | 'low'
```

**File**: `packages/shared/src/schemas/index.ts`

Remove urgency exports:
```typescript
// ❌ REMOVE if exists
export type { TodoUrgency } from './todo'
```

### Task 6.4: Frontend Component Cleanup

**Files to check**:
- `packages/frontend/src/features/todos/TodoItem.tsx`
- `packages/frontend/src/features/todos/TodoForm.tsx`
- `packages/frontend/src/pages/TodosPage.tsx`

Remove urgency-related UI:
```tsx
// ❌ REMOVE: urgency selector in forms
<Select name="urgency" label="Priority">
  <option value="high">High</option>
  <option value="medium">Medium</option>
  <option value="low">Low</option>
</Select>

// ❌ REMOVE: urgency badge in TodoItem
{todo.urgency && (
  <Badge variant={urgencyVariant[todo.urgency]}>
    {todo.urgency}
  </Badge>
)}

// ❌ REMOVE: urgency filter in TodosPage
const [urgencyFilter, setUrgencyFilter] = useState<string | null>(null)
```

### Task 6.5: Frontend Service Cleanup

**File**: `packages/frontend/src/services/todo.service.ts`

Remove urgency from API calls:
```typescript
// ❌ REMOVE: urgency parameter
async createTodo(data: { title: string; urgency?: string }): Promise<Todo>

// ✅ UPDATE: remove urgency
async createTodo(data: { title: string; boardColumnId?: number }): Promise<Todo>
```

### Task 6.6: Frontend Hook Cleanup

**File**: `packages/frontend/src/hooks/useTodos.ts`

Remove urgency-related logic:
```typescript
// ❌ REMOVE: urgency filter
const filteredTodos = useMemo(() => {
  return todos.filter(t => {
    if (urgencyFilter && t.urgency !== urgencyFilter) return false
    return true
  })
}, [todos, urgencyFilter])
```

### Task 6.7: Remove Old Tabs Component (if applicable)

**File**: `packages/frontend/src/features/todos/TodoTabs.tsx` (if exists)

If the old UI used a Tabs component that is no longer needed:
```bash
# Remove the file if completely replaced by ViewToggle
rm packages/frontend/src/features/todos/TodoTabs.tsx
```

Update exports in `index.ts`:
```typescript
// ❌ REMOVE
export { TodoTabs } from './TodoTabs'
```

### Task 6.8: Database Migration (Production)

**Important**: For production deployment, create a proper migration:

**File**: `packages/backend/src/migrations/{timestamp}-RemoveUrgencyField.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveUrgencyField1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Migrate data (if not already done)
    // High urgency -> Column 2 (待处理)
    // Medium/Low urgency -> Column 1 (收件箱)
    await queryRunner.query(`
      UPDATE todos
      SET board_column_id = CASE
        WHEN urgency = 'high' THEN 2
        ELSE 1
      END
      WHERE board_column_id IS NULL OR board_column_id = 1
    `)

    // Step 2: Drop the column
    await queryRunner.dropColumn('todos', 'urgency')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add urgency column
    await queryRunner.query(`
      ALTER TABLE todos ADD COLUMN urgency TEXT
    `)

    // Reverse migration (approximate)
    await queryRunner.query(`
      UPDATE todos
      SET urgency = CASE
        WHEN board_column_id = 2 THEN 'high'
        WHEN board_column_id = 3 THEN 'medium'
        WHEN board_column_id = 4 THEN 'low'
        ELSE 'medium'
      END
    `)
  }
}
```

### Task 6.9: Search for Remaining References

Run a comprehensive search to find any remaining references:

```bash
# Search for urgency references
grep -r "urgency" packages/ --include="*.ts" --include="*.tsx"

# Search for old enum values
grep -r "'high'\|'medium'\|'low'" packages/ --include="*.ts" --include="*.tsx"
```

**Common places to check**:
- Test files
- Mock data
- Constants files
- Type definitions
- Comments and documentation

### Task 6.10: Update Documentation

**Files to update**:
- `README.md` (if mentions urgency)
- API documentation
- Component documentation
- Any inline comments referencing urgency

---

## Cleanup Checklist

### Backend

| File | Action | Status |
|------|--------|--------|
| `entities/Todo.entity.ts` | Remove `urgency` field | ☐ |
| `routes/todo.routes.ts` | Remove urgency filter/param | ☐ |
| `migrations/` | Create migration (prod) | ☐ |

### Shared

| File | Action | Status |
|------|--------|--------|
| `schemas/todo.ts` | Remove urgency from schema | ☐ |
| `schemas/index.ts` | Remove urgency exports | ☐ |

### Frontend

| File | Action | Status |
|------|--------|--------|
| `features/todos/TodoItem.tsx` | Remove urgency badge | ☐ |
| `features/todos/TodoForm.tsx` | Remove urgency selector | ☐ |
| `pages/TodosPage.tsx` | Remove urgency filter | ☐ |
| `services/todo.service.ts` | Remove urgency param | ☐ |
| `hooks/useTodos.ts` | Remove urgency logic | ☐ |
| `features/todos/TodoTabs.tsx` | Delete if unused | ☐ |

### Tests

| File | Action | Status |
|------|--------|--------|
| `*.test.ts` | Update tests for new model | ☐ |
| `*.spec.ts` | Update E2E tests | ☐ |

---

## Verification Steps

After cleanup, verify:

1. **Build succeeds**:
   ```bash
   pnpm build
   ```

2. **No TypeScript errors**:
   ```bash
   pnpm --filter @nanomail/backend typecheck
   pnpm --filter @nanomail/frontend typecheck
   ```

3. **No remaining references**:
   ```bash
   grep -r "urgency" packages/ --include="*.ts" --include="*.tsx"
   # Should return no results (or only comments/docs)
   ```

4. **Tests pass**:
   ```bash
   pnpm test
   ```

5. **Application works**:
   - Create new todo → defaults to Inbox
   - Drag todo between columns
   - No console errors about missing fields

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `entities/Todo.entity.ts` | MODIFY | Remove urgency field |
| `routes/todo.routes.ts` | MODIFY | Remove urgency filter/param |
| `schemas/todo.ts` | MODIFY | Remove urgency from schema |
| `schemas/index.ts` | MODIFY | Remove urgency exports |
| `features/todos/TodoItem.tsx` | MODIFY | Remove urgency badge |
| `features/todos/TodoForm.tsx` | MODIFY | Remove urgency selector |
| `pages/TodosPage.tsx` | MODIFY | Remove urgency filter |
| `services/todo.service.ts` | MODIFY | Remove urgency param |
| `hooks/useTodos.ts` | MODIFY | Remove urgency logic |
| `migrations/{timestamp}-RemoveUrgencyField.ts` | CREATE | Production migration |

---

## Success Criteria

1. No `urgency` field references in codebase (except docs/comments)
2. Build succeeds without errors
3. All tests pass
4. Application functions correctly with new column-based model
5. Database migration ready for production deployment
6. No TypeScript errors related to removed types

---

## Dependencies

- **Requires**: All previous phases (1-5) must be complete
- **Final Step**: This is the last phase of the refactoring

---

## Post-Cleanup Summary

After completing all 6 phases:

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Backend Foundation | ☐ |
| Phase 2 | Frontend DnD Setup | ☐ |
| Phase 3 | UI Components | ☐ |
| Phase 4 | Service Layer Updates | ☐ |
| Phase 5 | Integration and Testing | ☐ |
| Phase 6 | Code Cleanup | ☐ |

**Total Estimated Time**: 19-25 hours

The To-Do module refactoring is complete when all phases are finished and verified.
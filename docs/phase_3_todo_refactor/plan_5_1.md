# Plan 5.1: Schema & Entity Updates

> Part of: Plan 5 - Todo Card Detail Expansion
> Phase: 1 of 6

## Context

This phase establishes the data foundation for the Todo Card Detail Expansion feature. We need to add a `notes` field to the Todo schema and entity to support user-added additional information for todo items.

### Overall Feature Requirements

| Field | Type | Max Length | Edit Mode | Save Trigger |
|-------|------|------------|-----------|--------------|
| `description` | text | 2000 | Instant edit | Blur (if changed) |
| `notes` | text | 2000 | Instant edit | Blur (if changed) |
| `deadline` | datetime | - | Date picker | Selection (onChange) |

### View-Specific Behavior

| View | Editable | Delete Icon | Empty Field Display |
|------|----------|-------------|---------------------|
| INBOX | Yes | Yes | Placeholder |
| Board | Yes | Yes | Placeholder |
| Planner | No | No | Hide or "-" |

---

## Dependencies

- No prerequisites - this is the first phase
- **Blocks**: All subsequent phases depend on this schema update

---

## Tasks

### Task 1.1: Add notes to Todo Schema

**File**: `packages/shared/src/schemas/todo.ts`

**Action**: Add notes field to schema

```typescript
export const TodoSchema = z.object({
  id: z.number().int().positive(),
  emailId: z.number().int().positive(),
  description: z.string().min(1).max(2000),
  notes: z.string().max(2000).nullable().default(null), // NEW
  status: TodoStatusSchema,
  deadline: z.string().datetime().nullable(),
  boardColumnId: z.number().int().positive().default(1),
  position: z.number().int().optional(),
  createdAt: z.coerce.date()
})

export const UpdateTodoSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  notes: z.string().max(2000).nullable().optional(), // NEW
  deadline: z.string().datetime().nullable().optional(),
  status: TodoStatusSchema.optional(),
  boardColumnId: z.number().int().positive().optional(),
  position: z.number().int().optional()
}).strict()
```

**Verification**: TypeScript compilation succeeds after changes.

**Risk**: Low

---

### Task 1.2: Add notes to Todo Entity

**File**: `packages/backend/src/entities/Todo.entity.ts`

**Action**: Add notes column

```typescript
@Entity('todos')
export class Todo {
  // ... existing fields ...

  /**
   * Optional notes for the todo item
   * User-added additional information, max 2000 characters
   */
  @Column({ type: 'text', nullable: true })
  notes!: string | null

  // ... rest of entity ...
}
```

**Note**: SQLite + TypeORM with `synchronize: true` will auto-sync the schema.

**Verification**: Backend starts without errors.

**Risk**: Low

---

### Task 1.3: Rebuild shared package

**Command**: `pnpm --filter @nanomail/shared build`

**Action**: Rebuild shared package to propagate schema changes to frontend and backend.

**Verification**: No TypeScript errors in frontend and backend after import.

**Risk**: Low

---

## Files Changed

| File | Action |
|------|--------|
| `packages/shared/src/schemas/todo.ts` | MODIFY |
| `packages/backend/src/entities/Todo.entity.ts` | MODIFY |

---

## Testing Checklist

- [ ] `notes` field added to TodoSchema
- [ ] `notes` field added to UpdateTodoSchema
- [ ] Todo entity has notes column
- [ ] Database syncs new column automatically
- [ ] Frontend can import updated Todo type
- [ ] Backend compiles with new entity field

---

## Next Phase

After completing this phase, proceed to [Plan 5.3: Delete Icon Replacement](./plan_5_3.md) (recommended order) or [Plan 5.2: TaskDetailExpand Component](./plan_5_2.md).
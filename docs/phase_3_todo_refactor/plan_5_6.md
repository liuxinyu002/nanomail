# Plan 5.6: API Updates

> Part of: Plan 5 - Todo Card Detail Expansion
> Phase: 6 of 6

## Context

This phase verifies that the backend API correctly handles the new `notes` field. The existing `PATCH /api/todos/:id` endpoint should already support the field if the `UpdateTodoSchema` was updated correctly in Phase 1.

### API Endpoint

| Endpoint | Method | Purpose | Schema |
|----------|--------|---------|--------|
| `/api/todos/:id` | PATCH | Update todo fields | `UpdateTodoSchema` |

### Expected Request Body

```json
{
  "description": "Updated description (optional)",
  "notes": "User notes or null (optional)",
  "deadline": "2024-12-31T23:59:59.999Z or null (optional)",
  "status": "pending | completed | in_progress (optional)",
  "boardColumnId": 1 (optional),
  "position": 0 (optional)
}
```

---

## Dependencies

- **Requires**:
  - [Plan 5.1: Schema & Entity Updates](./plan_5_1.md) - Updated schemas
  - [Plan 5.5: View Integration](./plan_5_5.md) - Frontend using the API

---

## Tasks

### Task 6.1: Verify Todo Routes

**File**: `packages/backend/src/routes/todo.routes.ts`

**Action**: Ensure update endpoint accepts notes field

**Verification Steps**:

1. Locate the `PATCH /api/todos/:id` route handler
2. Verify it uses `UpdateTodoSchema` for request body validation
3. Verify the todo service/entity passes through the `notes` field

**Expected Code Pattern**:

```typescript
// Route handler should validate with UpdateTodoSchema
router.patch('/:id', async (req, res) => {
  const validatedData = UpdateTodoSchema.parse(req.body)
  // validatedData.notes should be available
  const updatedTodo = await todoService.update(req.params.id, validatedData)
  res.json(updatedTodo)
})
```

**Note**: If the route already uses `UpdateTodoSchema.parse(req.body)`, no changes needed. The schema update in Phase 1 automatically adds `notes` to the validation.

**Risk**: Low

---

### Task 6.2: Test API Endpoint

**Action**: Manual verification of API endpoint

**Test Cases**:

1. **Update notes**:
   ```bash
   curl -X PATCH http://localhost:3000/api/todos/1 \
     -H "Content-Type: application/json" \
     -d '{"notes": "Test note"}'
   ```

2. **Clear notes**:
   ```bash
   curl -X PATCH http://localhost:3000/api/todos/1 \
     -H "Content-Type: application/json" \
     -d '{"notes": null}'
   ```

3. **Update multiple fields**:
   ```bash
   curl -X PATCH http://localhost:3000/api/todos/1 \
     -H "Content-Type: application/json" \
     -d '{"description": "Updated", "notes": "New note", "deadline": "2024-12-31T23:59:59.999Z"}'
   ```

**Verification**: All requests return updated todo with correct field values.

**Risk**: Low

---

## Files Changed

| File | Action |
|------|--------|
| `packages/backend/src/routes/todo.routes.ts` | VERIFY (no changes expected) |

---

## Testing Checklist

### API
- [ ] `PATCH /api/todos/:id` accepts `notes` field
- [ ] `notes` field is persisted to database
- [ ] `notes` can be set to `null`
- [ ] Invalid data rejected (e.g., notes > 2000 chars)
- [ ] Response includes updated `notes` value

### Integration
- [ ] Frontend can save notes via API
- [ ] Notes persist across page refresh
- [ ] Error handling works (revert on failure)

---

## Implementation Complete

After completing this phase, the Todo Card Detail Expansion feature is fully implemented.

### Summary of All Phases

| Phase | Description | Status |
|-------|-------------|--------|
| [5.1](./plan_5_1.md) | Schema & Entity Updates | |
| [5.2](./plan_5_2.md) | TaskDetailExpand Component | |
| [5.3](./plan_5_3.md) | Delete Icon Replacement | |
| [5.4](./plan_5_4.md) | TodoCard Integration | |
| [5.5](./plan_5_5.md) | View Integration | |
| [5.6](./plan_5_6.md) | API Updates | |

### Recommended Implementation Order

1. Phase 1: Schema & Entity (foundation)
2. Phase 3: Delete Icon (simple, independent)
3. Phase 2: TaskDetailExpand (core component)
4. Phase 4: TodoCard Integration
5. Phase 5: View Integration
6. Phase 6: API verification

---

## Related Documents

- [Plan 4: Todo Card Redesign](./plan_4_4.md)
- [Plan 5: Drag vs Expand Conflict](./plan_4_5.md)
- [Design System](../../SPEC/design-system.md)
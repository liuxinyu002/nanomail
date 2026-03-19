# Plan 5.5: View Integration

> Part of: Plan 5 - Todo Card Detail Expansion
> Phase: 5 of 6

## Context

This phase integrates the updated TodoCard component into all three views: INBOX, Board, and Planner. Each view has different requirements for editability and delete functionality.

### View-Specific Behavior

| View | Editable | Delete Icon | Empty Field Display | Integration File |
|------|----------|-------------|---------------------|------------------|
| INBOX | Yes | Yes | Placeholder | `InboxPanel.tsx` |
| Board | Yes | Yes | Placeholder | `DraggableTodoItem.tsx` |
| Planner | No | No | Hide or "-" | `PlannerTodoCard.tsx` |

### Save Handler Pattern

All editable views need to implement three save handlers:
1. `onSaveDescription(todoId, value)` - Save description on blur
2. `onSaveNotes(todoId, value)` - Save notes on blur
3. `onSaveDeadline(todoId, value)` - Save deadline on change

---

## Dependencies

- **Requires**: [Plan 5.4: TodoCard Integration](./plan_5_4.md) - Updated TodoCard component

---

## Tasks

### Task 5.1: INBOX Integration

**File**: `packages/frontend/src/features/todos/InboxPanel.tsx`

**Action**: Add save handlers and connect to API

**Changes Required**:

1. Import the updated TodoCard component
2. Add mutation handlers for saving todo fields
3. Pass handlers to TodoCard

```tsx
// Add mutation handlers for saving todo fields
const handleSaveDescription = async (todoId: number, description: string) => {
  await updateTodo(todoId, { description })
}

const handleSaveNotes = async (todoId: number, notes: string | null) => {
  await updateTodo(todoId, { notes })
}

const handleSaveDeadline = async (todoId: number, deadline: string | null) => {
  await updateTodo(todoId, { deadline })
}

// In TodoCard usage
<TodoCard
  todo={todo}
  onToggle={() => handleToggle(todo.id)}
  onDelete={() => handleDelete(todo.id)}
  onSaveDescription={(value) => handleSaveDescription(todo.id, value)}
  onSaveNotes={(value) => handleSaveNotes(todo.id, value)}
  onSaveDeadline={(value) => handleSaveDeadline(todo.id, value)}
  readonly={false}
/>
```

**Note**: The `updateTodo` function should be an existing mutation or API call. Verify it uses the `UpdateTodoSchema` which now includes `notes`.

**Verification**: INBOX cards expand with full edit capability.

**Risk**: Medium

---

### Task 5.2: Planner Integration (Read-only)

**File**: `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx`

**Action**: Use TodoCard with readonly mode

**Changes Required**:

1. Import the updated TodoCard component
2. Pass `readonly={true}` to disable editing
3. Do not pass `onDelete` (no delete in Planner)

```tsx
<TodoCard
  todo={todo}
  onToggle={() => handleToggle(todo.id)}
  readonly={true}
/>
```

**Behavior**:
- No delete button shown
- No edit capability
- Empty fields hide or show "-"

**Verification**: Planner cards expand read-only, no delete icon.

**Risk**: Low

---

### Task 5.3: Board Integration

**File**: `packages/frontend/src/features/todos/DraggableTodoItem.tsx`

**Action**: Pass save handlers through to TodoCard

**Changes Required**:

1. Accept save handler props from parent
2. Pass handlers to TodoCard

```tsx
interface DraggableTodoItemProps {
  todo: Todo
  onToggle: () => void
  onDelete: () => void
  onSaveDescription: (value: string) => void
  onSaveNotes: (value: string | null) => void
  onSaveDeadline: (value: string | null) => void
}

// Same as INBOX - full edit capability
<TodoCard
  todo={todo}
  onToggle={onToggle}
  onDelete={onDelete}
  onSaveDescription={onSaveDescription}
  onSaveNotes={onSaveNotes}
  onSaveDeadline={onSaveDeadline}
  readonly={false}
/>
```

**Note**: The parent component (Board/Column) will need to implement the save handlers similar to INBOX.

**Verification**: Board cards expand with full edit capability.

**Risk**: Low

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/InboxPanel.tsx` | MODIFY |
| `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx` | MODIFY |
| `packages/frontend/src/features/todos/DraggableTodoItem.tsx` | MODIFY |

---

## Testing Checklist

### INBOX
- [ ] Cards expand with full edit capability
- [ ] Description field is editable
- [ ] Notes field is editable
- [ ] Deadline picker works
- [ ] Delete icon shows and works
- [ ] Changes persist after save

### Board
- [ ] Cards expand with full edit capability
- [ ] All fields editable (same as INBOX)
- [ ] Delete icon shows and works
- [ ] Drag and drop still works
- [ ] Changes persist after save

### Planner
- [ ] Cards expand read-only
- [ ] No delete icon shown
- [ ] Empty fields hide or show "-"
- [ ] Checkbox still works for toggle
- [ ] No edit capability

---

## Next Phase

After completing this phase, proceed to [Plan 5.6: API Updates](./plan_5_6.md).
# Phase 4.3: Smart To-Do Dashboard(todo)

> **Part of Phase 4: Frontend Interaction & Workspace**

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 4 of 5 |
| **Task Group** | T12 (Part 3 of 4) |
| **Focus Area** | Task management, urgency grouping, completion toggling |
| **Total Tasks** | 2 subtasks |
| **Dependencies** | Phase 4.1 (T10: UI Layout) |
| **Estimated Effort** | 0.5-1 day |

---

## Context

The independent Kanban-style or list-style board for extracted Action Items. Users manage their tasks here, organized by urgency levels (High, Medium, Low). The design should be minimalist with subtle visual indicators for priority.

---

## T12.1: To-Do List with Urgency Grouping

### Description
Fetch and render To-Dos from `/api/todos`, grouped or sorted by urgency (High, Med, Low). Use minimalist visual design.

### Implementation Notes

```tsx
const TodoPage: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([])
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const COMPLETED_LIMIT = 10

  const { high, medium, low, completed } = useMemo(() => {
    const active = todos.filter(t => t.status !== 'completed')
    const done = todos.filter(t => t.status === 'completed')
    return {
      high: active.filter(t => t.urgency === 'high'),
      medium: active.filter(t => t.urgency === 'medium'),
      low: active.filter(t => t.urgency === 'low'),
      completed: done
    }
  }, [todos])

  // Limit completed items to prevent DOM bloat
  const displayedCompleted = showAllCompleted
    ? completed
    : completed.slice(0, COMPLETED_LIMIT)

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">To-Do</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* High Priority - minimal visual with left border accent */}
        <TodoColumn
          title="High Priority"
          todos={high}
          priority="high"
          icon={<AlertCircle />}
        />

        {/* Medium Priority */}
        <TodoColumn
          title="Medium"
          todos={medium}
          priority="medium"
          icon={<Clock />}
        />

        {/* Low Priority */}
        <TodoColumn
          title="Low"
          todos={low}
          priority="low"
          icon={<MinusCircle />}
        />
      </div>

      {/* Completed - limited display */}
      {completed.length > 0 && (
        <div className="mt-8">
          <TodoColumn
            title="Completed"
            todos={displayedCompleted}
            priority="completed"
            icon={<CheckCircle />}
            collapsible
          />
          {completed.length > COMPLETED_LIMIT && !showAllCompleted && (
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => setShowAllCompleted(true)}
            >
              Load More ({completed.length - COMPLETED_LIMIT} remaining)
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Minimalist TodoColumn with subtle priority indication
const TodoColumn: React.FC<{
  title: string
  todos: Todo[]
  priority: 'high' | 'medium' | 'low' | 'completed'
  icon: React.ReactNode
  collapsible?: boolean
}> = ({ title, todos, priority, icon, collapsible }) => {
  // Border-left colors for priority indication
  const borderColors = {
    high: 'border-l-red-500',
    medium: 'border-l-amber-500',
    low: 'border-l-blue-500',
    completed: 'border-l-muted-foreground'
  }

  // Badge variants for priority
  const badgeVariants = {
    high: 'bg-red-500/10 text-red-500',
    medium: 'bg-amber-500/10 text-amber-500',
    low: 'bg-blue-500/10 text-blue-500',
    completed: 'bg-muted text-muted-foreground'
  }

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-medium">{title}</h3>
        <Badge variant="secondary" className={badgeVariants[priority]}>
          {todos.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {todos.map(todo => (
          <div
            key={todo.id}
            className={cn(
              'p-3 rounded bg-card border-l-2',
              borderColors[priority]
            )}
          >
            <TodoItem todo={todo} />
          </div>
        ))}
      </div>

      {todos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No tasks
        </p>
      )}
    </div>
  )
}
```

### Empty State Pattern

```tsx
const EmptyTodos: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <CheckSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
    <p className="text-muted-foreground/60 text-sm">No tasks yet</p>
    <p className="text-muted-foreground/40 text-xs mt-1">
      Process emails to extract action items
    </p>
  </div>
)

// Empty column placeholder
const EmptyColumn: React.FC<{ priority: string }> = ({ priority }) => (
  <p className="text-sm text-muted-foreground/50 text-center py-4">
    No {priority} priority tasks
  </p>
)
```

### UI Requirements
- Minimalist design: remove hardcoded red/yellow/green backgrounds
- Unified column background: `bg-muted/50` (low saturation)
- Priority indication via:
  - Left border color (border-l-{color})
  - Small Badge component with subtle colors
- Completed column limited to 10 items with "Load More" button
- Prevents DOM bloat from unlimited completed items
- **Empty State**: When no todos at all, show minimal placeholder

### Deliverables
- [ ] Urgency-grouped columns with minimalist styling
- [ ] Border-left and Badge for priority distinction
- [ ] Responsive grid layout
- [ ] Completed column with limit and Load More
- [ ] **Empty state** for empty todo dashboard ("No tasks yet")
- [ ] Empty column placeholders for individual priority columns

---

## T12.2: Todo Completion Toggle

### Description
Wire up standard completion toggles to mark tasks as done in the database. Use **optimistic UI** pattern for instant user feedback.

### Implementation Notes

```tsx
interface TodoItemProps {
  todo: Todo
  onComplete: (id: number, completed: boolean) => void
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onComplete }) => {
  // Optimistic UI: local state for instant feedback
  const [localCompleted, setLocalCompleted] = useState(todo.status === 'completed')
  const [isRollingBack, setIsRollingBack] = useState(false)

  const handleToggle = async (checked: boolean) => {
    // 1. Optimistic update: UI responds instantly
    setLocalCompleted(checked)
    setIsRollingBack(false)

    try {
      // 2. Send request in background
      await api.updateTodo(todo.id, {
        status: checked ? 'completed' : 'pending'
      })
      onComplete(todo.id, checked)
    } catch (error) {
      // 3. Roll back on failure
      setLocalCompleted(!checked)
      setIsRollingBack(true)
      toast.error('Failed to update todo. Please try again.')

      // Clear rollback indicator after animation
      setTimeout(() => setIsRollingBack(false), 500)
    }
  }

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg bg-card transition-colors',
      isRollingBack && 'bg-red-500/10'
    )}>
      <Checkbox
        checked={localCompleted}
        onCheckedChange={handleToggle}
      />
      <div className="flex-1">
        <p className={cn(
          'text-sm transition-all',
          localCompleted && 'line-through text-muted-foreground'
        )}>
          {todo.description}
        </p>
        {todo.email_id && (
          <Link to={`/inbox?email=${todo.email_id}`} className="text-xs text-primary">
            View original email
          </Link>
        )}
      </div>
    </div>
  )
}
```

### Optimistic UI Pattern
- User clicks checkbox → UI **instantly** shows checked/struck-through state
- Request sent in background
- If request fails → Roll back UI + show Toast notification
- Creates "instant response" feel, making the app feel extremely fast

### Deliverables
- [ ] Checkbox toggle component with optimistic UI
- [ ] API integration for status update
- [ ] Visual feedback for completion (instant)
- [ ] Rollback mechanism on failure with Toast
- [ ] Link to source email

---

## Completion Checklist

### T12.1: To-Do List with Urgency Grouping
- [ ] Urgency-grouped columns with minimalist styling
- [ ] Unified bg-muted/50 background (no red/yellow/green)
- [ ] Border-left and Badge for priority distinction
- [ ] Completed column limited to 10 items
- [ ] Load More button for additional completed items
- [ ] **Empty state** for empty todo dashboard ("No tasks yet")
- [ ] **Empty column placeholders** for individual priority columns

### T12.2: Todo Completion Toggle
- [ ] Checkbox toggle component with optimistic UI
- [ ] API integration for status update
- [ ] Visual feedback for completion (instant)
- [ ] Rollback mechanism on failure with Toast
- [ ] Link to source email

---

## Dependencies for Next Phase

This phase must be completed before:
- **Phase 4.4 (T13)**: Agent Intent Editor uses todos as context for AI replies

---

## Previous Phase

← [Phase 4.2: Vibe Inbox & AI Trigger](./plan_4_2.md)

## Next Phase

→ [Phase 4.4: Agent Intent Editor](./plan_4_4.md)
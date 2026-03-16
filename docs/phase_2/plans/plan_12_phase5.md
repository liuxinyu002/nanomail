# Plan 12 Phase 5: TodoItem Navigation Update

**File:** `packages/frontend/src/features/todos/TodoItem.tsx`

**Dependencies:** None (can start in parallel)

---

## Objective

Update TodoItem to navigate with router state instead of opening AssistReplySheet, enabling clean URLs and seamless transition to Inbox with AI assist.

---

## Changes

### 1. Remove AssistReplySheet Imports

```typescript
// REMOVE these imports
import { AssistReplySheet } from './AssistReplySheet'
```

### 2. Update Button Handler

**Before:**
```typescript
<Button onClick={() => setIsAssistSheetOpen(true)}>Assist Reply</Button>
<AssistReplySheet open={isAssistSheetOpen} ... />
```

**After:**
```typescript
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

<Button onClick={() => {
  navigate(`/inbox/${todo.emailId}`, {
    state: {
      action: 'assist_reply',
      instruction: todo.description
    }
  })
}}>
  Assist Reply
</Button>
```

### 3. Remove State Management

Remove unnecessary state:
```typescript
// REMOVE
const [isAssistSheetOpen, setIsAssistSheetOpen] = useState(false)
```

---

## Full Implementation Example

```typescript
import { useNavigate } from 'react-router-dom'

export function TodoItem({ todo }: TodoItemProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-2">
      {/* Other todo content */}

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          navigate(`/inbox/${todo.emailId}`, {
            state: {
              action: 'assist_reply',
              instruction: todo.description
            }
          })
        }}
      >
        Assist Reply
      </Button>
    </div>
  )
}
```

---

## Benefits of Router State

| Aspect | URL Query Params | Router State |
|--------|-----------------|--------------|
| Clean URLs | ❌ Long query strings | ✅ Clean paths (`/inbox/123`) |
| Special characters | ❌ Encoding issues | ✅ Native support |
| Sharing URLs | ❌ Confusing AI state | ✅ No AI state in shared links |
| Browser refresh | ❌ State persists unexpectedly | ✅ Clean state (expected UX) |

---

## Testing

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom'

describe('TodoItem', () => {
  it('should navigate to inbox with router state on Assist Reply click', async () => {
    const history = createMemoryHistory()
    const mockTodo = {
      id: 1,
      emailId: 123,
      description: 'Reply about the meeting tomorrow'
    }

    render(
      <Router history={history}>
        <TodoItem todo={mockTodo} />
      </Router>
    )

    await userEvent.click(screen.getByText('Assist Reply'))

    // Verify navigation
    expect(history.location.pathname).toBe('/inbox/123')

    // Verify router state
    expect(history.location.state).toEqual({
      action: 'assist_reply',
      instruction: 'Reply about the meeting tomorrow'
    })

    // Verify clean URL (no query params)
    expect(history.location.search).toBe('')
  })

  it('should not have AssistReplySheet component', () => {
    render(<TodoItem todo={mockTodo} />)
    // Verify AssistReplySheet is not rendered
    expect(screen.queryByText(/AI Assist Reply/i)).not.toBeInTheDocument()
  })
})
```
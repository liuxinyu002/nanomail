# Plan 12 Phase 4: InboxPage State Parsing

**File:** `packages/frontend/src/features/inbox/InboxPage.tsx`

**Dependencies:** None (can start in parallel with Phase 1-2)

---

## Objective

Parse router state to detect AI assist reply action and pass appropriate props to ComposeEmailModal.

---

## Problem Solved

Using URL Query Params (?instruction=xxx) for long text causes:
- URL overflow with long instructions
- Special character truncation
- Sharing state confusion (stale AI state in shared links)

Now using React Router's implicit state passing for clean URLs.

---

## Changes

### 1. Import Router Hooks

```typescript
import { useLocation, useNavigate } from 'react-router-dom'
```

### 2. Parse Router State

```typescript
const location = useLocation()
const navigate = useNavigate()

// Parse router state
const { action, instruction } = (location.state as {
  action?: string
  instruction?: string
}) ?? {}
```

### 3. Auto-open Modal on Assist Reply Action

```typescript
// When action=assist_reply, auto-open modal
useEffect(() => {
  if (action === 'assist_reply' && activeId) {
    setComposeOpen(true)
    // Clear state after handling to prevent re-trigger on refresh
    window.history.replaceState({}, '', location.pathname)
  }
}, [action, activeId, location.pathname])
```

### 4. Fetch Email for Sender Info

```typescript
// Fetch email to get sender for To field
const { data: email } = useQuery({
  queryKey: ['email', activeId],
  queryFn: () => emailApi.getEmail(activeId!),
  enabled: !!activeId && action === 'assist_reply'
})
```

### 5. Pass Props to ComposeEmailModal

```typescript
<ComposeEmailModal
  open={composeOpen}
  onOpenChange={setComposeOpen}
  emailId={activeId}
  initialInstruction={instruction}
  sender={email?.from}
/>
```

---

## Full Implementation Example

```typescript
export function InboxPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeId, setActiveId] = useState<number | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)

  // Parse router state
  const { action, instruction } = (location.state as {
    action?: string
    instruction?: string
  }) ?? {}

  // Fetch email when action is assist_reply
  const { data: email } = useQuery({
    queryKey: ['email', activeId],
    queryFn: () => emailApi.getEmail(activeId!),
    enabled: !!activeId && action === 'assist_reply'
  })

  // Auto-open modal for assist reply action
  useEffect(() => {
    if (action === 'assist_reply' && activeId) {
      setComposeOpen(true)
      // Clear state to prevent re-trigger on refresh
      window.history.replaceState({}, '', location.pathname)
    }
  }, [action, activeId, location.pathname])

  return (
    <div>
      {/* Email list and detail views */}
      {/* ... */}

      <ComposeEmailModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        emailId={activeId ?? undefined}
        initialInstruction={instruction}
        sender={email?.from}
      />
    </div>
  )
}
```

---

## Benefits of Router State

| Aspect | URL Query Params | Router State |
|--------|-----------------|--------------|
| Clean URLs | ❌ Long query strings | ✅ Clean paths |
| Special characters | ❌ Encoding issues | ✅ Native support |
| Sharing URLs | ❌ Confusing AI state | ✅ No state in shared links |
| Browser refresh | ❌ State persists | ✅ Clean state (expected UX) |
| Bookmarks | ❌ Stale AI state | ✅ Normal behavior |

---

## Testing

### Unit Tests

```typescript
describe('InboxPage', () => {
  it('should parse action and instruction from router state', () => {
    // Mock location.state with assist_reply action
    // Verify modal opens with correct props
  })

  it('should clear router state after opening modal', async () => {
    // Mock router state
    // Verify replaceState is called
  })

  it('should pass sender to ComposeEmailModal', async () => {
    // Mock email fetch
    // Verify sender prop is passed
  })
})
```

### Integration Tests

```typescript
describe('TodoItem → InboxPage flow', () => {
  it('should navigate with router state on Assist Reply click', async () => {
    render(<TodoItem todo={mockTodo} />)
    await userEvent.click(screen.getByText('Assist Reply'))

    // Verify navigation to /inbox/:emailId
    // Verify router state contains action and instruction
    // Verify URL is clean (no query params)
  })

  it('should open ComposeEmailModal with pre-filled instruction', async () => {
    // Navigate with router state
    // Verify modal is open
    // Verify instruction is pre-filled
  })
})
```
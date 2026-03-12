# Phase 4.2: Vibe Inbox & AI Trigger

> **Part of Phase 4: Frontend Interaction & Workspace**

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 4 of 5 |
| **Task Group** | T11 (Part 2 of 4) |
| **Focus Area** | Email list, multi-select, AI processing trigger, email details |
| **Total Tasks** | 3 subtasks |
| **Dependencies** | Phase 4.1 (T10: UI Layout) |
| **Estimated Effort** | 1 day |

---

## Context

The frameless email list and the manual AI dispatch mechanism. This is the primary user interaction point where users view emails, select multiple items for AI processing, and view AI-generated summaries and action items.

---

## T11.1: Inbox List Component

### Description
Render the inbox list fetching from `/api/emails`. Design as frameless cards (Sender, Title, multi-line snippet).

### Implementation Notes

```tsx
interface EmailCardProps {
  email: {
    id: number
    sender: string
    subject: string
    snippet: string
    date: Date
    is_processed: boolean
  }
  selected: boolean
  onSelect: (id: number) => void
  selectionDisabled?: boolean // For max selection limit
}

const EmailCard: React.FC<EmailCardProps> = ({
  email,
  selected,
  onSelect,
  selectionDisabled = false
}) => {
  return (
    <div
      className={cn(
        'p-4 rounded-lg transition-colors cursor-pointer',
        selected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
      )}
      onClick={() => !selectionDisabled && onSelect(email.id)}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(email.id)}
          disabled={selectionDisabled}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate">{email.sender}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeDate(email.date)}
            </span>
          </div>
          <p className="text-sm font-medium truncate">{email.subject}</p>
          {/* Multi-line truncation with line-clamp-2 (shows ~80-100 chars) */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {email.snippet}
          </p>
        </div>
      </div>
    </div>
  )
}
```

### Empty State Pattern

```tsx
const EmptyInbox: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Inbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
    <p className="text-muted-foreground/60 text-sm">Your inbox is clear</p>
  </div>
)

// Usage in InboxPage
{emails.length === 0 ? (
  <EmptyInbox />
) : (
  <div className="space-y-2">
    {emails.map(email => <EmailCard key={email.id} {...} />)}
  </div>
)}
```

### UI Requirements
- Frameless card design (no borders, subtle hover)
- Use Tailwind `line-clamp-2` for natural multi-line text truncation
- Consistent card height with 2-line snippet display (~80-100 characters)
- Visual indicator for processed/unprocessed emails
- Spam emails visually muted
- Responsive grid layout
- **Empty State**: When no emails, show minimal placeholder (faded icon + text)

### Deliverables
- [ ] Email card component with line-clamp-2 snippet
- [ ] Inbox list with pagination
- [ ] API integration for fetching emails
- [ ] Loading and error states
- [ ] **Empty state** with faded icon + "Your inbox is clear" message

---

## T11.2: Multi-Select & AI Action Button

### Description
Implement multi-select checkboxes (enforce max 5 limit with visual blocking) and a floating "Run AI" action button calling `/api/process-emails`.

### Implementation Notes

```tsx
const InboxPage: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [processing, setProcessing] = useState(false)
  const MAX_SELECTION = 5

  const handleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_SELECTION) {
        next.add(id)
      }
      return next
    })
  }

  // Check if selection is disabled for a specific email
  const isSelectionDisabled = (emailId: number) => {
    return selectedIds.size >= MAX_SELECTION && !selectedIds.has(emailId)
  }

  const handleRunAI = async () => {
    if (selectedIds.size === 0) return

    setProcessing(true)
    try {
      await api.processEmails(Array.from(selectedIds))
      toast.success('Emails queued for processing')
      setSelectedIds(new Set())
      refetchEmails()
    } catch (error) {
      toast.error('Failed to process emails')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="p-6">
      {/* Selection limit indicator */}
      {selectedIds.size > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          {selectedIds.size}/{MAX_SELECTION} emails selected
          {selectedIds.size >= MAX_SELECTION && (
            <span className="text-amber-500 ml-2">
              (Maximum reached)
            </span>
          )}
        </div>
      )}

      {/* Email list */}
      <div className="space-y-2">
        {emails.map(email => (
          <EmailCard
            key={email.id}
            email={email}
            selected={selectedIds.has(email.id)}
            onSelect={handleSelect}
            selectionDisabled={isSelectionDisabled(email.id)}
          />
        ))}
      </div>

      {/* Floating action button */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6">
          <Button onClick={handleRunAI} loading={processing}>
            Run AI ({selectedIds.size}/{MAX_SELECTION})
          </Button>
        </div>
      )}
    </div>
  )
}
```

### UI Requirements
- **Poka-yoke Design**: Disable unselected checkboxes when limit reached
- Visual feedback: Grayed-out checkboxes with `disabled` prop
- Selection counter showing X/5 format
- Warning text when maximum is reached
- No toast error for clicking disabled items (visual blocking is sufficient)

### Deliverables
- [ ] Multi-select with max 5 limit
- [ ] Dynamic checkbox disabling: `disabled={selectedIds.size >= 5 && !selectedIds.has(email.id)}`
- [ ] Visual feedback for selected count
- [ ] Floating action button
- [ ] Processing state handling

---

## T11.3: Collapsible Email Details

### Description
Build the collapsible dropdown component for processed emails to reveal the Summary and a lightweight, checkable To-Do list.

### Implementation Notes

```tsx
const EmailDetail: React.FC<{ email: Email }> = ({ email }) => {
  const [expanded, setExpanded] = useState(false)
  const [todos, setTodos] = useState<Todo[]>([])

  useEffect(() => {
    if (expanded && email.is_processed) {
      api.getTodos({ email_id: email.id }).then(setTodos)
    }
  }, [expanded, email.id, email.is_processed])

  if (!email.is_processed) return null

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm">
          {expanded ? 'Hide' : 'Show'} Details
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-4">
        {/* Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Summary</h4>
          <p className="text-sm">{email.summary}</p>
        </div>

        {/* Action Items */}
        {todos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Action Items</h4>
            {todos.map(todo => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
```

### Deliverables
- [ ] Collapsible component
- [ ] Summary display
- [ ] Todo list with checkboxes
- [ ] Toggle completion functionality

---

## Completion Checklist

### T11.1: Inbox List Component
- [ ] Email card component with line-clamp-2 snippet
- [ ] Inbox list with pagination
- [ ] API integration for fetching emails
- [ ] Loading and error states
- [ ] **Empty state** with faded icon + "Your inbox is clear" message

### T11.2: Multi-Select & AI Action
- [ ] Multi-select with max 5 limit
- [ ] Visual blocking for selection limit (disabled checkboxes)
- [ ] Selection counter (X/5)
- [ ] Run AI action button
- [ ] Processing state handling

### T11.3: Collapsible Email Details
- [ ] Collapsible component
- [ ] Summary display
- [ ] Todo list with checkboxes
- [ ] Toggle completion functionality

---

## Dependencies for Next Phase

This phase must be completed before:
- **Phase 4.3 (T12)**: Smart To-Do Dashboard (todos are created by AI processing)

---

## Previous Phase

← [Phase 4.1: UI Layout & Settings Dashboard](./plan_4_1.md)

## Next Phase

→ [Phase 4.3: Smart To-Do Dashboard](./plan_4_3.md)
# Phase 4: Frontend Interaction & Workspace

> **Context:** Build out the single-page application UI with a focus on a clean, minimalist "Vibe" aesthetic using Shadcn and Tailwind.

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 4 of 5 |
| **Focus Area** | React frontend, UI components, user interactions |
| **Total Tasks** | 8 subtasks across 4 task groups |
| **Dependencies** | Phase 3 (AI Engine & Agent Core) |
| **Estimated Effort** | 3-4 days |

---

## T10: UI Layout & Settings Dashboard

### Context
The base layout and the crucial configuration screen to enter keys. This is the first thing users see and must be intuitive.

### Dependencies
- **Requires**: T6 (Backend API Core) for settings persistence

### Tasks

#### T10.1: Main Layout Shell
Create the main layout shell (Sidebar navigation: Inbox, To-Do, Settings).

**Implementation Notes:**
```tsx
// Layout structure
const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r">
        <div className="p-4">
          <h1 className="text-xl font-bold">NanoMail</h1>
        </div>
        <nav className="p-4 space-y-2">
          <NavItem icon={<Inbox />} label="Inbox" path="/inbox" />
          <NavItem icon={<CheckSquare />} label="To-Do" path="/todos" />
          <NavItem icon={<Settings />} label="Settings" path="/settings" />
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

**UI Requirements:**
- Responsive sidebar (collapsible on mobile)
- Active route indication
- Clean typography and spacing
- Dark mode support (via Tailwind/Shadcn)

**Deliverables:**
- [ ] Main layout component with sidebar
- [ ] Navigation items with icons
- [ ] React Router setup
- [ ] Responsive design

---

#### T10.2: Settings Form
Build the Settings form allowing the user to input and save IMAP, SMTP, and LLM API keys.

**Implementation Notes:**
```tsx
interface SettingsForm {
  // IMAP
  imapHost: string
  imapPort: string
  imapUser: string
  imapPassword: string

  // SMTP
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string

  // LLM
  llmProvider: 'openai' | 'deepseek' | 'ollama'
  llmApiKey: string
  llmModel: string
  llmBaseUrl?: string
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsForm>(defaultSettings)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.saveSettings(settings)
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>IMAP Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* IMAP fields */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SMTP fields */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LLM Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* LLM provider selector */}
          {/* Dynamic fields based on provider */}
        </CardContent>
      </Card>

      <Button onClick={handleSave} loading={saving}>
        Save Settings
      </Button>
    </div>
  )
}
```

**Security Considerations:**
- Mask password fields
- Show connection test buttons
- Validate required fields before save
- Handle encrypted storage transparently

**Deliverables:**
- [ ] Settings form with all required fields
- [ ] LLM provider selector with dynamic fields
- [ ] Save functionality with API integration
- [ ] Connection test buttons (optional)

---

## T11: Vibe Inbox & AI Trigger

### Context
The frameless email list and the manual AI dispatch mechanism. This is the primary user interaction point.

### Dependencies
- **Requires**: T10 (UI Layout)

### Tasks

#### T11.1: Inbox List Component
Render the inbox list fetching from `/api/emails`. Design as frameless cards (Sender, Title, 15-char snippet).

**Implementation Notes:**
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
}

const EmailCard: React.FC<EmailCardProps> = ({ email, selected, onSelect }) => {
  return (
    <div
      className={cn(
        'p-4 rounded-lg transition-colors cursor-pointer',
        selected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
      )}
      onClick={() => onSelect(email.id)}
    >
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={() => onSelect(email.id)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate">{email.sender}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeDate(email.date)}
            </span>
          </div>
          <p className="text-sm font-medium truncate">{email.subject}</p>
          <p className="text-xs text-muted-foreground truncate">
            {email.snippet.slice(0, 15)}...
          </p>
        </div>
      </div>
    </div>
  )
}
```

**UI Requirements:**
- Frameless card design (no borders, subtle hover)
- Visual indicator for processed/unprocessed emails
- Spam emails visually muted
- Responsive grid layout

**Deliverables:**
- [ ] Email card component
- [ ] Inbox list with pagination
- [ ] API integration for fetching emails
- [ ] Loading and error states

---

#### T11.2: Multi-Select & AI Action Button
Implement multi-select checkboxes (enforce max 5 limit) and a floating "Run AI" action button calling `/api/process-emails`.

**Implementation Notes:**
```tsx
const InboxPage: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [processing, setProcessing] = useState(false)

  const handleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 5) {
        next.add(id)
      } else {
        toast.warning('Maximum 5 emails can be selected')
      }
      return next
    })
  }

  const handleRunAI = async () => {
    if (selectedIds.size === 0) return

    setProcessing(true)
    try {
      await api.processEmails(Array.from(selectedIds))
      toast.success('Emails queued for processing')
      setSelectedIds(new Set())
      // Refresh list
      refetchEmails()
    } catch (error) {
      toast.error('Failed to process emails')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="p-6">
      {/* Email list */}
      <div className="space-y-2">
        {emails.map(email => (
          <EmailCard
            key={email.id}
            email={email}
            selected={selectedIds.has(email.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Floating action button */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6">
          <Button onClick={handleRunAI} loading={processing}>
            Run AI ({selectedIds.size}/5)
          </Button>
        </div>
      )}
    </div>
  )
}
```

**Deliverables:**
- [ ] Multi-select with max 5 limit
- [ ] Visual feedback for selected count
- [ ] Floating action button
- [ ] Processing state handling

---

#### T11.3: Collapsible Email Details
Build the collapsible dropdown component for processed emails to reveal the Summary and a lightweight, checkable To-Do list.

**Implementation Notes:**
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

**Deliverables:**
- [ ] Collapsible component
- [ ] Summary display
- [ ] Todo list with checkboxes
- [ ] Toggle completion functionality

---

## T12: Smart To-Do Dashboard

### Context
The independent Kanban-style or list-style board for extracted Action Items. Users manage their tasks here.

### Dependencies
- **Requires**: T10 (UI Layout)

### Tasks

#### T12.1: To-Do List with Urgency Grouping
Fetch and render To-Dos from `/api/todos`, grouped or sorted by urgency (High, Med, Low).

**Implementation Notes:**
```tsx
const TodoPage: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([])

  const { high, medium, low } = useMemo(() => {
    return {
      high: todos.filter(t => t.urgency === 'high' && t.status !== 'completed'),
      medium: todos.filter(t => t.urgency === 'medium' && t.status !== 'completed'),
      low: todos.filter(t => t.urgency === 'low' && t.status !== 'completed'),
      completed: todos.filter(t => t.status === 'completed')
    }
  }, [todos])

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">To-Do</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* High Priority */}
        <TodoColumn
          title="High Priority"
          todos={high}
          color="red"
          icon={<AlertCircle />}
        />

        {/* Medium Priority */}
        <TodoColumn
          title="Medium"
          todos={medium}
          color="yellow"
          icon={<Clock />}
        />

        {/* Low Priority */}
        <TodoColumn
          title="Low"
          todos={low}
          color="green"
          icon={<MinusCircle />}
        />
      </div>

      {/* Completed */}
      <div className="mt-8">
        <TodoColumn
          title="Completed"
          todos={completed}
          color="gray"
          icon={<CheckCircle />}
          collapsible
        />
      </div>
    </div>
  )
}
```

**Deliverables:**
- [ ] Urgency-grouped columns
- [ ] Color coding for urgency levels
- [ ] Responsive grid layout
- [ ] Empty state handling

---

#### T12.2: Todo Completion Toggle
Wire up standard completion toggles to mark tasks as done in the database.

**Implementation Notes:**
```tsx
interface TodoItemProps {
  todo: Todo
  onComplete: (id: number, completed: boolean) => void
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onComplete }) => {
  const [updating, setUpdating] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setUpdating(true)
    try {
      await api.updateTodo(todo.id, {
        status: checked ? 'completed' : 'pending'
      })
      onComplete(todo.id, checked)
    } catch (error) {
      toast.error('Failed to update todo')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-card">
      <Checkbox
        checked={todo.status === 'completed'}
        onCheckedChange={handleToggle}
        disabled={updating}
      />
      <div className="flex-1">
        <p className={cn(
          'text-sm',
          todo.status === 'completed' && 'line-through text-muted-foreground'
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

**Deliverables:**
- [ ] Checkbox toggle component
- [ ] API integration for status update
- [ ] Visual feedback for completion
- [ ] Link to source email

---

## T13: Agent Intent Editor

### Context
The real-time AI drafting interface. This is where the ReAct agent shines, streaming thoughts and draft text.

### Dependencies
- **Requires**: T12 (Smart To-Do Dashboard), T9 (ReAct Agent), T5 (SMTP Dispatcher)

### Tasks

#### T13.1: Assist Reply Button & Modal
Add an "Assist Reply" button to To-Do cards that opens a modal or side-panel with a short-instruction text input.

**Implementation Notes:**
```tsx
const AssistReplyModal: React.FC<{
  open: boolean
  onClose: () => void
  todo: Todo
  email: Email
}> = ({ open, onClose, todo, email }) => {
  const [instruction, setInstruction] = useState('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assist Reply</DialogTitle>
          <DialogDescription>
            Draft a reply for: {todo.description}
          </DialogDescription>
        </DialogHeader>

        {/* Context from original email */}
        <div className="p-4 bg-muted rounded-lg text-sm">
          <p className="font-medium">From: {email.sender}</p>
          <p className="font-medium">Subject: {email.subject}</p>
        </div>

        {/* Instruction input */}
        <Textarea
          placeholder="Brief instruction (e.g., 'Accept the meeting, suggest Tuesday')"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={3}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => startDraft(instruction)}>
            Start Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Deliverables:**
- [ ] Modal/side-panel component
- [ ] Instruction text input
- [ ] Context display from original email
- [ ] Start draft button

---

#### T13.2: SSE Streaming UI
Connect to the SSE endpoint (`/api/agent/draft`). Build a UI state to show the Agent's "Thinking/Searching..." status, followed by a typewriter effect streaming the draft into a rich text editor.

**Implementation Notes:**
```tsx
const DraftEditor: React.FC<{
  emailId: number
  instruction: string
}> = ({ emailId, instruction }) => {
  const [status, setStatus] = useState<'idle' | 'thinking' | 'drafting' | 'done'>('idle')
  const [thoughts, setThoughts] = useState<string[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/agent/draft?emailId=${emailId}&instruction=${encodeURIComponent(instruction)}`
    )

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'thought':
          setStatus('thinking')
          setThoughts(prev => [...prev, data.content])
          break

        case 'action':
          setThoughts(prev => [...prev, `Using tool: ${data.tool}`])
          break

        case 'observation':
          setThoughts(prev => [...prev, 'Processing results...'])
          break

        case 'chunk':
          setStatus('drafting')
          setDraft(prev => prev + data.content)
          break

        case 'done':
          setStatus('done')
          eventSource.close()
          break

        case 'error':
          toast.error(data.message)
          eventSource.close()
          break
      }
    }

    return () => eventSource.close()
  }, [emailId, instruction])

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <StatusIcon status={status} />
        <span className="text-sm text-muted-foreground">
          {status === 'thinking' && 'Thinking...'}
          {status === 'drafting' && 'Drafting reply...'}
          {status === 'done' && 'Draft complete'}
        </span>
      </div>

      {/* Thought process (collapsible) */}
      <Collapsible>
        <CollapsibleTrigger>
          Show thinking process ({thoughts.length} steps)
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 bg-muted rounded-lg text-xs font-mono">
            {thoughts.map((thought, i) => (
              <p key={i}>{thought}</p>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Draft editor with typewriter effect */}
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-[200px]"
        readOnly={status !== 'done'}
      />
    </div>
  )
}
```

**Deliverables:**
- [ ] SSE connection to `/api/agent/draft`
- [ ] Status indicators for thinking/drafting
- [ ] Thought process display (collapsible)
- [ ] Typewriter effect for draft
- [ ] Editable draft after completion

---

#### T13.3: Send Button & SMTP Integration
Add a "Send" button in the editor that calls the backend SMTP dispatch service (`T5`), marks the To-Do as complete, and closes the flow.

**Implementation Notes:**
```tsx
const DraftEditor: React.FC<Props> = ({ emailId, instruction, todo, onClose }) => {
  // ... previous state

  const handleSend = async () => {
    try {
      // Get original email for reply context
      const email = await api.getEmail(emailId)

      // Send via SMTP
      await api.sendEmail({
        to: email.sender,
        subject: `Re: ${email.subject}`,
        body: draft
      })

      // Mark todo as complete
      await api.updateTodo(todo.id, { status: 'completed' })

      toast.success('Reply sent successfully')
      onClose()
    } catch (error) {
      toast.error('Failed to send reply')
    }
  }

  return (
    <div className="space-y-4">
      {/* ... draft editor UI */}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSend} disabled={status !== 'done'}>
          Send Reply
        </Button>
      </div>
    </div>
  )
}
```

**Deliverables:**
- [ ] Send button with disabled state during drafting
- [ ] SMTP service integration
- [ ] Todo completion on send
- [ ] Success/error feedback
- [ ] Modal close after successful send

---

## Phase 4 Completion Checklist

- [ ] Main layout with sidebar navigation
- [ ] Settings form with IMAP/SMTP/LLM configuration
- [ ] Email inbox list with frameless cards
- [ ] Multi-select with max 5 limit
- [ ] Run AI action button
- [ ] Collapsible email details with summary and todos
- [ ] To-Do dashboard with urgency grouping
- [ ] Todo completion toggle
- [ ] Assist reply modal
- [ ] SSE streaming with thought process display
- [ ] Typewriter draft effect
- [ ] Send button with SMTP integration

## UI Components Summary

| Component | Description |
|-----------|-------------|
| `MainLayout` | Sidebar + content area shell |
| `SettingsPage` | IMAP/SMTP/LLM configuration |
| `InboxPage` | Email list + multi-select + AI trigger |
| `EmailCard` | Individual email display |
| `EmailDetail` | Collapsible summary + todos |
| `TodoPage` | Urgency-grouped task board |
| `TodoItem` | Individual task with completion |
| `AssistReplyModal` | Draft instruction input |
| `DraftEditor` | SSE streaming + rich text editor |

## Next Phase

→ [Phase 5: Delivery & Deployment](./plan_5.md)
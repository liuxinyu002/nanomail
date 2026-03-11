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
// Layout structure with compact sidebar
const MainLayout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Compact Sidebar - collapsed by default, hover to expand */}
      <aside
        className={cn(
          'transition-all duration-300 ease-in-out border-r border-border/50',
          sidebarExpanded ? 'w-56' : 'w-16'
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="p-4">
          <h1 className={cn(
            'text-xl font-bold transition-opacity',
            sidebarExpanded ? 'opacity-100' : 'opacity-0'
          )}>
            NanoMail
          </h1>
          {!sidebarExpanded && (
            <span className="text-lg font-bold">NM</span>
          )}
        </div>
        <nav className="p-4 space-y-2">
          <NavItem icon={<Inbox />} label="Inbox" path="/inbox" expanded={sidebarExpanded} />
          <NavItem icon={<CheckSquare />} label="To-Do" path="/todos" expanded={sidebarExpanded} />
          <NavItem icon={<Settings />} label="Settings" path="/settings" expanded={sidebarExpanded} />
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
- Compact sidebar (w-16 collapsed, w-56 expanded on hover)
- Minimal border styling (border-border/50)
- Active route indication
- Clean typography and spacing
- Dark mode support (via Tailwind/Shadcn)
- Icon-only mode when collapsed, full labels on hover

**Deliverables:**
- [ ] Main layout component with compact sidebar
- [ ] Navigation items with icons and expand/collapse animation
- [ ] React Router setup
- [ ] Responsive design with hover expansion

---

#### T10.2: Settings Form with Tabs
Build the Settings form allowing the user to input and save IMAP, SMTP, and LLM API keys. Use Tabs to organize configuration into logical sections.

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
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email Servers</TabsTrigger>
          <TabsTrigger value="ai">AI Engine</TabsTrigger>
        </TabsList>

        {/* Email Servers Tab */}
        <TabsContent value="email" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>IMAP Configuration</CardTitle>
              <CardDescription>Incoming mail server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imap-host">Host</Label>
                  <Input
                    id="imap-host"
                    value={settings.imapHost}
                    onChange={(e) => setSettings({ ...settings, imapHost: e.target.value })}
                    placeholder="imap.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-port">Port</Label>
                  <Input
                    id="imap-port"
                    value={settings.imapPort}
                    onChange={(e) => setSettings({ ...settings, imapPort: e.target.value })}
                    placeholder="993"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imap-user">Username</Label>
                <Input
                  id="imap-user"
                  value={settings.imapUser}
                  onChange={(e) => setSettings({ ...settings, imapUser: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imap-password">Password</Label>
                <Input
                  id="imap-password"
                  type="password"
                  value={settings.imapPassword}
                  onChange={(e) => setSettings({ ...settings, imapPassword: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>Outgoing mail server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SMTP fields - similar structure to IMAP */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Engine Tab */}
        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>LLM Configuration</CardTitle>
              <CardDescription>AI model settings for email processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="llm-provider">Provider</Label>
                <Select
                  value={settings.llmProvider}
                  onValueChange={(value) => setSettings({ ...settings, llmProvider: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Dynamic fields based on provider */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          Save Settings
        </Button>
      </div>
    </div>
  )
}
```

**UI Requirements:**
- Use Shadcn `<Tabs>` component to split configuration
- Tab 1: "Email Servers" (IMAP + SMTP cards)
- Tab 2: "AI Engine" (LLM configuration)
- Page should fit within standard desktop height without scrolling for single configuration
- Clean, organized layout with proper spacing

**Security Considerations:**
- Mask password fields
- Show connection test buttons
- Validate required fields before save
- Handle encrypted storage transparently

**Deliverables:**
- [ ] Settings form with Tabs component
- [ ] Email Servers tab with IMAP and SMTP cards
- [ ] AI Engine tab with LLM configuration
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
Render the inbox list fetching from `/api/emails`. Design as frameless cards (Sender, Title, multi-line snippet).

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

**UI Requirements:**
- Frameless card design (no borders, subtle hover)
- Use Tailwind `line-clamp-2` for natural multi-line text truncation
- Consistent card height with 2-line snippet display (~80-100 characters)
- Visual indicator for processed/unprocessed emails
- Spam emails visually muted
- Responsive grid layout

**Deliverables:**
- [ ] Email card component with line-clamp-2 snippet
- [ ] Inbox list with pagination
- [ ] API integration for fetching emails
- [ ] Loading and error states

---

#### T11.2: Multi-Select & AI Action Button
Implement multi-select checkboxes (enforce max 5 limit with visual blocking) and a floating "Run AI" action button calling `/api/process-emails`.

**Implementation Notes:**
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

**UI Requirements:**
- **Poka-yoke Design**: Disable unselected checkboxes when limit reached
- Visual feedback: Grayed-out checkboxes with `disabled` prop
- Selection counter showing X/5 format
- Warning text when maximum is reached
- No toast error for clicking disabled items (visual blocking is sufficient)

**Deliverables:**
- [ ] Multi-select with max 5 limit
- [ ] Dynamic checkbox disabling: `disabled={selectedIds.size >= 5 && !selectedIds.has(email.id)}`
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
Fetch and render To-Dos from `/api/todos`, grouped or sorted by urgency (High, Med, Low). Use minimalist visual design.

**Implementation Notes:**
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

**UI Requirements:**
- Minimalist design: remove hardcoded red/yellow/green backgrounds
- Unified column background: `bg-muted/50` (low saturation)
- Priority indication via:
  - Left border color (border-l-{color})
  - Small Badge component with subtle colors
- Completed column limited to 10 items with "Load More" button
- Prevents DOM bloat from unlimited completed items

**Deliverables:**
- [ ] Urgency-grouped columns with minimalist styling
- [ ] Border-left and Badge for priority distinction
- [ ] Responsive grid layout
- [ ] Completed column with limit and Load More
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

#### T13.1: Assist Reply Button & Sheet
Add an "Assist Reply" button to To-Do cards that opens a side sheet (not modal) with instruction input. Use Split-Pane layout for better space utilization.

**Implementation Notes:**
```tsx
const AssistReplySheet: React.FC<{
  open: boolean
  onClose: () => void
  todo: Todo
  email: Email
}> = ({ open, onClose, todo, email }) => {
  const [instruction, setInstruction] = useState('')

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Assist Reply</SheetTitle>
          <SheetDescription>
            Draft a reply for: {todo.description}
          </SheetDescription>
        </SheetHeader>

        {/* Original email context - compact display */}
        <div className="p-4 bg-muted rounded-lg text-sm my-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Original Email</span>
          </div>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">From:</span> {email.sender}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Subject:</span> {email.subject}
          </p>
        </div>

        {/* Instruction input */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="instruction">Your Instructions</Label>
          <Textarea
            id="instruction"
            placeholder="Brief instruction (e.g., 'Accept the meeting, suggest Tuesday')"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
          />
        </div>

        {/* Draft Editor - takes remaining space */}
        <div className="flex-1 overflow-auto">
          <DraftEditor
            emailId={email.id}
            instruction={instruction}
            todo={todo}
            onClose={onClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Alternative: Split-Pane Layout for larger screens
const AssistReplySplitPane: React.FC<{
  email: Email
  todo: Todo
}> = ({ email, todo }) => {
  return (
    <div className="flex h-full">
      {/* Left pane: Original email details */}
      <div className="w-1/2 border-r p-6 overflow-auto">
        <EmailDetailView email={email} />
      </div>

      {/* Right pane: Draft interface */}
      <div className="w-1/2 p-6 flex flex-col">
        <DraftInterface todo={todo} email={email} />
      </div>
    </div>
  )
}
```

**UI Requirements:**
- Use Shadcn `<Sheet>` instead of `<Dialog>` for side panel
- Sheet width: 500-600px for comfortable drafting
- Left side (main screen) remains visible showing original email
- Right side sheet contains: instruction input, thinking status, draft editor
- Better space utilization than modal overlay

**Deliverables:**
- [ ] Sheet component replacing Dialog
- [ ] Instruction text input
- [ ] Compact context display from original email
- [ ] Start draft button
- [ ] Optional: Split-Pane layout for desktop

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
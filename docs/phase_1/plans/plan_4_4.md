# Phase 4.4: Agent Intent Editor

> **Part of Phase 4: Frontend Interaction & Workspace**

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 4 of 5 |
| **Task Group** | T13 (Part 4 of 4) |
| **Focus Area** | AI drafting interface, SSE streaming, SMTP integration |
| **Total Tasks** | 3 subtasks |
| **Dependencies** | Phase 4.3 (T12: Smart To-Do Dashboard), T9 (ReAct Agent), T5 (SMTP Dispatcher) |
| **Estimated Effort** | 1-1.5 days |

---

## Context

The real-time AI drafting interface. This is where the ReAct agent shines, streaming thoughts and draft text. Users can provide instructions, watch the AI think and draft, then send replies via SMTP.

---

## T13.1: Assist Reply Button & Sheet

### Description
Add an "Assist Reply" button to To-Do cards that opens a side sheet (not modal) with instruction input. Use Split-Pane layout for better space utilization.

### Implementation Notes

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

### UI Requirements
- Use Shadcn `<Sheet>` instead of `<Dialog>` for side panel
- Sheet width: 500-600px for comfortable drafting
- Left side (main screen) remains visible showing original email
- Right side sheet contains: instruction input, thinking status, draft editor
- Better space utilization than modal overlay

### Deliverables
- [ ] Sheet component replacing Dialog
- [ ] Instruction text input
- [ ] Compact context display from original email
- [ ] Start draft button
- [ ] Optional: Split-Pane layout for desktop

---

## T13.2: SSE Streaming UI with Abort Control

### Description
Connect to the SSE endpoint (`/api/agent/draft`). Build a UI state to show the Agent's "Thinking/Searching..." status, followed by a typewriter effect streaming the draft into a rich text editor. **Include ability to interrupt generation.**

### Implementation Notes

```tsx
const DraftEditor: React.FC<{
  emailId: number
  instruction: string
  todo: Todo
  onClose: () => void
}> = ({ emailId, instruction, todo, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'thinking' | 'drafting' | 'done' | 'error'>('idle')
  const [thoughts, setThoughts] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const startDraft = async () => {
    setStatus('thinking')
    setThoughts([])
    setErrorMessage(null)
    // Keep existing draft on retry - don't clear

    // Create abort controller for potential cancellation
    abortControllerRef.current = new AbortController()

    const eventSource = new EventSource(
      `/api/agent/draft?emailId=${emailId}&instruction=${encodeURIComponent(instruction)}`
    )
    eventSourceRef.current = eventSource

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
          setErrorMessage(data.message)
          setStatus('error')
          // Keep current draft content - don't clear
          eventSource.close()
          break
      }
    }

    eventSource.onerror = () => {
      if (status !== 'done') {
        setErrorMessage('Connection lost. Please retry.')
        setStatus('error')
        // Keep current draft content for user to review/edit
      }
      eventSource.close()
    }
  }

  // Cancel generation
  const handleCancel = async () => {
    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // Notify backend to abort
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Optionally send abort signal to backend
    try {
      await fetch('/api/agent/draft/abort', { method: 'POST' })
    } catch (e) {
      // Ignore abort errors
    }

    setStatus('done') // Allow user to edit current draft
    toast.info('Generation cancelled - you can edit the current draft')
  }

  // Retry after error
  const handleRetry = () => {
    setErrorMessage(null)
    startDraft()
  }

  // Cleanup on unmount
  useEffect(() => {
    if (instruction.trim()) {
      startDraft()
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Status indicator with cancel button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span className="text-sm text-muted-foreground">
            {status === 'thinking' && 'Thinking...'}
            {status === 'drafting' && 'Drafting reply...'}
            {status === 'done' && 'Draft complete'}
            {status === 'error' && 'Connection error'}
            {status === 'idle' && 'Ready to draft'}
          </span>
        </div>

        {/* Cancel button - visible during generation */}
        {(status === 'thinking' || status === 'drafting') && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="text-amber-600 hover:text-amber-700"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel Generation
          </Button>
        )}
      </div>

      {/* Error state with retry button */}
      {status === 'error' && (
        <div className="mb-4 p-3 bg-red-500/10 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-600">{errorMessage}</span>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Thought process (collapsible) */}
      {thoughts.length > 0 && (
        <Collapsible className="mb-4">
          <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground">
            Show thinking process ({thoughts.length} steps)
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 bg-muted rounded-lg text-xs font-mono max-h-32 overflow-auto">
              {thoughts.map((thought, i) => (
                <p key={i} className="py-1 border-b border-border/50 last:border-0">
                  {thought}
                </p>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Draft editor with typewriter effect */}
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="flex-1 min-h-[200px] resize-none"
        placeholder="Draft will appear here..."
        readOnly={status !== 'done' && status !== 'idle' && status !== 'error'}
      />

      {/* Action buttons */}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {status === 'idle' && !draft && (
          <Button onClick={startDraft}>
            Start Draft
          </Button>
        )}
        {status === 'error' && (
          <Button onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry Generation
          </Button>
        )}
        <Button
          onClick={handleSend}
          disabled={!draft.trim()}
        >
          Send Reply
        </Button>
      </div>
    </div>
  )
}
```

### UI Requirements
- SSE connection to `/api/agent/draft`
- Status indicators for thinking/drafting
- **Cancel Generation button** visible during active generation
- `eventSource.close()` to stop streaming
- Optional backend abort signal
- User can manually edit draft after cancellation
- Thought process display (collapsible)
- Typewriter effect for draft
- **Error handling with retry**: On SSE disconnect/error, preserve current text and show Retry button
- **Text preservation**: Never clear draft content on error - allow user to review/edit

### Deliverables
- [ ] SSE connection to `/api/agent/draft`
- [ ] Status indicators for thinking/drafting
- [ ] Cancel Generation button with `eventSource.close()`
- [ ] Thought process display (collapsible)
- [ ] Typewriter effect for draft
- [ ] Editable draft after completion or cancellation
- [ ] **Error state with Retry button**
- [ ] **Preserve draft text on error** (never clear content)

---

## T13.3: Send Button & SMTP Integration

### Description
Add a "Send" button in the editor that calls the backend SMTP dispatch service (`T5`), marks the To-Do as complete, and closes the flow.

### Implementation Notes

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

### Deliverables
- [ ] Send button with disabled state during drafting
- [ ] SMTP service integration
- [ ] Todo completion on send
- [ ] Success/error feedback
- [ ] Modal close after successful send

---

## Completion Checklist

### T13.1: Assist Reply Button & Sheet
- [ ] Sheet component replacing Dialog (side panel)
- [ ] Instruction text input
- [ ] Compact context display from original email
- [ ] Start draft button

### T13.2: SSE Streaming UI with Abort Control
- [ ] SSE connection to `/api/agent/draft`
- [ ] Status indicators for thinking/drafting
- [ ] Cancel Generation button with `eventSource.close()`
- [ ] Thought process display (collapsible)
- [ ] Typewriter effect for draft
- [ ] Editable draft after completion or cancellation
- [ ] **Error state with Retry button**
- [ ] **Preserve draft text on error** (never clear content)

### T13.3: Send Button & SMTP Integration
- [ ] Send button with disabled state during drafting
- [ ] SMTP service integration
- [ ] Todo completion on send
- [ ] Success/error feedback
- [ ] Sheet close after successful send

---

## API Endpoints Required

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/draft` | GET (SSE) | Stream AI draft with thought process |
| `/api/agent/draft/abort` | POST | Abort current generation |
| `/api/emails/:id` | GET | Get email details |
| `/api/emails/send` | POST | Send email via SMTP |
| `/api/todos/:id` | PATCH | Update todo status |

---

## Previous Phase

← [Phase 4.3: Smart To-Do Dashboard](./plan_4_3.md)

## Next Phase

→ [Phase 5: Delivery & Deployment](./plan_5.md)
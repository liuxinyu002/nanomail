# Plan 12 Phase 3: Extend ComposeEmailModal Props

**File:** `packages/frontend/src/components/email/ComposeEmailModal.tsx`

**Dependencies:** Phase 1, Phase 2

---

## Objective

Integrate AI assist UI into ComposeEmailModal, including instruction input, streaming controls, draggable modal, and editor lock during AI drafting.

---

## New Props

```typescript
interface ComposeEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // NEW:
  emailId?: number          // For AI assist
  initialInstruction?: string  // Pre-filled instruction
  sender?: string           // Auto-fill To field
}
```

---

## UI Changes

### 1. Instruction Input Section

Located above TipTapEditor:
- Lightweight textarea (1-3 rows max)
- "Generate" button on the right (switches to "Stop" when streaming)
- Pre-filled with `initialInstruction`
- Hidden when not in AI mode

```typescript
<div className="flex gap-2 mb-2">
  <Textarea
    placeholder="Describe what you want to reply..."
    value={instruction}
    onChange={(e) => setInstruction(e.target.value)}
    className="flex-1"
    rows={2}
    disabled={isStreaming}
  />
  <Button
    onClick={isStreaming ? cancel : start}
    variant={isStreaming ? 'destructive' : 'default'}
  >
    {isStreaming ? 'Stop' : 'Generate'}
  </Button>
</div>
```

### 2. AI Status Indicator

Simplified for MVP:
- Instead of complex "AI Thinking" panel, use simple loading state
- Show "AI 正在分析..." text during thinking phase
- Keep UI clean with moderate information density

```typescript
{status === 'thinking' && (
  <div className="text-sm text-muted-foreground mb-2">
    AI 正在分析...
  </div>
)}
```

### 3. Stop Generation Button

- When `isStreaming` is true or `status === 'drafting'`, show "Stop" button instead of "Generate"
- Click "Stop" calls `cancel()` to interrupt SSE connection
- After interruption, preserve already-generated text in editor
- Re-enable editor for manual editing

### 4. Editor Lock During AI Drafting

- When `status === 'drafting'`, set TipTapEditor to `disabled={true}`
- Prevents user input that would conflict with AI insertion
- Unlock when generation completes or is stopped

```typescript
<TipTapEditor
  ref={editorRef}
  value={content}
  onChange={setContent}
  disabled={editorDisabled || status === 'drafting'}
/>
```

### 5. Draggable Non-blocking Modal

**CRITICAL: Use Drag Handle only on Modal Header**

Only the top Header row (containing title and close button) should be draggable. The TipTapEditor area must NOT respond to drag events. Otherwise, users trying to select text in the editor will accidentally drag the entire window.

Implementation with `react-rnd`:

```typescript
import { Rnd } from 'react-rnd'

<Rnd
  default={{
    x: 100,
    y: 100,
    width: 600,
    height: 'auto',
  }}
  dragHandleClassName="modal-drag-handle"
  bounds="parent"
  enableResizing={false}
>
  <div className="bg-background border rounded-lg shadow-lg">
    {/* Header - draggable */}
    <div className="modal-drag-handle flex justify-between items-center p-4 border-b cursor-move">
      <h2>New Message</h2>
      <Button variant="ghost" size="icon" onClick={onClose}>×</Button>
    </div>

    {/* Content - not draggable */}
    <div className="p-4">
      <TipTapEditor
        ref={editorRef}
        disabled={editorDisabled || status === 'drafting'}
      />
    </div>
  </div>
</Rnd>
```

---

## State Management

```typescript
const [instruction, setInstruction] = useState(initialInstruction ?? '')
const [editorDisabled, setEditorDisabled] = useState(false)
const editorRef = useRef<TipTapEditorHandle>(null)

const { isStreaming, status, start, cancel, reset } = useAIAssistStream({
  emailId: emailId!,
  onChunk: (chunk) => editorRef.current?.appendContent(chunk),
  onDone: () => setEditorDisabled(false),
  onError: () => setEditorDisabled(false),
  enabled: !!emailId
})

// Lock editor during drafting
useEffect(() => {
  if (status === 'drafting') {
    setEditorDisabled(true)
  }
}, [status])

// Auto-fill To field with sender
useEffect(() => {
  if (sender) {
    setTo(sender)
  }
}, [sender])
```

---

## Testing

### Unit Tests

```typescript
describe('ComposeEmailModal', () => {
  it('should pre-fill instruction from initialInstruction prop', () => {
    render(<ComposeEmailModal initialInstruction="Reply about meeting" />)
    expect(screen.getByPlaceholderText(/describe what you want/i)).toHaveValue('Reply about meeting')
  })

  it('should auto-fill To field with sender', () => {
    render(<ComposeEmailModal sender="test@example.com" />)
    expect(screen.getByLabelText(/to/i)).toHaveValue('test@example.com')
  })

  it('should lock editor during AI drafting', async () => {
    // Mock useAIAssistStream to return drafting status
    // Verify editor is disabled
  })

  it('should switch Generate button to Stop when streaming', () => {
    // Mock streaming state
    // Verify button text and variant
  })

  it('should preserve content after Stop is clicked', async () => {
    // Start streaming, generate partial content
    // Click Stop
    // Verify editor content is preserved
  })
})
```
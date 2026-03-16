# Plan 10: Compose Email Feature

> **Status**: Ready for Implementation
> **Dependencies**: None

---

## Objective

Add a compose email feature to the Inbox page with a "Compose" button in the header and a modal dialog for writing and sending emails.

---

## Context

NanoMail currently lacks the ability to compose new emails from the Inbox interface. Users can only view and process incoming emails. This feature adds a standard email composition capability with:

- Multi-recipient support (To, Cc, Bcc fields with chip-style input)
- Rich text editing via TipTap editor
- Sender information display from SMTP settings
- Data loss prevention on modal close

---

## Scope

### In Scope
- "Compose" button in InboxPage header
- ComposeEmailModal with form fields
- EmailChipInput component for multi-email input with smart paste parsing
- TipTapEditor component with formatting toolbar
- Shared schema updates for `to`, `cc`, and `bcc` arrays
- Backend support for multiple recipients
- Bcc (blind carbon copy) support
- Data loss prevention confirmation dialog

### Out of Scope
- Reply/Reply All functionality (future iteration)
- Attachments support
- Draft auto-save

---

## Target Files

### New Files
| File | Description |
|------|-------------|
| `packages/frontend/src/hooks/useSettings.ts` | Hook for fetching settings |
| `packages/frontend/src/components/email/EmailChipInput.tsx` | Multi-email chip input with smart parsing |
| `packages/frontend/src/components/email/TipTapEditor.tsx` | Rich text editor |
| `packages/frontend/src/components/email/ComposeEmailModal.tsx` | Compose modal with data loss prevention |
| `packages/frontend/src/components/email/index.ts` | Exports |

### Modified Files
| File | Description |
|------|-------------|
| `packages/shared/src/schemas/email.ts` | Update SendEmailSchema for arrays with backward compatibility |
| `packages/backend/src/services/SmtpService.ts` | Add cc/bcc support, handle arrays and empty arrays |
| `packages/backend/src/routes/email.routes.ts` | Update send endpoint |
| `packages/frontend/src/services/email.service.ts` | Update SendEmailRequest type |
| `packages/frontend/src/features/inbox/InboxPage.tsx` | Add Compose button and modal |
| `packages/frontend/src/hooks/index.ts` | Export useSettings |

---

## Dependencies

### TipTap Packages (to install)
```bash
pnpm --filter @nanomail/frontend add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-image
```

| Package | Purpose |
|---------|---------|
| `@tiptap/react` | React bindings |
| `@tiptap/pm` | ProseMirror core |
| `@tiptap/starter-kit` | Basic extensions (bold, italic, headings, lists) |
| `@tiptap/extension-underline` | Underline formatting |
| `@tiptap/extension-text-align` | Text alignment |
| `@tiptap/extension-link` | Link insertion |
| `@tiptap/extension-placeholder` | Placeholder text |
| `@tiptap/extension-image` | Image support (future use, installed but not enabled) |

### Tailwind Typography Plugin (CRITICAL for TipTap styling)
```bash
pnpm --filter @nanomail/frontend add -D @tailwindcss/typography
```

**Why required**: Tailwind CSS Preflight strips default styles from `<h1>`, `<ul>`, `<ol>`, `<blockquote>` etc. Without this plugin, users won't see visual feedback when applying bold, headings, or lists in the editor.

**Configuration** (`tailwind.config.js`):
```javascript
module.exports = {
  plugins: [
    require('@tailwindcss/typography'),
    // ... other plugins
  ],
}
```

---

## Implementation Phases

### Phase 1: Shared Schema Updates

**File**: `packages/shared/src/schemas/email.ts`

Update `SendEmailSchema` to support arrays:

```typescript
import { z } from 'zod'

// Email validation
const EmailSchema = z.string().email('Invalid email address')

// Email array validation with safe coercion
const EmailArraySchema = z.array(EmailSchema)

export const SendEmailSchema = z.object({
  to: EmailArraySchema.min(1, 'At least one recipient is required'),
  cc: EmailArraySchema.optional().default([]).catch([]),
  bcc: EmailArraySchema.optional().default([]).catch([]),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required'),
  replyTo: EmailSchema.optional(),
  isHtml: z.boolean().optional().default(true),
})

// Types
export type SendEmail = z.infer<typeof SendEmailSchema>
```

**Key Points**:
- Simple array-based schema for `to`, `cc`, `bcc`
- Empty arrays default to `[]` for consistency
- **CRITICAL**: Added `.catch([])` for `cc`/`bcc` to handle edge cases where HTTP clients may send malformed payloads (null, undefined, or invalid types). This ensures graceful fallback instead of validation errors.

---

### Phase 2: Backend Updates

**File**: `packages/backend/src/services/SmtpService.ts`

Update `SendEmailOptions` interface:
```typescript
export interface SendEmailOptions {
  to: string[]      // Changed from string to string[]
  cc?: string[]     // Added cc field
  bcc?: string[]    // Added bcc field
  subject: string
  body: string
  replyTo?: string
  isHtml?: boolean
}
```

Update `sendEmail` method with **empty array protection**:
```typescript
const mailOptions = {
  from: config.user,
  to: options.to.join(', '),
  // CRITICAL: Only include cc/bcc if array exists and has elements
  // Empty string in cc/bcc can cause SMTP errors with strict servers (e.g., Exchange)
  ...(options.cc && options.cc.length > 0 ? { cc: options.cc.join(', ') } : {}),
  ...(options.bcc && options.bcc.length > 0 ? { bcc: options.bcc.join(', ') } : {}),
  subject: options.subject,
  [options.isHtml ? 'html' : 'text']: options.body,
  ...(options.replyTo && { replyTo: options.replyTo }),
}
```

**Key Points**:
- Empty array `[]` → `undefined` (field omitted) instead of empty string `""`
- Prevents SMTP rejection from strict mail servers
- Bcc support added alongside cc

**File**: `packages/backend/src/routes/email.routes.ts`

No changes needed - schema validation handles the transformation.

---

### Phase 3: Frontend Service Updates

**File**: `packages/frontend/src/services/email.service.ts`

Update `SendEmailRequest` interface:
```typescript
export interface SendEmailRequest {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  replyTo?: string
  isHtml?: boolean
}
```

---

### Phase 4: Settings Hook

**File**: `packages/frontend/src/hooks/useSettings.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import type { SettingsForm } from '@nanomail/shared'

export function useSettings() {
  return useQuery<SettingsForm>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

---

### Phase 5: EmailChipInput Component

**File**: `packages/frontend/src/components/email/EmailChipInput.tsx`

**Props**:
```typescript
interface EmailChipInputProps {
  emails: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label: string
}
```

**Behavior**:
- Convert text to chip on: `,`, `;`, `Enter`
- Validate email format on chip creation
- Show invalid emails with red highlight
- Delete chip on X icon click
- **Smart paste parsing**: Extract emails from formats like `"张三" <zhangsan@example.com>`
- Handle multi-line pasted content
- **Error feedback**: Shake animation or red border on invalid input

**Smart Email Parsing Implementation**:
```typescript
/**
 * Extracts email addresses from various input formats:
 * - Plain email: user@example.com
 * - Quoted name: "张三" <zhangsan@example.com>
 * - Angle brackets: <user@example.com>
 * - Multiple emails (comma/semicolon/newline separated)
 *
 * NOTE: This regex is for initial extraction from clipboard text.
 * The Zod schema (z.string().email()) is the FINAL gatekeeper before
 * array insertion, handling edge cases the regex might miss.
 */
function extractEmails(text: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const matches = text.match(emailRegex)
  return matches ? [...new Set(matches)] : [] // Deduplicate within paste
}

function handlePaste(e: React.ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData.getData('text')
  const extractedEmails = extractEmails(text)
  const validEmails = extractedEmails.filter(email =>
    z.string().email().safeParse(email).success
  )
  // CRITICAL: Diff with existing emails to avoid duplicates
  const newEmails = validEmails.filter(email => !emails.includes(email))
  onChange([...emails, ...newEmails])
}

function handleBlur(e: React.FocusEvent) {
  const text = e.target.value.trim()
  if (text) {
    const extractedEmails = extractEmails(text)
    const validEmails = extractedEmails.filter(email =>
      z.string().email().safeParse(email).success
    )
    // Diff with existing emails
    const newEmails = validEmails.filter(email => !emails.includes(email))
    if (newEmails.length > 0) {
      onChange([...emails, ...newEmails])
      setInputValue('')
    }
    // CRITICAL: Do NOT clear inputValue if no valid emails found
    // Preserves user keystrokes when they blur to copy domain from another tab
    // e.g., user types "john@exampl", clicks away, returns - their input remains
  }
}
```

**CRITICAL: Error Feedback on Invalid Input**:
```typescript
const [inputError, setInputError] = useState(false)
const [shake, setShake] = useState(false)

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text) return

    const extractedEmails = extractEmails(text)
    const validEmails = extractedEmails.filter(email =>
      z.string().email().safeParse(email).success
    )

    if (validEmails.length === 0 && text.length > 0) {
      // Invalid input - show shake animation and red border
      setInputError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500) // Reset shake after animation
      return
    }

    // Diff with existing emails
    const newEmails = validEmails.filter(email => !emails.includes(email))
    onChange([...emails, ...newEmails])
    setInputValue('')
    setInputError(false)
  }
}
```

**Chip Styling (Pill/Badge Style)**:
```tsx
<div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px] bg-background">
  {emails.map((email, index) => (
    <Badge
      key={email}
      variant="secondary"
      className="rounded-full px-2.5 py-0.5 text-sm flex items-center gap-1
                 hover:bg-destructive/20 transition-colors group"
    >
      {email}
      <button
        type="button"
        onClick={() => onChange(emails.filter((_, i) => i !== index))}
        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
        disabled={disabled}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  ))}
  <input
    value={inputValue}
    onChange={(e) => {
      setInputValue(e.target.value)
      setInputError(false) // Reset error on typing
    }}
    onKeyDown={handleKeyDown}
    onPaste={handlePaste}
    onBlur={handleBlur}
    placeholder={emails.length === 0 ? placeholder : ''}
    disabled={disabled}
    className={cn(
      "flex-1 min-w-[150px] outline-none bg-transparent text-sm",
      inputError && "text-destructive",
      shake && "animate-shake" // Custom shake animation
    )}
  />
</div>
```

**Tailwind Animation for Shake** (add to `tailwind.config.js`):
```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        shake: 'shake 0.5s ease-in-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
}
```

**Key Implementation**:
- Container with `flex flex-wrap gap-1.5` for chips
- Badge with `rounded-full` for pill-shaped chips
- Hover effect on chip shows delete possibility (red tint)
- Input field grows to fill remaining space
- Regex extraction handles complex paste formats gracefully
- **Shake animation** on invalid email input attempt
- **Diff with existing** emails to prevent duplicates

---

### Phase 6: TipTapEditor Component

**File**: `packages/frontend/src/components/email/TipTapEditor.tsx`

**Props**:
```typescript
interface TipTapEditorProps {
  value: string
  onChange: (html: string, isEmpty: boolean) => void  // CRITICAL: Expose isEmpty state
  placeholder?: string
  disabled?: boolean
}
```

**Toolbar Features** (using lucide-react icons):
| Feature | Icon | Extension |
|---------|------|-----------|
| Bold | `Bold` | starter-kit |
| Italic | `Italic` | starter-kit |
| Underline | `Underline` | extension-underline |
| Strikethrough | `Strikethrough` | starter-kit |
| H1/H2/H3 | `Heading1/2/3` | starter-kit |
| Bullet list | `List` | starter-kit |
| Ordered list | `ListOrdered` | starter-kit |
| Link | `Link` | extension-link |
| Blockquote | `Quote` | starter-kit |
| Align left | `AlignLeft` | extension-text-align |
| Align center | `AlignCenter` | extension-text-align |
| Align right | `AlignRight` | extension-text-align |
| Undo | `Undo` | starter-kit |
| Redo | `Redo` | starter-kit |

**CRITICAL: Styling with Tailwind Typography**:
```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

function TipTapEditor({ value, onChange, placeholder = 'Write your message here...', disabled }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder, // "Write your message here..."
        emptyEditorClass: 'before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none'
      }),
      // Future: Image extension for attachment support
      // Image.configure({ inline: true, allowBase64: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      // CRITICAL: Pass both HTML and isEmpty state to parent
      // This avoids fragile string matching like body !== '<p></p>'
      // TipTap's isEmpty is reliable across browsers and handles <p><br></p> correctly
      onChange(editor.getHTML(), editor.isEmpty)
    },
    editable: !disabled,
  })

  return (
    <div className="rounded-md border focus-within:ring-1 focus-within:ring-ring">
      {/* Toolbar - Sticky at top of editor area */}
      {/* CRITICAL: z-20 ensures toolbar stays above modal's internal stacking context */}
      {/* DialogContent typically uses z-50, internal elements need careful layering */}
      <div className="sticky top-0 z-20 bg-background border-b p-2 flex flex-wrap gap-1">
        {/* Toolbar buttons */}
      </div>

      {/* Editor - CRITICAL: prose class for proper styling, NO internal border */}
      {/* NOTE: prose max-w-none prevents width constraint, but ensure placeholder
          doesn't inherit incorrect margins/line-heights from global prose styles */}
      <EditorContent
        editor={editor}
        className="min-h-[200px] max-h-[400px] overflow-y-auto p-3 prose prose-sm max-w-none focus:outline-none"
      />
    </div>
  )
}
```

**Toolbar Button Pattern**:
```tsx
<Button
  type="button"
  variant="ghost"
  size="icon"
  onClick={() => editor.chain().focus().toggleBold().run()}
  disabled={!editor?.can().chain().focus().toggleBold().run()}
  className={editor?.isActive('bold') ? 'bg-accent' : ''}
>
  <Bold className="h-4 w-4" />
</Button>
```

**Alternative: Toolbar at Modal Bottom (Gmail-style)**:
```tsx
// Place toolbar in DialogFooter, outside the editor container
<DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:justify-between">
  {/* Toolbar buttons */}
  <div className="flex flex-wrap gap-1">
    <Button variant="ghost" size="icon">...</Button>
  </div>

  {/* Action buttons */}
  <div className="flex gap-2">
    <Button variant="outline">Cancel</Button>
    <Button>Send</Button>
  </div>
</DialogFooter>
```

**Key Implementation**:
- Use `useEditor` hook with extensions
- Toolbar with Button component (ghost variant, icon size)
- **Editor area must have `prose` and `max-w-none` classes** for proper Tailwind Typography rendering
- Active state styling for toolbar buttons
- Without `prose` class, headings, lists, bold etc. won't render with visual distinction
- **No internal border** - use `focus-within:ring-1` on container for unified look
- **Placeholder** shows "Write your message here..." when empty
- **Future-proof**: Commented Image extension for later attachment support
- **CRITICAL**: `onChange` passes `(html, isEmpty)` - use `isEmpty` for reliable empty-state detection
- **Toolbar z-index**: Use `z-20` to ensure proper layering within modal stacking contexts

**Note on Image Extension**:
While attachments are out of scope for this plan, TipTap's default handling of pasted images is weak. The `@tiptap/extension-image` package is pre-installed and commented out, ready for Phase 6 or future attachment support.

**Note on Tailwind Typography & Placeholder Styling**:
The `prose` class applies global typography styles. The placeholder extension uses CSS pseudo-elements (`before:`). In rare cases, global `prose` styles may bleed into the placeholder, causing incorrect margins or line heights. The placeholder configuration above uses explicit Tailwind classes to prevent this. If placeholder styling issues occur, check that `prose` isn't applying unwanted styles to `[data-placeholder]`.

---

### Phase 7: ComposeEmailModal Component

**File**: `packages/frontend/src/components/email/ComposeEmailModal.tsx`

**Props**:
```typescript
interface ComposeEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

**Layout**:
```
Dialog (max-w-2xl, min-h-[500px] or h-[80vh])
├── DialogHeader (sticky, border-b)
│   └── Title: "New Message"
│   └── From: Inline with title (small text, read-only) - only if multiple accounts exist
├── DialogContent (flex-1, overflow-y-auto)
│   ├── To: EmailChipInput
│   ├── [Cc/Bcc Toggle Buttons]
│   ├── Cc: EmailChipInput (shown if showCc OR cc.length > 0)
│   ├── Bcc: EmailChipInput (shown if showBcc OR bcc.length > 0)
│   ├── Subject: Input
│   └── Body: TipTapEditor (Toolbar sticky at top or bottom)
└── DialogFooter (sticky, border-t)
    ├── Cancel button (outline)
    └── Send button (with Loader2 animation when sending)
```

**State**:
```typescript
const [to, setTo] = useState<string[]>([])
const [cc, setCc] = useState<string[]>([])
const [bcc, setBcc] = useState<string[]>([])
const [showCc, setShowCc] = useState(false)
const [showBcc, setShowBcc] = useState(false)
const [subject, setSubject] = useState('')
const [body, setBody] = useState('')
const [isBodyEmpty, setIsBodyEmpty] = useState(true)  // CRITICAL: Track TipTap empty state
const [sending, setSending] = useState(false)
```

**CRITICAL: Information Density - From Field**:
```typescript
/**
 * 发件人行视觉收纳策略：
 * 1. 如果用户只有一个 SMTP 账号，将发件人信息以小字体显示在 Title 旁
 * 2. 如果用户有多个账号，显示为下拉选择器
 * 3. 避免占用独立的一行，为正文留出更多空间
 * 4. CRITICAL: 使用 truncate + max-w 限制邮箱宽度，防止长邮箱破坏布局
 */
const { data: settings } = useSettings()
const hasMultipleAccounts = false // Future: check multiple SMTP configs

// In DialogHeader
<DialogHeader>
  <DialogTitle className="flex items-center gap-2">
    New Message
    {settings?.SMTP_USER && !hasMultipleAccounts && (
      <span className="text-sm font-normal text-muted-foreground truncate max-w-[200px]" title={settings.SMTP_USER}>
        from {settings.SMTP_USER}
      </span>
    )}
  </DialogTitle>
</DialogHeader>
```

**CRITICAL: Cc/Bcc Smart Toggle**:
```typescript
/**
 * Cc/Bcc 显示逻辑：
 * 1. 点击 Toggle 切换显示/隐藏
 * 2. 如果 cc/bcc 数组不为空，Modal 打开时默认展开对应字段
 * 3. 防止用户在编辑过程中找不到已填写的抄送人
 */
const showCcField = showCc || cc.length > 0
const showBccField = showBcc || bcc.length > 0
```

**CRITICAL: Data Loss Prevention (Use Toast/Dialog, NOT window.confirm)**:
```typescript
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// State for confirmation dialog
const [showConfirmDialog, setShowConfirmDialog] = useState(false)
const [pendingClose, setPendingClose] = useState(false)

/**
 * Check if form has unsaved content
 * CRITICAL: Use isBodyEmpty state from TipTap instead of string matching
 * String comparison like body !== '<p></p>' is fragile - TipTap may output
 * <p><br></p> or other variations depending on browser/clipboard interactions
 */
const hasContent = (): boolean => {
  return (
    to.length > 0 ||
    cc.length > 0 ||
    bcc.length > 0 ||
    subject.trim().length > 0 ||
    !isBodyEmpty  // Uses TipTap's reliable isEmpty state
  )
}

/**
 * Intercept modal close to prevent data loss
 * Uses project's AlertDialog component for visual consistency
 * CRITICAL: Also blocks close when sending is in progress
 */
const handleOpenChange = (newOpen: boolean) => {
  // Block closure during API request
  if (!newOpen && sending) {
    return
  }

  if (!newOpen && hasContent()) {
    // Show confirmation dialog instead of window.confirm
    setShowConfirmDialog(true)
    setPendingClose(true)
  } else {
    onOpenChange(newOpen)
  }
}

const confirmClose = () => {
  setShowConfirmDialog(false)
  setPendingClose(false)
  onOpenChange(false)
}

const cancelClose = () => {
  setShowConfirmDialog(false)
  setPendingClose(false)
}

// In render:
<Dialog open={open} onOpenChange={handleOpenChange}>
  {/* ... modal content ... */}
</Dialog>

{/* Confirmation Dialog */}
<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Discard email?</AlertDialogTitle>
      <AlertDialogDescription>
        You have unsaved content. Are you sure you want to close and discard this email?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={cancelClose}>Keep Editing</AlertDialogCancel>
      <AlertDialogAction onClick={confirmClose}>Discard</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Validation**:
- `to.length >= 1` (at least one recipient)
- `subject.length >= 1`
- `body.length >= 1` (and not just empty paragraphs)

**Submit**:
- Call `EmailService.sendEmail({ to, cc, bcc, subject, body, isHtml: true })`
- Show success/error toast
- Reset form and close on success

**Cc/Bcc Toggle UI**:
```tsx
{/* Compact toggle buttons for Cc/Bcc */}
<div className="flex gap-2 text-sm">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setShowCc(!showCc)}
    className={showCcField ? 'text-primary' : 'text-muted-foreground'}
  >
    Cc
  </Button>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setShowBcc(!showBcc)}
    className={showBccField ? 'text-primary' : 'text-muted-foreground'}
  >
    Bcc
  </Button>
</div>

{/* Conditionally render Cc/Bcc fields with smart visibility */}
{(showCcField) && (
  <div className="space-y-1">
    <Label>Cc</Label>
    <EmailChipInput emails={cc} onChange={setCc} label="Cc" disabled={sending} />
  </div>
)}
{(showBccField) && (
  <div className="space-y-1">
    <Label>Bcc</Label>
    <EmailChipInput emails={bcc} onChange={setBcc} label="Bcc" disabled={sending} />
  </div>
)}
```

**Modal Height & Layout**:
```tsx
<DialogContent className="max-w-2xl h-[80vh] flex flex-col">
  {/* Header stays compact */}
  <DialogHeader>...</DialogHeader>

  {/* Content takes remaining space */}
  <div className="flex-1 overflow-y-auto space-y-4">
    {/* Form fields */}
    {/* ... To, Cc, Bcc, Subject fields ... */}

    {/* TipTapEditor with new onChange signature */}
    <div className="space-y-1">
      <Label>Body</Label>
      <TipTapEditor
        value={body}
        onChange={(html, isEmpty) => {
          setBody(html)
          setIsBodyEmpty(isEmpty)
        }}
        disabled={sending}
      />
    </div>
  </div>

  {/* Footer with loading state */}
  <DialogFooter>
    <Button variant="outline" onClick={handleCancel} disabled={sending}>
      Cancel
    </Button>
    <Button onClick={handleSend} disabled={!isValid || sending}>
      {sending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Sending...
        </>
      ) : (
        'Send'
      )}
    </Button>
  </DialogFooter>
</DialogContent>
```

**Loading State Behavior**:
```typescript
/**
 * 发送状态下的 UI 行为：
 * 1. 发送按钮显示 Loader2 旋转动画
 * 2. 禁用所有输入字段（to, cc, bcc, subject, body）
 * 3. 禁用 Cancel 和 Send 按钮（防止二次操作）
 * 4. 防止用户在发送过程中编辑造成状态混乱
 * 5. CRITICAL: 阻止 modal 关闭（Escape 键、点击遮罩层、关闭按钮）
 */
const handleSend = async () => {
  setSending(true)
  try {
    await EmailService.sendEmail({ to, cc, bcc, subject, body, isHtml: true })
    toast({ title: 'Email sent successfully' })
    resetForm()
    onOpenChange(false)
  } catch (error) {
    toast({ title: 'Failed to send email', variant: 'destructive' })
  } finally {
    setSending(false)
  }
}

// CRITICAL: handleOpenChange already blocks close when sending is true
// This prevents: Escape key, overlay click, and close button during API request
```

---

### Phase 8: InboxPage Integration

**File**: `packages/frontend/src/features/inbox/InboxPage.tsx`

**Changes**:
1. Add import: `import { Pencil } from 'lucide-react'`
2. Add state: `const [composeOpen, setComposeOpen] = useState(false)`
3. Add button in header between ClassificationFilter and Sync:
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setComposeOpen(true)}
>
  <Pencil className="h-4 w-4 mr-2" />
  Compose
</Button>
```
4. Add modal at end of component:
```tsx
<ComposeEmailModal
  open={composeOpen}
  onOpenChange={setComposeOpen}
/>
```

---

## Risk Level

**Medium** - Requires schema changes that affect both frontend and backend, plus new TipTap dependency integration. Critical styling considerations with Tailwind Preflight.

---

## Acceptance Criteria

- [ ] Compose button visible in InboxPage header
- [ ] Modal opens with max-w-2xl width and h-[80vh] height
- [ ] From field displayed inline with title (small text, truncated max-w-[200px]) for single account
- [ ] To field accepts multiple emails as chips (rounded-full pill style)
- [ ] **Incomplete email input preserved on blur** (not cleared if invalid)
- [ ] Cc/Bcc fields auto-expand if arrays have content on modal open
- [ ] Chips created on comma, semicolon, Enter
- [ ] Smart paste extracts emails from `"Name" <email>` format
- [ ] Smart paste diffs with existing chips (no duplicates)
- [ ] Invalid email input shows shake animation + red feedback
- [ ] Invalid emails highlighted in red
- [ ] Subject field accepts text input
- [ ] TipTap editor with full toolbar and proper prose styling
- [ ] Bold, italic, headings, lists render with visual distinction
- [ ] Editor placeholder shows "Write your message here..." when empty
- [ ] Editor container has no internal border, uses focus-within:ring-1
- [ ] Toolbar sticky at top of editor with z-20 (proper modal stacking)
- [ ] **TipTap onChange exposes (html, isEmpty) for reliable empty-state detection**
- [ ] **hasContent() uses isBodyEmpty state, not fragile string comparison**
- [ ] Send button disabled until form valid
- [ ] Send button shows Loader2 animation when sending
- [ ] All inputs disabled during sending state
- [ ] **Modal closure blocked during sending (Escape, overlay click, close button)**
- [ ] Email sent successfully via API
- [ ] Success toast shown on send
- [ ] Form resets after successful send
- [ ] **Data loss prevention: AlertDialog shown when closing with content**
- [ ] All tests passing

---

## Verification

### Manual Testing
1. Navigate to Inbox page
2. Click "Compose" button
3. Verify modal opens with correct layout (h-[80vh])
4. Verify From field shows as small text inline with title (truncated if long email)
5. Enter recipients in To field (test comma, semicolon, Enter)
6. **Test input preservation on blur**: Type incomplete email "john@exampl", click outside input, verify text is preserved
7. Toggle Cc/Bcc fields and add recipients
8. Close and reopen modal - verify Cc/Bcc auto-expand if they had content
9. **Test smart paste**: Copy `"张三" <zhangsan@example.com>` and paste - should extract email only
10. **Test duplicate prevention**: Paste same email twice - should only add once
11. **Test error feedback**: Type invalid text and press Enter - should see shake animation
12. Enter subject
13. Verify placeholder text "Write your message here..." when body is empty
14. Use rich text formatting in body (verify bold, headings, lists show visual changes)
15. Scroll editor content - verify toolbar stays visible (sticky, z-20)
16. **Test data loss prevention**: Add content, try to close modal, verify AlertDialog appears (NOT window.confirm)
17. **Test hasContent with TipTap variations**: Type in editor, delete all content - verify hasContent correctly detects empty state
18. Click Send
19. Verify Loader2 animation on Send button during sending
20. Verify all inputs disabled during sending
21. **Test modal close blocked during send**: Press Escape or click overlay while sending - modal should NOT close
22. Verify success toast
23. Verify modal closes and form resets

### Automated Testing
```bash
# Run frontend tests
pnpm --filter @nanomail/frontend test

# Run backend tests
pnpm --filter @nanomail/backend test

# Build all packages
pnpm build
```

---

## References

- Dialog pattern: `packages/frontend/src/features/todos/TodoDayModal.tsx`
- Form pattern: `packages/frontend/src/features/todos/TodoEditForm.tsx`
- Chip style: `packages/frontend/src/components/ui/badge.tsx`
- Service pattern: `packages/frontend/src/services/email.service.ts`
- Tailwind Typography: https://tailwindcss.com/docs/typography-plugin
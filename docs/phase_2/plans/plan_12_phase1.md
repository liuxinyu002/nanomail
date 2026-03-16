# Plan 12 Phase 1: TipTapEditor Refactoring

**File:** `packages/frontend/src/components/email/TipTapEditor.tsx`

**Dependencies:** None (can start immediately)

---

## Objective

Wrap TipTapEditor component with `forwardRef` and expose imperative methods for external control. Add `disabled` prop support for AI drafting lock.

---

## Changes

### 1. Add forwardRef Wrapper

```typescript
import { forwardRef, useImperativeHandle } from 'react'

// New exposed methods interface
export interface TipTapEditorHandle {
  appendContent: (content: string) => void
  clearContent: () => void
  getContent: () => string
  isEmpty: () => boolean
}
```

### 2. Component Signature

```typescript
export const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(
  function TipTapEditor({ value, onChange, placeholder, disabled }, ref) {
    const editor = useEditor({
      editable: !disabled,  // Support disable during AI drafting
      extensions: [StarterKit, Placeholder.configure({ placeholder })],
      content: value,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML())
      },
    })

    useImperativeHandle(ref, () => ({
      appendContent: (content: string) => {
        editor?.chain().focus().insertContent(content).run()
      },
      clearContent: () => {
        editor?.chain().clearContent().run()
      },
      getContent: () => editor?.getHTML() ?? '',
      isEmpty: () => editor?.isEmpty ?? true,
    }), [editor])

    // ... rest unchanged
  }
)
```

### 3. Update Props Interface

```typescript
interface TipTapEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean  // NEW: Support disable during AI drafting
}
```

---

## Implementation Notes

1. **Backward Compatibility**: All existing props remain unchanged. Components using TipTapEditor without ref will continue to work.

2. **Disabled State**: When `disabled={true}`, the editor becomes non-editable. This prevents user input during AI drafting.

3. **Method Descriptions**:
   - `appendContent`: Appends content at current cursor position
   - `clearContent`: Clears all editor content
   - `getContent`: Returns current HTML content
   - `isEmpty`: Returns true if editor has no content

---

## Testing

### Unit Tests

```typescript
describe('TipTapEditor', () => {
  it('should expose appendContent method via ref', () => {
    const ref = createRef<TipTapEditorHandle>()
    render(<TipTapEditor ref={ref} />)
    ref.current?.appendContent('test content')
    expect(ref.current?.getContent()).toContain('test content')
  })

  it('should lock editor when disabled prop is true', () => {
    render(<TipTapEditor disabled={true} />)
    // Editor should not be editable
  })

  it('should clear content via clearContent method', () => {
    const ref = createRef<TipTapEditorHandle>()
    render(<TipTapEditor ref={ref} value="initial" />)
    ref.current?.clearContent()
    expect(ref.current?.isEmpty()).toBe(true)
  })
})
```
# Plan 11 - Phase 3: Recipients Row Composition

## Project Context

**Project**: NanoMail - Email client application
**Plan**: Compose Email Modal UI Optimization
**Goal**: Refactor the compose email modal UI to achieve a modern, immersive design with borderless inputs and improved visual hierarchy.

---

## Core Principles

1. **No new features** - Strictly UI restructuring, preserve all existing functionality
2. **Hybrid borderless approach**:
   - Input areas: White background + bottom border + inline layout
   - Toolbar: Light gray background + rounded corners
   - Body: No border, no focus ring
3. **Inline layout** - Labels and inputs on same row for better vertical space utilization

---

## Phase 3 Objective

Compose the recipients section using the refactored `EmailChipInput` component with Cc/Bcc toggle functionality.

---

## Target File

`packages/frontend/src/components/email/ComposeEmailModal.tsx`

---

## Prerequisites

- **Phase 1** completed: Container structure with `isCcExpanded`, `isBccExpanded` state
- **Phase 2** completed: `EmailChipInput` with `id`, `label`, and `trailingActions` props

---

## Implementation Details

### 3.1 State Variables (from Phase 1)

```tsx
const [isCcExpanded, setIsCcExpanded] = useState(false)
const [isBccExpanded, setIsBccExpanded] = useState(false)
```

### 3.2 Derived Visibility

```tsx
const showCcField = isCcExpanded || cc.length > 0
const showBccField = isBccExpanded || bcc.length > 0
```

**Logic**:
- Cc field shows when: user clicks "抄送" OR there are existing Cc emails
- Bcc field shows when: user clicks "密送" OR there are existing Bcc emails

### 3.3 To Field with Cc/Bcc Triggers

```tsx
<EmailChipInput
  id="to-input"
  emails={to}
  onChange={setTo}
  label="收件人"
  placeholder="可搜索邮箱、联系人..."
  disabled={sending}
  trailingActions={
    !showCcField && !showBccField && (
      <div className="flex gap-2 text-sm text-muted-foreground">
        {!showCcField && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsCcExpanded(true)
            }}
            className="hover:text-foreground"
          >
            抄送
          </button>
        )}
        {!showBccField && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsBccExpanded(true)
            }}
            className="hover:text-foreground"
          >
            密送
          </button>
        )}
      </div>
    )
  }
/>
```

**Key Details**:
- `id="to-input"` for accessibility (label linked via `htmlFor`)
- `trailingActions` shows Cc/Bcc buttons only when both fields are hidden
- `e.stopPropagation()` prevents event bubbling to parent

### 3.4 Conditional Cc Field

```tsx
{showCcField && (
  <EmailChipInput
    id="cc-input"
    emails={cc}
    onChange={setCc}
    label="抄送"
    placeholder="输入抄送邮箱..."
    disabled={sending}
  />
)}
```

### 3.5 Conditional Bcc Field

```tsx
{showBccField && (
  <EmailChipInput
    id="bcc-input"
    emails={bcc}
    onChange={setBcc}
    label="密送"
    placeholder="输入密送邮箱..."
    disabled={sending}
  />
)}
```

### 3.6 Complete Recipients Section

```tsx
{/* Inside the scrollable content div from Phase 1 */}
<div className="flex-1 overflow-y-auto flex flex-col">
  {/* To Field */}
  <EmailChipInput
    id="to-input"
    emails={to}
    onChange={setTo}
    label="收件人"
    placeholder="可搜索邮箱、联系人..."
    disabled={sending}
    trailingActions={
      !showCcField && !showBccField && (
        <div className="flex gap-2 text-sm text-muted-foreground">
          {!showCcField && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsCcExpanded(true)
              }}
              className="hover:text-foreground"
            >
              抄送
            </button>
          )}
          {!showBccField && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsBccExpanded(true)
              }}
              className="hover:text-foreground"
            >
              密送
            </button>
          )}
        </div>
      )
    }
  />

  {/* Cc Field (conditional) */}
  {showCcField && (
    <EmailChipInput
      id="cc-input"
      emails={cc}
      onChange={setCc}
      label="抄送"
      placeholder="输入抄送邮箱..."
      disabled={sending}
    />
  )}

  {/* Bcc Field (conditional) */}
  {showBccField && (
    <EmailChipInput
      id="bcc-input"
      emails={bcc}
      onChange={setBcc}
      label="密送"
      placeholder="输入密送邮箱..."
      disabled={sending}
    />
  )}

  {/* Subject field (Phase 4) */}
  {/* Editor (Phase 5) */}
</div>
```

---

## Behavior Flow

```
Initial State:
┌─────────────────────────────────┐
│ 收件人  [to chips...]  抄送 密送 │
└─────────────────────────────────┘

After clicking "抄送":
┌─────────────────────────────────┐
│ 收件人  [to chips...]           │
├─────────────────────────────────┤
│ 抄送    [cc chips...]           │
└─────────────────────────────────┘

After clicking "密送":
┌─────────────────────────────────┐
│ 收件人  [to chips...]           │
├─────────────────────────────────┤
│ 抄送    [cc chips...]           │
├─────────────────────────────────┤
│ 密送    [bcc chips...]          │
└─────────────────────────────────┘
```

---

## Dependencies

- **Phase 1**: Container structure with `flex-1 overflow-y-auto flex flex-col`
- **Phase 2**: `EmailChipInput` component with `id` and `trailingActions` props
- **Phase 4**: Subject field will follow below
- **Phase 5**: Editor will follow at the bottom

---

## Risks and Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Event bubbling on Cc/Bcc buttons | Medium | Add `e.stopPropagation()` to prevent unintended focus events on parent wrappers |
| Cc/Bcc buttons appear when fields already shown | Low | Condition: `!showCcField && !showBccField` |

---

## Verification Checklist

- [ ] To field renders with Cc/Bcc triggers
- [ ] Clicking "抄送" reveals Cc field and hides Cc button
- [ ] Clicking "密送" reveals Bcc field and hides Bcc button
- [ ] Cc/Bcc fields auto-show when they have existing emails
- [ ] All fields have correct `id` for accessibility
- [ ] `e.stopPropagation()` prevents focus issues
- [ ] Dark mode styling is correct
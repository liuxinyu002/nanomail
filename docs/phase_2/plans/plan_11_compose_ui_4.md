# Plan 11 - Phase 4: Subject Field Refactoring

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

## Phase 4 Objective

Refactor the subject field to use inline layout with borderless styling, matching the EmailChipInput aesthetic.

---

## Target File

`packages/frontend/src/components/email/ComposeEmailModal.tsx`

---

## Prerequisites

- **Phase 1** completed: Container structure with scrollable content area
- **Phase 2** completed: EmailChipInput inline layout pattern established
- **Phase 3** completed: Recipients row composition

---

## Implementation Details

### 4.1 Current Implementation

**Before**:
```tsx
<div className="space-y-1.5">
  <Label htmlFor="subject">Subject</Label>
  <Input
    id="subject"
    value={subject}
    onChange={(e) => setSubject(e.target.value)}
    placeholder="Email subject"
    disabled={sending}
  />
</div>
```

### 4.2 Refactored Implementation

**After**:
```tsx
<div className="flex items-start min-h-[44px] border-b border-border/50 focus-within:bg-muted/20">
  <label htmlFor="subject-input" className="text-sm text-muted-foreground min-w-[5rem] flex-shrink-0 px-4 py-3">
    主题
  </label>
  <input
    id="subject-input"
    type="text"
    value={subject}
    onChange={(e) => setSubject(e.target.value)}
    placeholder="邮件主题"
    disabled={sending}
    className="flex-1 py-3 pr-4 outline-none bg-transparent text-sm"
  />
</div>
```

### 4.3 Key Styling Classes

| Element | Classes | Purpose |
|---------|---------|---------|
| Container | `flex items-start min-h-[44px] border-b border-border/50 focus-within:bg-muted/20` | Inline layout with bottom border |
| Label | `text-sm text-muted-foreground min-w-[5rem] flex-shrink-0 px-4 py-3` | Fixed width label with padding |
| Input | `flex-1 py-3 pr-4 outline-none bg-transparent text-sm` | Borderless input |

### 4.4 Key Improvements

- `min-w-[5rem]` for better i18n support (Chinese "主题" needs adequate space)
- `focus-within:bg-muted/20` adds subtle visual feedback for keyboard navigation
- No `Label` component needed - use native `<label>` for simplicity
- No `Input` component needed - use native `<input>` for borderless styling

---

## Complete Section Context

```tsx
{/* Inside the scrollable content div from Phase 1 */}
<div className="flex-1 overflow-y-auto flex flex-col">
  {/* Recipients (Phase 3) */}
  <EmailChipInput id="to-input" ... />
  {showCcField && <EmailChipInput id="cc-input" ... />}
  {showBccField && <EmailChipInput id="bcc-input" ... />}

  {/* Subject (This Phase) */}
  <div className="flex items-start min-h-[44px] border-b border-border/50 focus-within:bg-muted/20">
    <label htmlFor="subject-input" className="text-sm text-muted-foreground min-w-[5rem] flex-shrink-0 px-4 py-3">
      主题
    </label>
    <input
      id="subject-input"
      type="text"
      value={subject}
      onChange={(e) => setSubject(e.target.value)}
      placeholder="邮件主题"
      disabled={sending}
      className="flex-1 py-3 pr-4 outline-none bg-transparent text-sm"
    />
  </div>

  {/* Editor (Phase 5) */}
  <TipTapEditor ... />
</div>
```

---

## Imports to Remove

If `Label` and `Input` are no longer used elsewhere in the component:

```tsx
// Remove these if unused:
// import { Label } from '@/components/ui/label'
// import { Input } from '@/components/ui/input'
```

---

## Dependencies

- **Phase 1**: Container structure with `flex-1 overflow-y-auto flex flex-col`
- **Phase 3**: Recipients section above subject field
- **Phase 5**: Editor section below subject field

---

## Risks and Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Subject input loses accessibility linkage | High | Preserve `id` and `htmlFor` attributes on label/input pair |
| Label width too tight for i18n | Medium | Use `min-w-[5rem]` instead of `w-16` |
| Missing visual focus feedback | Medium | `focus-within:bg-muted/20` on container |

---

## Verification Checklist

- [ ] Subject field appears on same row as label
- [ ] `min-w-[5rem]` accommodates Chinese label "主题"
- [ ] Click on label focuses the input
- [ ] Screen reader can associate label with input
- [ ] Bottom border matches EmailChipInput styling
- [ ] Focus state shows subtle background change
- [ ] Dark mode styling is correct
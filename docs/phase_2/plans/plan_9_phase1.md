# Plan 9 - Phase 1: Create Dialog Component

> **Parent Plan**: [plan_9.md](./plan_9.md)
> **Status**: Ready for Implementation
> **Dependencies**: None

---

## Objective

Create a reusable Dialog component using Radix UI primitives.

## Why

Provide a consistent modal pattern across the application. The Sheet component already uses `@radix-ui/react-dialog`, so we follow the same pattern.

---

## Target File

`/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/components/ui/dialog.tsx`

---

## Dependencies

- `@radix-ui/react-dialog` (already installed v1.1.15)

### Optional Dependency

```bash
pnpm --filter @nanomail/frontend add @radix-ui/react-visually-hidden
```

Alternatively, use Tailwind's `sr-only` utility class for visually hidden elements.

---

## Risk Level

**Low**

---

## Key Implementation Details

### 1. Radix UI Primitives

Use `DialogPrimitive.Root`, `DialogPrimitive.Portal`, `DialogPrimitive.Overlay`, `DialogPrimitive.Content`

### 2. Centered Positioning

```tsx
className="left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]"
```

### 3. Animation Classes

- fade-in/out + zoom-in/out (95% scale) + slight slide-up
- `data-[state=open]:animate-in data-[state=closed]:animate-out`
- `data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`
- `data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95`
- `data-[state=closed]:slide-out-to-bottom-1 data-[state=open]:slide-in-from-bottom-2`

### 4. Layout Constraints

- Max height: `max-h-[85vh]`
- Flex layout: header (shrink-0) + content (flex-1 overflow-y-auto)
- Mobile responsive: `w-[calc(100vw-2rem)]` ensures 1rem safe margin on each side for screens < 640px

### 5. DialogContent Key Styles

```tsx
<DialogPrimitive.Content
  className={cn(
    "fixed left-[50%] top-[50%] z-50 grid w-[calc(100vw-2rem)] sm:w-full max-w-lg",
    "translate-x-[-50%] translate-y-[-50%]",
    "gap-4 border bg-background p-6 shadow-lg duration-200",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[state=closed]:slide-out-to-bottom-1 data-[state=open]:slide-in-from-bottom-2",
    "max-h-[85vh] flex flex-col"
  )}
>
```

---

## Accessibility Requirements (CRITICAL)

> **⚠️ Radix UI will throw console warnings if `DialogTitle` and `DialogDescription` are missing!**
>
> Radix UI has strict accessibility requirements. Both `DialogTitle` and `DialogDescription` must be present in the DOM for screen readers, even when visual descriptions aren't needed.

### Using @radix-ui/react-visually-hidden

```tsx
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

<DialogPrimitive.Content>
  <DialogPrimitive.Title>Date Todos</DialogPrimitive.Title>
  {/* If description is not visually needed, hide it but keep in DOM */}
  <DialogPrimitive.Description asChild>
    <VisuallyHidden>
      View and manage todos for selected date
    </VisuallyHidden>
  </DialogPrimitive.Description>
  {/* Rest of content... */}
</DialogPrimitive.Content>
```

### Using Tailwind sr-only (Alternative)

```tsx
<DialogPrimitive.Description className="sr-only">
  View and manage todos for selected date
</DialogPrimitive.Description>
```

---

## Acceptance Criteria

- [ ] Dialog component created at `components/ui/dialog.tsx`
- [ ] Uses `@radix-ui/react-dialog` primitives
- [ ] Centered positioning with translate
- [ ] Open/close animations work smoothly
- [ ] Max height constraint of 85vh
- [ ] Flex layout with sticky header support
- [ ] Mobile responsive with safe margins
- [ ] DialogTitle always present in DOM
- [ ] DialogDescription always present (visually hidden if not needed)
- [ ] No console warnings about missing accessible name

---

## Next Phase

[Phase 2: Create TodoDayModal Component](./plan_9_phase2.md)
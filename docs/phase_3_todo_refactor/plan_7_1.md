# Phase 1: Create TodoDetailPopover Component

> Part of [Plan 7: Popover-Based Todo Detail Viewing in Planner](./plan_7.md)

## Project Overview

Implement a Popover overlay pattern for viewing todo details in the Planner component (DayView/WeekView). The current inline expansion causes UI overlap issues in the compact scheduler view. The solution uses Radix UI's Popover component to display todo details in a floating overlay with smart positioning and collision detection.

## Requirements Reference

- **R1**: Popover Pattern - Use floating overlay instead of inline expansion for todo details
- **R2**: Read-only Mode - Detail content in popover must be read-only, NOT editable
- **R3**: Smart Positioning - Priority right placement with collision detection to flip left/top/bottom
- **R4**: Existing Infrastructure - Reuse existing Popover, TaskDetailExpand, and PlannerTodoCard components

## Task: Create TodoDetailPopover Component

**File**: `packages/frontend/src/features/todos/TodoCard/TodoDetailPopover.tsx`

**Action**: Create new wrapper component that wraps TaskDetailExpand in a Popover

**Why**: Separate popover presentation logic from content, enable reuse

**Dependencies**: None (uses existing Popover and TaskDetailExpand)

**Risk**: Low

---

## Component Structure

```
TodoDetailPopover
├── Popover.Root (Radix)
│   ├── Popover.Trigger (asChild)
│   │   └── {children} - The trigger element (TodoCard)
│   └── Popover.Portal
│       └── Popover.Content
│           ├── Popover.Arrow (NEW) - Points to the trigger element
│           ├── Header (Title + Close button)
│           └── TaskDetailExpand (readonly=true)
```

## UI Specifications

| Property | Value | Tailwind Classes |
|----------|-------|------------------|
| Width | 320px fixed | `w-80` |
| Max Height | 400px | `max-h-[400px] overflow-y-auto` |
| Background | White | `bg-white` |
| Border | Gray 200 | `border border-gray-200` |
| Shadow | Large | `shadow-lg` |
| Border Radius | Medium | `rounded-md` |
| Z-Index | 1000+ | `z-[1000]` |
| Animation In | 150ms fade | `data-[state=open]:animate-in fade-in duration-150` |
| Animation Out | 100ms fade | `data-[state=closed]:animate-out fade-out duration-100` |
| Position | side="right" | priority right |
| Alignment | align="start" | top alignment |
| Offset | sideOffset=8 | 8px from trigger |
| Arrow | Required | `<Popover.Arrow className="fill-white dark:fill-gray-800" />` |
| Arrow Width | 10px | Default Radix arrow size |
| Arrow Height | 5px | Default Radix arrow height |

## Arrow Implementation Details

The `<Popover.Arrow />` component creates a visual pointer from the popover content to the trigger element, making the popover appear as a true "speech bubble". This improves visual clarity and user experience.

```tsx
// Inside Popover.Content
<Popover.Content
  className="z-[1000] w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
  side="right"
  align="start"
  sideOffset={8}
>
  {/* Arrow must be first child of Content for proper positioning */}
  <Popover.Arrow className="fill-white dark:fill-gray-800" width={10} height={5} />

  {/* Header and content follow */}
  <div className="flex items-center justify-between mb-3">
    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
      {todo.title}
    </h4>
    <Popover.Close className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
      <XIcon className="h-4 w-4" />
      <span className="sr-only">Close details</span>
    </Popover.Close>
  </div>

  <TaskDetailExpand todo={todo} readonly />
</Popover.Content>
```

## Arrow Color Configuration

| Mode | Fill Color | Tailwind Class |
|------|------------|-----------------|
| Light | `white` | `fill-white` |
| Dark | `gray-800` | `dark:fill-gray-800` |

> **Important**: The arrow's `fill` color MUST match the popover's background color (`bg-white` / `dark:bg-gray-800`). If colors don't match, there will be a visible gap between the arrow and the popover body.

## Mobile Responsiveness Note

The side-positioned Popover (`side="right"`, `w-80`) works well on desktop. For mobile screens (<640px), consider:

1. **If mobile support is required**: Replace Popover with a bottom sheet (Drawer) or centered Dialog on small screens
2. **If desktop-only**: Document the constraint and ensure Radix's collision detection handles edge cases
3. **Breakpoint suggestion**: `sm:hidden` for Popover, `hidden sm:block` for an alternative mobile component

## Props Interface

```typescript
interface TodoDetailPopoverProps {
  todo: Todo
  children: React.ReactNode // The trigger element
}
```

## Component Relationships

```
PlannerPanel
├── DayView / WeekView
│   └── HourSlot
│       └── PlannerTodoCard
│           └── TodoDetailPopover (NEW - THIS PHASE)
│               ├── Popover.Trigger → TodoCard (compact, readonly)
│               └── Popover.Content
│                   └── TaskDetailExpand (readonly=true)
```

## Test Requirements

Create `TodoDetailPopover.test.tsx` with the following tests:

- Renders with correct testid
- Shows TaskDetailExpand content in readonly mode
- Close button dismisses popover
- Close button has `aria-label="Close details"` for accessibility
- Positioning attributes applied correctly
- Animation classes present
- **Arrow renders with correct fill colors**: Verify `<Popover.Arrow>` is present and has `fill-white` / `dark:fill-gray-800` classes matching the content background

## Related Phases

- **Next**: [Phase 2: Update PlannerTodoCard Integration](./plan_7_2.md)
- **Previous**: None (This is the first phase)

## Related Documents

- [Plan 5: Todo Card Detail Expansion](./plan_5.md)
- [Plan 6: Todo Group Color Synchronization](./plan_6.md)
- [Design System](../../SPEC/design-system.md)
- [Radix Popover Documentation](https://www.radix-ui.com/docs/primitives/components/popover)
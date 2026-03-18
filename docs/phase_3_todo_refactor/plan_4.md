# Implementation Plan: UI Refactoring for Todo Items and Board Components

## Overview

This plan outlines the comprehensive UI refactoring for the todo board components, focusing on visual purification, card optimization, inline expansion, and empty state design. The goal is to create a clean, modern Kanban-style interface with macaron/pastel color aesthetics while maintaining strict design system compliance.

---

## Requirements

### Priority 1: Board Column Background Purification
- **Column background**: Fixed to `#F7F8FA` using `bg-[#F7F8FA]`, remove high-saturation custom colors
- **Remove `column.color` background binding**: Column color no longer applies to entire column background
- **Status dot**: Add a small status indicator dot (w-2 h-2 rounded-full) on the LEFT side of column title
  - Use `flex items-center gap-2` for alignment
  - Bind `column.color` only to this dot's background
  - Use pastel/macaron color palette (lower saturation)
- **Spacing**: Ensure adequate margin between header and first card to avoid shadow clipping

### Priority 2: Todo Card Deep Optimization
- **Card container**: White background `bg-white`, remove heavy left border, add soft shadow
- **Shadow spec**: `shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]` - NO hard borders
- **Text hierarchy**:
  - Main title: `text-[#111827] font-medium`, default `line-clamp-2`, expand to full text
  - Secondary text: `text-[#6B7280] text-sm`
- **Deadline**: Show with calendar icon, conditional render
- **Email link**: Small icon, hover shows brand Vibrant Blue `#2563EB`
- **Completed state**: `line-through` + `opacity-50`
- **No priority tag** (removed from scope - priority determined by sort order)
- **Checkbox**: Use brand Vibrant Blue `#2563EB` for checked state

### Priority 3: Card Inline Expansion (UI Only)
- **NO database schema changes**: Only expand to display existing data (Description, etc.)
- **Expand behavior**: Click card body (excluding interactive zones) to expand inline
- **Drag vs Click conflict resolution** (优先级排序):
  1. **方案 A（推荐）: 专用拖拽把手 (Drag Handle)**
     - 为卡片添加独立的拖拽把手区域（如 `⋮⋮` 图标）
     - 卡片主体保留 onClick 展开事件
     - 最优雅简洁，无延迟，零冲突
  2. **方案 B: dnd-kit Sensors + 位移阈值**
     - 利用 dnd-kit 的 `useSensor` + `activationConstraint`
     - 配置 `distance: 5` (px)，通过位移而非时间区分拖拽和点击
     - 用户移动超过 5px 才触发拖拽，否则视为点击展开
     - PC 端无延迟感，体验流畅
  3. **方案 C: 交互区 stopPropagation**
     - 交互区（checkbox、dropdown trigger）直接 `stopPropagation()` 阻止拖拽
     - 非交互区支持点击展开
- **Animation**: Use `grid-template-rows` for smooth 200-300ms transition
- **Visual separation**: Expand area background `bg-[#F7F8FA]/50`

### Priority 4: Card Dropdown Menu
- **Trigger**: `...` icon (three dots) in top-right corner of card
- **Dropdown container**:
  - Background: `bg-white`
  - Shadow: `shadow-lg` (light, soft)
  - No border (clean edge)
  - Radius: `rounded-md`
- **Animation**:
  - Enter: `fade-in` + `translate-y-[-4px]` → final position, `duration-150 ease-out`
  - Leave: `fade-out` + translate down, `duration-100 ease-in`
- **Menu items**: `px-3 py-2 text-left text-[#111827] hover:bg-[#F7F8FA] transition-colors`
- **Actions**: Edit, Delete, Move to column, Set deadline

### Priority 5: Information Density
- **Card container padding**: `p-4` (16px)
- **Element gaps**: `gap-2` (8px) between elements
- **Section gaps**: `gap-3` (12px) between header and metadata
- **Column internal padding**: `p-3` (12px)
- **Card margin bottom**: `mb-2` (8px)
- **Title**: Default `line-clamp-2`, expand state shows full text
- **"Breathing room"**: Adequate whitespace, no cramped layouts

### Priority 6: Empty State Illustration
- **Style**: Flat SVG-based or pure typography with macaron/pastel colors
- **NO 3D assets or fictional micro-stereo elements**
- **Size**: 120-160px height
- **Layout**: Vertically centered at ~1/3 position
- **Text style**: `text-[#6B7280] text-sm` (light gray, not dark)
- **Component**: Create reusable `EmptyState` component with SVG illustration
- **Condition**: Show when `todos.length === 0 && !isDragging`

---

## Architecture Changes

### Component Structure

```
packages/frontend/src/features/todos/
├── BoardColumnDroppable.tsx     # MODIFIED: Fixed background bg-[#F7F8FA]
├── ColumnHeader.tsx             # MODIFIED: Add status dot on LEFT
├── TodoItem.tsx                 # MODIFIED: Complete redesign with expansion
├── DraggableTodoItem.tsx        # MODIFIED: Handle expand/drag conflict
├── ColorPicker.tsx              # MODIFIED: Update to macaron palette
├── EmptyState.tsx               # NEW: SVG-based empty state
├── CardDropdownMenu.tsx         # NEW: Dropdown menu with animations
└── TodoCard/
    ├── index.ts                 # NEW: Barrel export
    ├── TodoCard.tsx             # NEW: Main card with expansion
    ├── TodoCardHeader.tsx       # NEW: Checkbox + title + dropdown trigger
    ├── TodoCardContent.tsx      # NEW: Metadata + expand area
    └── TodoCard.test.tsx        # NEW: Tests
```

---

## Implementation Steps

### Phase 1: Color Palette & Constants

#### Step 1.1: Create Macaron Color Palette
- **File**: `packages/frontend/src/constants/colors.ts` (NEW)
- **Action**: Define pastel/macaron color palette for status dots
- **Content**:
  ```typescript
  export const MACARON_COLORS = [
    '#FFB5BA', // Pastel Red
    '#FFD8A8', // Pastel Orange
    '#FFF4B8', // Pastel Yellow
    '#B8E6C1', // Pastel Green
    '#B8D4FF', // Pastel Blue
    '#D4B8FF', // Pastel Purple
  ] as const
  ```
- **Dependencies**: None
- **Risk**: Low

#### Step 1.2: Update ColorPicker to Macaron Palette
- **File**: `packages/frontend/src/features/todos/ColorPicker.tsx`
- **Action**: Replace `PRESET_COLORS` with `MACARON_COLORS`
- **Dependencies**: Step 1.1
- **Risk**: Low

---

### Phase 2: Column Background Purification

#### Step 2.1: Update BoardColumnDroppable
- **File**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`
- **Action**:
  - Fix background to `bg-[#F7F8FA]`
  - Remove dynamic color binding from column background
  - Add `p-3` internal padding
- **Why**: Clean, consistent column appearance
- **Dependencies**: None
- **Risk**: Low

#### Step 2.2: Update ColumnHeader with Status Dot
- **File**: `packages/frontend/src/features/todos/ColumnHeader.tsx`
- **Action**:
  - Move color dot to LEFT of column name
  - Use smaller dot: `w-2 h-2 rounded-full`
  - Layout: `flex items-center gap-2`
- **Why**: Status indicator without heavy column coloring
- **Dependencies**: Step 1.1
- **Risk**: Low

---

### Phase 3: Card Dropdown Menu

#### Step 3.1: Create CardDropdownMenu Component
- **File**: `packages/frontend/src/features/todos/CardDropdownMenu.tsx` (NEW)
- **Action**: Create dropdown menu with specified animations
- **Key implementations**:
  ```tsx
  // Trigger button
  <button className="p-1 rounded hover:bg-[#F7F8FA]">
    <MoreHorizontal className="w-4 h-4 text-[#6B7280]" />
  </button>

  // Dropdown container
  <div className="
    bg-white shadow-lg rounded-md
    animate-in fade-in duration-150 ease-out
    data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:duration-100
    translate-y-[-4px] data-[state=open]:translate-y-0
  ">
    {items.map(item => (
      <button className="w-full px-3 py-2 text-left text-[#111827] hover:bg-[#F7F8FA] transition-colors">
        {item.label}
      </button>
    ))}
  </div>
  ```
- **Dependencies**: None
- **Risk**: Low

---

### Phase 4: Todo Card Redesign

#### Step 4.1: Create TodoCard Component Structure
- **File**: `packages/frontend/src/features/todos/TodoCard/index.ts`
- **Action**: Create barrel export file
- **Dependencies**: None
- **Risk**: Low

#### Step 4.2: Create TodoCardHeader Component
- **File**: `packages/frontend/src/features/todos/TodoCard/TodoCardHeader.tsx`
- **Action**: Create header with checkbox, title, and dropdown trigger
- **Key implementations**:
  ```tsx
  <div className="flex items-start gap-3">
    {/* Checkbox with brand color */}
    <Checkbox
      className="border-[#6B7280] data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
    />

    {/* Title with line-clamp-2 */}
    <p className="flex-1 text-[#111827] font-medium line-clamp-2">
      {description}
    </p>

    {/* Dropdown trigger */}
    <CardDropdownMenu />
  </div>
  ```
- **Dependencies**: Step 3.1
- **Risk**: Low

#### Step 4.3: Create Main TodoCard Component
- **File**: `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx`
- **Action**: Create main card with expansion animation
- **Key implementations**:
  ```tsx
  <div className="
    bg-white rounded-md
    shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]
    p-4 mb-2
    transition-shadow hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.08)]
  ">
    {/* Header: checkbox + title + dropdown */}
    <TodoCardHeader />

    {/* Expandable content area */}
    <div className="
      grid transition-[grid-template-rows] duration-300 ease-out
      [grid-template-rows:0fr] data-[expanded=true]:[grid-template-rows:1fr]
    ">
      <div className="overflow-hidden">
        <div className="pt-3 mt-3 border-t border-[#E5E7EB] bg-[#F7F8FA]/50 -mx-4 px-4 pb-2">
          {/* Expand content: existing description, etc. */}
        </div>
      </div>
    </div>
  </div>
  ```
- **Dependencies**: Step 4.2
- **Risk**: Medium

#### Step 4.4: Create Supporting Components
- **Files**:
  - `packages/frontend/src/features/todos/TodoCard/DeadlineChip.tsx`
  - `packages/frontend/src/features/todos/TodoCard/EmailLinkIcon.tsx`
- **Action**: Create deadline chip and email link icon
- **Key implementations**:
  ```tsx
  // DeadlineChip
  <span className="flex items-center gap-1 text-[#6B7280] text-sm">
    <Calendar className="w-3.5 h-3.5" />
    {formatDeadline(deadline)}
  </span>

  // EmailLinkIcon
  <a
    href={`/emails/${emailId}`}
    className="text-[#6B7280] hover:text-[#2563EB] transition-colors"
  >
    <ExternalLink className="w-3.5 h-3.5" />
  </a>
  ```
- **Dependencies**: None
- **Risk**: Low

---

### Phase 5: Drag vs Expand Conflict Resolution

#### Step 5.1: Update DraggableTodoItem
- **File**: `packages/frontend/src/features/todos/DraggableTodoItem.tsx`
- **Action**: Implement conflict resolution strategy
- **推荐方案: 专用拖拽把手 (Drag Handle)**
  ```tsx
  // 最简洁方案：专用拖拽把手
  <div className="flex items-center gap-2">
    {/* Drag Handle - 仅此区域可拖拽 */}
    <button
      className="cursor-grab active:cursor-grabbing p-1 text-[#9CA3AF] hover:text-[#6B7280]"
      {...attributes}  // dnd-kit attributes 仅绑定到把手
    >
      <GripVertical className="w-4 h-4" />
    </button>

    {/* Card body - 可点击展开 */}
    <div onClick={handleExpand} className="flex-1 cursor-pointer">
      <TodoCard {...props} />
    </div>
  </div>
  ```
- **备选方案: dnd-kit Sensors 位移阈值**
  ```tsx
  // 使用 displacement 而非 time 来区分拖拽和点击
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 移动超过 5px 才触发拖拽
      },
    }),
    useSensor(KeyboardSensor)
  )

  // 配合 DndContext
  <DndContext sensors={sensors} {...otherProps}>
    {/* ... */}
  </DndContext>
  ```
  - **优势**: 无 setTimeout 延迟，PC 端响应即时
  - **原理**: 用户移动超过阈值才视为拖拽意图，否则识别为点击
- **交互区 stopPropagation（辅助方案）**:
  ```tsx
  // Interactive zones stop propagation
  const handleInteractiveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Handle action (checkbox, dropdown)
  }
  ```
- **Dependencies**: Phase 4
- **Risk**: Low - 使用 dnd-kit 原生能力，无需自定义时间检测

---

### Phase 6: Empty State Component

#### Step 6.1: Create EmptyState Component
- **File**: `packages/frontend/src/features/todos/EmptyState.tsx` (NEW)
- **Action**: Create SVG-based flat empty state with macaron colors
- **Key implementations**:
  ```tsx
  <div className="flex flex-col items-center justify-center py-12">
    {/* SVG Illustration - flat, macaron colors */}
    <svg className="w-32 h-32 mb-4" viewBox="0 0 128 128">
      {/* Simple geometric shapes with pastel fills */}
      <circle cx="64" cy="64" r="40" fill="#B8D4FF" opacity="0.6" />
      <rect x="44" y="50" width="40" height="28" rx="4" fill="#B8E6C1" opacity="0.8" />
      {/* ... more shapes */}
    </svg>

    {/* Text */}
    <p className="text-[#6B7280] text-sm">
      {message || 'No tasks yet'}
    </p>
  </div>
  ```
- **Dependencies**: None
- **Risk**: Low

#### Step 6.2: Integrate EmptyState into BoardColumnDroppable
- **File**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`
- **Action**: Show EmptyState when column is empty and not dragging
- **Dependencies**: Step 6.1
- **Risk**: Low

---

### Phase 7: Legacy Component Migration

#### Step 7.1: Update Old TodoItem
- **File**: `packages/frontend/src/features/todos/TodoItem.tsx`
- **Action**: Refactor to use new card design
- **Dependencies**: Phase 4, Phase 5
- **Risk**: Medium

#### Step 7.2: Update All Imports
- **Action**: Verify all consumers use updated components
- **Dependencies**: Step 7.1
- **Risk**: Low

---

## Testing Strategy

### Unit Tests
- **TodoCard**: Rendering, expansion animation, line-clamp behavior
- **CardDropdownMenu**: Animation, click outside, menu actions
- **ColumnHeader**: Status dot positioning, color binding
- **BoardColumnDroppable**: Fixed background, EmptyState condition
- **EmptyState**: SVG rendering, text styling

### Integration Tests
- Drag and drop with expansion state (conflict resolution)
- Dropdown menu interactions during drag
- Three-panel sync (Inbox/Planner/Board)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Expansion animation performance | Use `will-change: grid-template-rows` |
| Drag vs expand conflict | 方案A: 专用 Drag Handle（推荐）或 方案B: dnd-kit `activationConstraint.distance` 位移阈值 |
| EmptyState during drag | Check `isOver` state before showing |
| Color palette migration | Map old colors to nearest macaron equivalent |
| Dropdown z-index issues | Use portal for dropdown rendering |

---

## Success Criteria

- [ ] Column background fixed to `bg-[#F7F8FA]`
- [ ] Status dot (w-2 h-2) shows on left of column title
- [ ] Todo card has white background with soft shadow `shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]`
- [ ] No hard borders on cards
- [ ] Cards expand inline with smooth animation (no schema changes)
- [ ] Title uses `line-clamp-2` by default, full text on expand
- [ ] Text hierarchy: main `text-[#111827] font-medium`, secondary `text-[#6B7280] text-sm`
- [ ] Card padding `p-4`, element gaps `gap-2`, section gaps `gap-3`
- [ ] Dropdown menu has white background, soft shadow, fade + translate animation
- [ ] Checkbox uses brand Vibrant Blue `#2563EB`
- [ ] EmptyState uses SVG-based flat illustration with macaron colors
- [ ] Drag vs expand conflict resolved with proper event handling
- [ ] All tests pass with 80%+ coverage

---

## Implementation Order

1. **Phase 1**: Color Palette & Constants
2. **Phase 2**: Column Background Purification
3. **Phase 3**: Card Dropdown Menu
4. **Phase 4**: Todo Card Redesign
5. **Phase 5**: Drag vs Expand Conflict Resolution
6. **Phase 6**: Empty State Component
7. **Phase 7**: Legacy Component Migration
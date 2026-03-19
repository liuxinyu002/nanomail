# Plan 6 Phase 2: Frontend - ColumnHeader Redesign

> Part of: Phase 3 Todo Refactor - [Plan 6 Overview](./plan_6.md)

## Overview

实现 Todo 分组颜色同步功能，使 Board 列的颜色能够体现在 UI 的各个层面。采用**关系映射**架构，通过 JOIN 查询动态获取颜色，避免数据冗余和同步复杂度。

### 核心需求

| # | 需求 | 描述 |
|---|------|------|
| 1 | Board 列颜色 UI | 更改颜色时更新头部背景，移除颜色徽标 |
| 2 | Todo 颜色字段 | **API 响应中动态计算**，不物理存储 |
| 3 | Planner 颜色指示栏 | 左侧颜色条读取 Todo 的 color 字段 |

---

## UI Design Specifications

### Board Column Styling

```
┌─────────────────────────────────────┐
│  Column Header (列颜色背景)          │
│  ┌─────────────────────────────────┐│
│  │ [标题]                    [n] ⋮ ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  Card Area (列颜色 12% 透明度)       │
│  ┌─────────────────────────────────┐│
│  │ [白底卡片 + shadow-sm]           ││
│  │ Task description here...        ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ [白底卡片 + shadow-sm]           ││
│  │ Another task...                 ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**关键点**：
- 头部背景：列颜色 `#HEX`
- 卡片区域背景：列颜色 `opacity: 0.12`（CSS 透明度叠加）
- 待办卡片：纯白 `#FFFFFF` + 轻微阴影 `shadow-sm`
- 移除：2x2 小圆点颜色徽标

---

## Phase 2: Frontend - ColumnHeader Redesign

> Risk: Low
> Dependencies: None (can be done in parallel with Phase 1)

### Task 2.1: Update ColumnHeader Component

**File**: `packages/frontend/src/features/todos/ColumnHeader.tsx`

**Action**: Redesign with colored background, remove color badge

```typescript
import { cn } from '@/lib/utils'

// Fallback color when column.color is null
const FALLBACK_HEADER_COLOR = '#F3F4F6' // gray-100
const FALLBACK_TEXT_CLASS = 'text-gray-900'

/**
 * Determine text color based on background color luminance
 * Returns 'text-gray-900' for light backgrounds, 'text-white' for dark
 */
function getTextColorForBackground(hexColor: string | null): string {
  if (!hexColor) return FALLBACK_TEXT_CLASS

  // Parse hex color
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Macaron colors are typically light, so use dark text
  return luminance > 0.5 ? 'text-gray-900' : 'text-white'
}

export function ColumnHeader({
  column,
  itemCount,
  onRename,
  onColorChange,
  onDelete,
  isEditing: isEditingExternal,
  onStartEdit,
  onEndEdit,
}: ColumnHeaderProps) {
  // ... existing state logic ...

  const backgroundColor = column.color ?? FALLBACK_HEADER_COLOR
  const textColorClass = getTextColorForBackground(column.color)

  return (
    <div
      data-testid="column-header"
      className={cn(
        'p-3 border-b flex items-center justify-between group',
        textColorClass
      )}
      style={{ backgroundColor }}
    >
      {/* Left side: name only (no color dot) */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(
              'w-full px-1 py-0.5 text-sm font-medium border rounded outline-none',
              'border-gray-400 focus:ring-1 focus:ring-gray-500',
              'bg-white/50'
            )}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3
            className="font-medium text-sm cursor-pointer"
            onDoubleClick={handleDoubleClick}
          >
            {column.name}
          </h3>
        )}
      </div>

      {/* Right side: count and settings */}
      <div className="flex items-center gap-2">
        <span className="text-sm opacity-75">
          {itemCount}
        </span>

        {/* Settings popover - same as before */}
        <Popover>
          {/* ... existing popover content ... */}
        </Popover>
      </div>

      {/* Delete Confirmation Dialog - same as before */}
    </div>
  )
}
```

**Key Changes**:
1. Remove the 2x2 color dot (`column-color-indicator`)
2. Add `backgroundColor` style to header container
3. Dynamic text color based on background luminance
4. Keep all existing functionality (edit, settings menu, delete dialog)

---

## Files Changed (Phase 2)

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/ColumnHeader.tsx` | MODIFY |

---

## Testing Checklist (Phase 2)

- [ ] ColumnHeader renders with colored background
- [ ] ColumnHeader color badge removed
- [ ] ColumnHeader text readable on all macaron colors
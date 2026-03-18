# Phase 1: Color Palette & Constants

> Part of: [UI Refactoring Plan 4](./plan_4.md) - Todo Items and Board Components

## Context

This phase establishes the foundational color palette for the entire UI refactoring. The macaron/pastel color system will be used across:
- Column status dots (Phase 2)
- ColorPicker component updates
- EmptyState SVG illustrations (Phase 6)

## Requirements

### From Plan Overview
- **Status dot**: Use pastel/macaron color palette (lower saturation)
- **ColorPicker**: Update to macaron palette

### Design System Alignment
Refer to [`docs/SPEC/design-system.md`](../../SPEC/design-system.md) for:
- Color naming conventions
- Accessibility requirements
- Theme consistency

---

## Implementation Steps

### Step 1.1: Create Macaron Color Palette

**File**: `packages/frontend/src/constants/colors.ts` (NEW)

**Action**: Define pastel/macaron color palette for status dots

**Content**:
```typescript
/**
 * Macaron/Pastel color palette for UI elements
 * Lower saturation for softer, modern appearance
 */
export const MACARON_COLORS = [
  '#FFB5BA', // Pastel Red
  '#FFD8A8', // Pastel Orange
  '#FFF4B8', // Pastel Yellow
  '#B8E6C1', // Pastel Green
  '#B8D4FF', // Pastel Blue
  '#D4B8FF', // Pastel Purple
] as const

export type MacaronColor = (typeof MACARON_COLORS)[number]

/**
 * Brand colors (from SPEC)
 */
export const BRAND_COLORS = {
  vibrantBlue: '#2563EB',  // Primary action color
  textPrimary: '#111827',  // Main text
  textSecondary: '#6B7280', // Secondary text
  background: '#F7F8FA',   // Column background
} as const
```

**Dependencies**: None

**Risk**: Low

---

### Step 1.2: Update ColorPicker to Macaron Palette

**File**: `packages/frontend/src/features/todos/ColorPicker.tsx`

**Action**: Replace `PRESET_COLORS` with `MACARON_COLORS`

**Changes**:
1. Import `MACARON_COLORS` from `@/constants/colors`
2. Replace existing color presets with macaron palette
3. Update any color preview styling if needed

**Example**:
```typescript
import { MACARON_COLORS } from '@/constants/colors'

// Replace PRESET_COLORS usage
const colorOptions = MACARON_COLORS.map(color => ({
  value: color,
  label: color, // or add descriptive labels
}))
```

**Dependencies**: Step 1.1

**Risk**: Low

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/constants/colors.ts` | CREATE |
| `packages/frontend/src/features/todos/ColorPicker.tsx` | MODIFY |

---

## Testing Checklist

- [ ] Color constants are properly typed
- [ ] ColorPicker renders all macaron colors
- [ ] Colors are accessible (sufficient contrast)
- [ ] No TypeScript errors after import

---

## Next Phase

→ [Phase 2: Column Background Purification](./plan_4_2.md)

---

## Related Phases

- **Phase 2**: Uses `MACARON_COLORS` for status dots
- **Phase 4**: Uses `BRAND_COLORS` for card elements
- **Phase 6**: Uses macaron colors for EmptyState SVG
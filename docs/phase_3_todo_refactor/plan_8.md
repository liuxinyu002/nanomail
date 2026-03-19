# Implementation Plan: Todo Drag-and-Drop Enhancements (Revised)

## Overview

Enhance the Board column droppable functionality with improved UX: extended drag area, dynamic height, sortable task badges, and better visual feedback during drag operations.

---

## Requirements Summary

| Requirement | Description |
|-------------|-------------|
| R1 | Extended Drag Area - Droppable zone covers entire column content area |
| R2 | Dynamic Column Height - Use `flex-1` + `h-full` to fill column space |
| R3 | Sortable Task Badges - Ordinal badges with hover-to-drag interaction |
| R4 | Improved Drag Feedback - Drop indicators, no column-wide dimming |

---

## Implementation Phases

| Phase | File | Description | Complexity |
|-------|------|-------------|------------|
| **Phase 1** | [plan_8_1.md](./plan_8_1.md) | Extend Droppable Area to Full Column Height | LOW (1h) |
| **Phase 2** | [plan_8_2.md](./plan_8_2.md) | Internal Ordinal Badge with Hover-to-Drag Interaction | MEDIUM (2h) |
| **Phase 3** | [plan_8_3.md](./plan_8_3.md) | Drop Indicator for Sortable Context | LOW (1h) |
| **Phase 4** | [plan_8_4.md](./plan_8_4.md) | Real-time Badge Updates During Drag | MEDIUM (1-2h, Optional) |

---

## File Changes Summary

| File | Change Type | Phases |
|------|-------------|--------|
| `BoardColumnDroppable.tsx` | Modify | 1, 3 |
| `DraggableTodoItem.tsx` | Modify | 2 |
| `TodoItem.tsx` | Modify | 2 |
| `TodoCardHeader.tsx` | Modify | 2 |
| `DropIndicator.tsx` | New | 3 |

---

## Implementation Order

1. **Phase 1**: Extend droppable area (quick win, high impact)
2. **Phase 2**: Internal badge with hover-swap (UX improvement)
3. **Phase 3**: Drop indicator (polish)
4. **Phase 4**: Real-time badge updates (optional enhancement)

---

## Estimated Total Effort: 5-7 hours

- Phase 1: 1 hour
- Phase 2: 2 hours
- Phase 3: 1 hour
- Phase 4: 1-2 hours (optional)
- Testing: 1-2 hours
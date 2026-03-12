# Phase 4: Frontend Interaction & Workspace

> **Context:** Build out the single-page application UI with a focus on a clean, minimalist "Vibe" aesthetic using Shadcn and Tailwind.

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 4 of 5 |
| **Focus Area** | React frontend, UI components, user interactions |
| **Total Tasks** | 8 subtasks across 4 task groups |
| **Dependencies** | Phase 3 (AI Engine & Agent Core) |
| **Estimated Effort** | 3-4 days |

---

## Phase Structure

| Part | Task Group | Focus | Effort | File |
|------|------------|-------|--------|------|
| 4.1 | T10 | UI Layout & Settings Dashboard | 1 day | [plan_4_1.md](./plan_4_1.md) |
| 4.2 | T11 | Vibe Inbox & AI Trigger | 1 day | [plan_4_2.md](./plan_4_2.md) |
| 4.3 | T12 | Smart To-Do Dashboard | 0.5-1 day | [plan_4_3.md](./plan_4_3.md) |
| 4.4 | T13 | Agent Intent Editor | 1-1.5 days | [plan_4_4.md](./plan_4_4.md) |

---

## Dependency Graph

```
T10 (UI Layout) ──┬── T11 (Inbox & AI Trigger) ──┐
                  │                              │
                  └── T12 (To-Do Dashboard) ────┴── T13 (Agent Editor)
                                                         │
                                                         ├── T9 (ReAct Agent)
                                                         └── T5 (SMTP Dispatcher)
```

---

## Quick Summary

### T10: UI Layout & Settings Dashboard
- **T10.1**: Main Layout Shell - Compact sidebar with hover expansion
- **T10.2**: Settings Form with Tabs - IMAP/SMTP/LLM configuration

### T11: Vibe Inbox & AI Trigger
- **T11.1**: Inbox List Component - Frameless email cards with line-clamp-2
- **T11.2**: Multi-Select & AI Action - Max 5 selection with visual blocking
- **T11.3**: Collapsible Email Details - Summary and todo display

### T12: Smart To-Do Dashboard
- **T12.1**: To-Do List with Urgency Grouping - Minimalist priority columns
- **T12.2**: Todo Completion Toggle - Optimistic UI with rollback

### T13: Agent Intent Editor
- **T13.1**: Assist Reply Button & Sheet - Side panel for drafting
- **T13.2**: SSE Streaming UI with Abort Control - Cancel/Retry support
- **T13.3**: Send Button & SMTP Integration - Email dispatch

---

## Key UI Requirements

### Design Principles
- **Minimalist "Vibe" aesthetic** using Shadcn and Tailwind
- **Compact sidebar**: w-16 collapsed, w-56 expanded on hover
- **Frameless cards**: No borders, subtle hover effects
- **Minimal borders**: Use `border-border/50` for subtle separation
- **Priority indication**: Border-left colors + Badge (not background colors)

### UX Patterns
- **Poka-yoke**: Visual blocking for selection limits
- **Optimistic UI**: Instant feedback with rollback on failure
- **Empty states**: Faded icons + minimal text
- **Error handling**: Retry buttons, preserve content on error
- **Abort control**: Cancel generation, edit current draft

---

## UI Components Summary

| Component | Description | Key Features |
|-----------|-------------|--------------|
| `MainLayout` | Compact sidebar + content area | Hover-expand sidebar, minimal borders |
| `SettingsPage` | Tabbed configuration | Email Servers / AI Engine tabs |
| `InboxPage` | Email list + multi-select | line-clamp-2, visual blocking, empty state |
| `EmailCard` | Individual email display | selectionDisabled prop |
| `EmailDetail` | Collapsible summary + todos | - |
| `TodoPage` | Urgency-grouped task board | Minimalist, completed limit, empty state |
| `TodoColumn` | Priority column | bg-muted/50, border-left accent |
| `TodoItem` | Task with completion | Optimistic UI, rollback on error |
| `AssistReplySheet` | Side panel draft interface | Sheet instead of Dialog |
| `DraftEditor` | SSE streaming + editor | Cancel/Retry, preserve text on error |

---

## Phase Completion Checklist

### T10: UI Layout & Settings Dashboard
- [ ] Compact sidebar (w-16 collapsed, w-56 expanded on hover)
- [ ] Minimal border styling (border-border/50)
- [ ] Settings form with Tabs component
- [ ] Email Servers tab (IMAP + SMTP)
- [ ] AI Engine tab (LLM configuration)

### T11: Vibe Inbox & AI Trigger
- [ ] Email card component with line-clamp-2 snippet
- [ ] Inbox list with pagination
- [ ] **Empty state** with faded icon + "Your inbox is clear" message
- [ ] Multi-select with max 5 limit (visual blocking)
- [ ] Run AI action button
- [ ] Collapsible email details with summary and todos

### T12: Smart To-Do Dashboard
- [ ] Urgency-grouped columns with minimalist styling
- [ ] Unified bg-muted/50 background (no red/yellow/green)
- [ ] Border-left and Badge for priority distinction
- [ ] Completed column limited to 10 items
- [ ] **Empty state** for empty todo dashboard
- [ ] Todo completion toggle with **optimistic UI**
- [ ] Rollback mechanism on failure

### T13: Agent Intent Editor
- [ ] Sheet component replacing Dialog (side panel)
- [ ] SSE streaming with thought process display
- [ ] **Cancel Generation button**
- [ ] **Error state with Retry button**
- [ ] **Preserve draft text on error**
- [ ] Send button with SMTP integration

---

## Detailed Plans

- [Phase 4.1: UI Layout & Settings Dashboard](./plan_4_1.md)
- [Phase 4.2: Vibe Inbox & AI Trigger](./plan_4_2.md)
- [Phase 4.3: Smart To-Do Dashboard](./plan_4_3.md)
- [Phase 4.4: Agent Intent Editor](./plan_4_4.md)

---

## Next Phase

→ [Phase 5: Delivery & Deployment](./plan_5.md)
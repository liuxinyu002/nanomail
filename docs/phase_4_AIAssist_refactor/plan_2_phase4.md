# Phase 4: Integration

> Frontend Chat Page Implementation - Phase 4 of 5
> Estimated Time: 1-2 hours

---

## Context Summary

### Project Goal
Implement a frontend Chat Page that provides a conversational interface for AI-assisted todo management.

### Scope (This Phase)
| Module | Change Type | Description |
|--------|-------------|-------------|
| App.tsx | Modification | Add `/chat` route |
| MainLayout.tsx | Modification | Add Chat nav item to sidebar |
| pages/ChatPage.tsx | New | Re-export from features |
| pages/index.ts | Modification | Export ChatPage |

### Integration Points
1. **Routing**: Add `/chat` route to React Router
2. **Navigation**: Add Chat entry to sidebar navigation
3. **Page Exports**: Standard page export pattern

---

## Implementation Steps

### Step 4.1: Add Route to App.tsx

**File:** `packages/frontend/src/App.tsx`

**Action:** Add `/chat` route

**Dependencies:** Phase 3 (ChatPage)

**Risk:** Low

```typescript
// Add import at top
import { ChatPage } from '@/features/chat'

// Inside <Routes>, add route
<Route path="chat" element={<ChatPage />} />
```

**Example (context-dependent):**
```typescript
<Routes>
  <Route path="/" element={<MainLayout />}>
    <Route index element={<Navigate to="/todos" replace />} />
    <Route path="todos" element={<TodosPage />} />
    <Route path="emails" element={<EmailsPage />} />
    <Route path="chat" element={<ChatPage />} />  {/* NEW */}
    {/* ... other routes */}
  </Route>
</Routes>
```

---

### Step 4.2: Add Navigation Entry

**File:** `packages/frontend/src/components/layout/MainLayout.tsx`

**Action:** Add Chat nav item with icon

**Dependencies:** None

**Risk:** Low

```typescript
// Add import
import { MessageCircle } from 'lucide-react'

// Add nav item (typically in sidebar navigation array or JSX)
<NavItem
  icon={<MessageCircle className="h-5 w-5" />}
  label="Chat"
  path="/chat"
  expanded={sidebarExpanded}
/>
```

**Alternative icon options:**
- `MessageCircle` - Standard chat bubble
- `Sparkles` - AI/magic feel
- `Bot` - Bot/assistant feel

---

### Step 4.3: Create Page Export

**File:** `packages/frontend/src/pages/ChatPage.tsx`

**Action:** Re-export from features

**Dependencies:** Phase 3

**Risk:** Low

```typescript
export { ChatPage } from '@/features/chat'
```

**Why this pattern:**
- Keeps `pages/` directory consistent with other pages
- Allows for page-level wrapping (e.g., with providers) if needed
- Maintains separation between feature and routing concerns

---

### Step 4.4: Update Pages Index

**File:** `packages/frontend/src/pages/index.ts`

**Action:** Export ChatPage

**Dependencies:** Step 4.3

**Risk:** Low

```typescript
// Add to existing exports
export { ChatPage } from './ChatPage'
```

---

## Acceptance Criteria

- [ ] `/chat` route renders ChatPage
- [ ] Sidebar shows Chat navigation item with icon
- [ ] Clicking Chat nav item navigates to `/chat`
- [ ] Page export follows project conventions

---

## Verification Steps

1. **Route Test:**
   ```bash
   # Start dev server
   pnpm --filter @nanomail/frontend dev

   # Navigate to http://localhost:5173/chat
   # Verify ChatPage renders
   ```

2. **Navigation Test:**
   - Click Chat item in sidebar
   - Verify URL changes to `/chat`
   - Verify ChatPage displays

3. **Build Test:**
   ```bash
   pnpm --filter @nanomail/frontend build
   # Verify no build errors
   ```

---

## File Structure After This Phase
```
packages/frontend/src/
├── App.tsx                   # MODIFIED - added /chat route
├── components/
│   └── layout/
│       └── MainLayout.tsx    # MODIFIED - added Chat nav item
├── features/
│   └── chat/                 # (Phases 1-3)
│       ├── index.ts
│       ├── ChatPage.tsx
│       ├── ChatInput.tsx
│       ├── MessageList.tsx
│       ├── MessageItem.tsx
│       ├── ToolCallAccordion.tsx
│       ├── ToolStatusBadge.tsx
│       ├── LoadingIndicator.tsx
│       ├── MarkdownRenderer.tsx
│       └── TodoCardWidget.tsx
├── hooks/
│   └── useChat.ts            # (Phase 1)
├── services/
│   ├── chat.service.ts       # (Phase 1)
│   └── index.ts              # (Phase 1)
└── pages/
    ├── index.ts              # MODIFIED - export ChatPage
    └── ChatPage.tsx          # NEW - re-export
```

---

## Next Phase

→ [Phase 5: Testing](./plan_2_phase5.md)

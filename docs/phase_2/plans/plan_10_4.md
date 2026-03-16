# Plan 10 - Phase 4: Settings Hook

> **Status**: Ready for Implementation
> **Plan**: Plan 10 - Compose Email Feature
> **Phase**: 4 of 8

---

## Objective

Create a React hook to fetch and cache user settings, which will be used to display sender information in the compose modal.

---

## Context

The compose email modal needs to display the sender's email address (from SMTP settings). This hook provides a reusable way to fetch settings with proper caching using React Query.

---

## Target Files

| File | Action |
|------|--------|
| `packages/frontend/src/hooks/useSettings.ts` | Create |
| `packages/frontend/src/hooks/index.ts` | Modify (export) |

---

## Implementation Details

### useSettings Hook

```typescript
import { useQuery } from '@tanstack/react-query'
import type { SettingsForm } from '@nanomail/shared'

export function useSettings() {
  return useQuery<SettingsForm>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}
```

### Export in hooks/index.ts

```typescript
export { useSettings } from './useSettings'
```

### Key Points

1. **React Query caching**: Settings are cached for 5 minutes (`staleTime`)
2. **Type safety**: Uses `SettingsForm` type from shared package
3. **Error handling**: Throws error for non-OK responses
4. **Reusable**: Can be used anywhere settings are needed

---

## Usage in ComposeEmailModal

```typescript
const { data: settings } = useSettings()

// Display sender info
{settings?.SMTP_USER && (
  <span className="text-sm text-muted-foreground">
    from {settings.SMTP_USER}
  </span>
)}
```

---

## Dependencies

- `@tanstack/react-query` (already installed)
- `SettingsForm` type from `@nanomail/shared`

---

## Verification

1. Verify hook compiles without errors
2. Test that settings are fetched correctly
3. Verify caching behavior (settings should not refetch on every render)
4. Check that `SMTP_USER` field is accessible

---

## Next Phase

After completing this phase, proceed to **Phase 5: EmailChipInput Component** to create the multi-email chip input component.
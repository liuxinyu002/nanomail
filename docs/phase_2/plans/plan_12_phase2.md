# Plan 12 Phase 2: Create useAIAssistStream Hook

**File:** `packages/frontend/src/hooks/useAIAssistStream.ts` (NEW)

**Dependencies:** Phase 1 (needs TipTapEditorHandle type)

---

## Objective

Create a reusable hook for AI assist streaming that uses callback-based event-driven pattern for better reusability and decoupling from UI components.

---

## Problem Solved

Previous design passed `editorRef` directly to the hook, creating tight coupling between the hook and UI components. The new design uses callback-based event-driven pattern for better reusability.

---

## Interface

```typescript
interface UseAIAssistStreamOptions {
  emailId: number
  // Callback-based API - no editorRef coupling
  onChunk: (chunk: string) => void
  onDone?: () => void
  onError?: (error: string) => void
  onThought?: (thought: string) => void  // Optional: AI thinking process
  enabled?: boolean
}

interface UseAIAssistStreamReturn {
  thoughts: string[]
  isStreaming: boolean
  status: 'idle' | 'thinking' | 'drafting' | 'done' | 'error'
  error: string | null
  start: () => void
  cancel: () => void
  reset: () => void
}
```

---

## SSE Event Types (from backend)

```typescript
interface ProgressEvent {
  type: 'thought' | 'action' | 'observation' | 'chunk' | 'done' | 'error'
  content: string
  toolName?: string
  toolInput?: Record<string, unknown>
  iteration?: number
}
```

---

## Implementation

```typescript
import { useState, useCallback, useRef, useEffect } from 'react'

export function useAIAssistStream(options: UseAIAssistStreamOptions): UseAIAssistStreamReturn {
  const {
    emailId,
    onChunk,
    onDone,
    onError,
    onThought,
    enabled = true
  } = options

  const [thoughts, setThoughts] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'thinking' | 'drafting' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const start = useCallback(async () => {
    if (!enabled) return

    // Reset state
    setThoughts([])
    setError(null)
    setStatus('thinking')

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`/api/ai/assist-reply/${emailId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const events = chunk.split('\n\n').filter(Boolean)

        for (const event of events) {
          if (event.startsWith('data: ')) {
            const data = JSON.parse(event.slice(6)) as ProgressEvent

            switch (data.type) {
              case 'thought':
                setThoughts(prev => [...prev, data.content])
                onThought?.(data.content)
                break
              case 'chunk':
                setStatus('drafting')
                onChunk(data.content)
                break
              case 'done':
                setStatus('done')
                onDone?.()
                break
              case 'error':
                setStatus('error')
                setError(data.content)
                onError?.(data.content)
                break
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Cancelled by user
        setStatus('idle')
      } else {
        setStatus('error')
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMsg)
        onError?.(errorMsg)
      }
    }
  }, [emailId, enabled, onChunk, onDone, onError, onThought])

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setStatus('idle')
  }, [])

  const reset = useCallback(() => {
    setThoughts([])
    setError(null)
    setStatus('idle')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    thoughts,
    isStreaming: status === 'thinking' || status === 'drafting',
    status,
    error,
    start,
    cancel,
    reset,
  }
}
```

---

## Usage Example

```typescript
// In ComposeEmailModal
const editorRef = useRef<TipTapEditorHandle>(null)

const { isStreaming, status, start, cancel } = useAIAssistStream({
  emailId,
  onChunk: (chunk) => {
    editorRef.current?.appendContent(chunk)
  },
  onDone: () => {
    setEditorDisabled(false)  // Re-enable editor
  },
  onError: (error) => {
    toast.error(error)
    setEditorDisabled(false)
  }
})
```

---

## Key Features

1. **Cancellable Requests**: Uses AbortController for clean cancellation
2. **Thought Aggregation**: Collects AI thinking process for optional UI display
3. **Callback Pattern**: Decouples hook from UI components
4. **Proper Cleanup**: Aborts requests on unmount
5. **Status Tracking**: Exposes current state for UI indicators

---

## Testing

### Unit Tests

```typescript
describe('useAIAssistStream', () => {
  it('should call onChunk callback when receiving chunk events', async () => {
    const onChunk = vi.fn()
    // Mock fetch with SSE stream
    // ... test implementation
  })

  it('should abort request when cancel is called', async () => {
    const { result } = renderHook(() => useAIAssistStream({ emailId: 1, onChunk: vi.fn() }))
    act(() => {
      result.current.start()
      result.current.cancel()
    })
    // Verify abort was called
  })

  it('should reset state when reset is called', () => {
    const { result } = renderHook(() => useAIAssistStream({ emailId: 1, onChunk: vi.fn() }))
    act(() => result.current.reset())
    expect(result.current.status).toBe('idle')
    expect(result.current.thoughts).toEqual([])
  })

  it('should call onError on fetch error', async () => {
    const onError = vi.fn()
    // Mock fetch error
    // ... test implementation
  })
})
```
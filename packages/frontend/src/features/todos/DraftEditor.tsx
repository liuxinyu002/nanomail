import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChevronDown, Loader2, X, AlertCircle, CheckCircle } from 'lucide-react'

export interface DraftEditorProps {
  emailId: number
  instruction: string
  onClose: () => void
  onSend: (draft: string) => Promise<void>
}

type DraftStatus = 'idle' | 'thinking' | 'drafting' | 'done' | 'error'

interface SSEEvent {
  type: 'thought' | 'draft' | 'done' | 'error'
  content: string
}

export function DraftEditor({
  emailId,
  instruction,
  onClose,
  onSend,
}: DraftEditorProps) {
  const [status, setStatus] = useState<DraftStatus>('idle')
  const [thoughts, setThoughts] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [isSending, setIsSending] = useState(false)

  // Start SSE connection when component mounts (initial start, not retry)
  useEffect(() => {
    startDraftGeneration(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startDraftGeneration = useCallback(async (isRetry = false) => {
    setStatus('thinking')
    setThoughts([])
    // Only clear draft on initial start, not on retry (preserve user's partial draft)
    if (!isRetry) {
      setDraft('')
    }
    setError(null)

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch('/api/agent/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, instruction }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to start draft generation')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: SSEEvent = JSON.parse(line.slice(6))
              handleSSEEvent(event)
            } catch (e) {
              console.error('Failed to parse SSE event:', e)
            }
          }
        }
      }

      setStatus('done')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled
        setStatus('idle')
      } else {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    } finally {
      setAbortController(null)
    }
  }, [emailId, instruction])

  const handleSSEEvent = (event: SSEEvent) => {
    switch (event.type) {
      case 'thought':
        setThoughts((prev) => [...prev, event.content])
        setStatus('thinking')
        break
      case 'draft':
        setDraft((prev) => prev + event.content)
        setStatus('drafting')
        break
      case 'done':
        setStatus('done')
        break
      case 'error':
        setStatus('error')
        setError(event.content)
        break
    }
  }

  const handleCancel = useCallback(() => {
    abortController?.abort()
    setStatus('idle')
  }, [abortController])

  const handleRetry = useCallback(() => {
    startDraftGeneration(true)
  }, [startDraftGeneration])

  const handleSend = useCallback(async () => {
    if (!draft.trim()) return

    setIsSending(true)
    try {
      await onSend(draft)
      toast.success('Email sent successfully')
    } catch (err) {
      toast.error('Failed to send email')
    } finally {
      setIsSending(false)
    }
  }, [draft, onSend])

  const statusLabels: Record<DraftStatus, string> = {
    idle: 'Idle',
    thinking: 'Thinking...',
    drafting: 'Drafting...',
    done: 'Done',
    error: 'Error',
  }

  const statusIcons: Record<DraftStatus, React.ReactNode> = {
    idle: null,
    thinking: <Loader2 className="h-4 w-4 animate-spin" />,
    drafting: <Loader2 className="h-4 w-4 animate-spin" />,
    done: <CheckCircle className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
  }

  return (
    <div className="mt-6 space-y-4" data-testid="draft-editor">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        {statusIcons[status]}
        <span className="text-sm font-medium" data-testid="draft-status">
          {statusLabels[status]}
        </span>
      </div>

      {/* Cancel Button (during generation) */}
      {(status === 'thinking' || status === 'drafting') && (
        <Button variant="outline" onClick={handleCancel} data-testid="cancel-button">
          <X className="h-4 w-4 mr-2" />
          Cancel Generation
        </Button>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" onClick={handleRetry} data-testid="retry-button">
            Retry
          </Button>
        </div>
      )}

      {/* Thoughts (Collapsible) */}
      {thoughts.length > 0 && (
        <Collapsible open={isThoughtsOpen} onOpenChange={setIsThoughtsOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronDown className={`h-4 w-4 transition-transform ${isThoughtsOpen ? 'rotate-180' : ''}`} />
            Thought Process ({thoughts.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-2 max-h-40 overflow-y-auto">
              {thoughts.map((thought, index) => (
                <p key={index} className="text-muted-foreground">
                  {thought}
                </p>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Draft Content */}
      {(draft || status === 'done') && (
        <div className="space-y-2">
          <Label>Draft</Label>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="resize-none"
            data-testid="draft-textarea"
          />
        </div>
      )}

      {/* Send Button */}
      {status === 'done' && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            data-testid="send-button"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Email'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
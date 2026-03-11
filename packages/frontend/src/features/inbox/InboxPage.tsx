import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { EmailService } from '@/services'
import { Button } from '@/components/ui'
import { EmailCard, EmptyInbox } from './EmailCard'
import { Loader2, Sparkles } from 'lucide-react'

const MAX_SELECTION = 5

export function InboxPage() {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [processing, setProcessing] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['emails', 1, 10],
    queryFn: () => EmailService.getEmails({ page: 1, limit: 10 }),
  })

  const handleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_SELECTION) {
        next.add(id)
      }
      return next
    })
  }, [])

  const isSelectionDisabled = useCallback(
    (emailId: number) => {
      return selectedIds.size >= MAX_SELECTION && !selectedIds.has(emailId)
    },
    [selectedIds]
  )

  const handleRunAI = async () => {
    if (selectedIds.size === 0) return

    setProcessing(true)
    try {
      await EmailService.processEmails(Array.from(selectedIds))
      toast.success('Emails queued for processing')
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    } catch {
      toast.error('Failed to process emails')
    } finally {
      setProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Inbox</h1>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-muted animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-4 w-4 rounded bg-muted-foreground/20" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted-foreground/20" />
                  <div className="h-3 w-2/3 rounded bg-muted-foreground/20" />
                  <div className="h-3 w-full rounded bg-muted-foreground/20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Inbox</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground mb-4">Failed to load emails</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!data || data.emails.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Inbox</h1>
        <EmptyInbox />
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inbox</h1>

      {/* Selection limit indicator */}
      {selectedIds.size > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          {selectedIds.size}/{MAX_SELECTION} emails selected
          {selectedIds.size >= MAX_SELECTION && (
            <span className="text-amber-500 ml-2">(Maximum reached)</span>
          )}
        </div>
      )}

      {/* Email list */}
      <div className="space-y-2">
        {data.emails.map((email) => (
          <EmailCard
            key={email.id}
            email={{
              ...email,
              date: new Date(email.date),
            }}
            selected={selectedIds.has(email.id)}
            onSelect={handleSelect}
            selectionDisabled={isSelectionDisabled(email.id)}
          />
        ))}
      </div>

      {/* Floating action button */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={handleRunAI}
            disabled={processing}
            className="shadow-lg"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Run AI ({selectedIds.size}/{MAX_SELECTION})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
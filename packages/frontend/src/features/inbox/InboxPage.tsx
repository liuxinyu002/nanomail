import { useState, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { EmailService } from '@/services'
import { Button } from '@/components/ui'
import { EmailCard, EmptyInbox } from './EmailCard'
import { ClassificationFilter } from './ClassificationFilter'
import { EmailDetailPanel } from './EmailDetail/EmailDetailPanel'
import { ComposeEmailModal } from '@/components/email'
import { Loader2, Sparkles, RefreshCw, Pencil } from 'lucide-react'
import type { EmailClassification } from '@nanomail/shared'

const MAX_SELECTION = 5
const POLL_INTERVAL = 2000 // 2 seconds

export function InboxPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  // Parse emailId from URL with NaN and positive number protection
  const { emailId } = useParams<{ emailId: string }>()
  const parsedId = emailId ? parseInt(emailId, 10) : null
  const activeId = parsedId !== null && !Number.isNaN(parsedId) && parsedId > 0 ? parsedId : null

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [syncingJobId, setSyncingJobId] = useState<string | null>(null)
  const [classificationFilter, setClassificationFilter] = useState<EmailClassification | 'ALL'>('ALL')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeKey, setComposeKey] = useState(0) // Force remount for clean state

  // Local state for reply action (preserved after router state is cleared)
  const [replySender, setReplySender] = useState<string | undefined>(undefined)

  // Parse router state for reply action
  const { action } = (location.state as {
    action?: string
  }) ?? {}

  // Fetch email when action is reply to get sender info
  const { data: replyEmail, isSuccess: isEmailLoaded } = useQuery({
    queryKey: ['email', activeId],
    queryFn: () => EmailService.getEmail(activeId!),
    enabled: !!activeId && action === 'reply',
  })

  // Auto-open modal for reply action (wait for email data if fetching)
  useEffect(() => {
    if (action === 'reply' && activeId && isEmailLoaded) {
      setReplySender(replyEmail?.sender ?? undefined)
      setComposeOpen(true)
      // Clear state to prevent re-trigger on refresh
      navigate(location.pathname, { replace: true })
    }
  }, [action, activeId, isEmailLoaded, replyEmail, location.pathname, navigate])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['emails', 1, 10, classificationFilter],
    queryFn: () => EmailService.getEmails({
      page: 1,
      limit: 10,
      classification: classificationFilter === 'ALL' ? undefined : classificationFilter,
    }),
  })

  // Polling effect for sync status
  useEffect(() => {
    let isMounted = true
    let timeoutId: ReturnType<typeof setTimeout>

    const poll = async () => {
      if (!syncingJobId) return

      try {
        const job = await EmailService.getSyncStatus(syncingJobId)
        if (!isMounted) return

        if (job.status === 'completed') {
          const count = job.result?.syncedCount ?? 0
          toast.success(`Sync completed, ${count} new email${count !== 1 ? 's' : ''}`)
          setSyncingJobId(null)
          refetch()
        } else if (job.status === 'failed') {
          toast.error(`Sync failed: ${job.error ?? 'Unknown error'}`)
          setSyncingJobId(null)
        } else {
          // Continue polling
          timeoutId = setTimeout(poll, POLL_INTERVAL)
        }
      } catch (error) {
        if (!isMounted) return
        const message = error instanceof Error ? error.message : 'Unknown error'
        if (message === 'JOB_NOT_FOUND') {
          toast.error('Sync job not found or expired. Please try again.')
        } else {
          toast.error('Failed to get sync status')
        }
        setSyncingJobId(null)
      }
    }

    poll()

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [syncingJobId, refetch])

  // Handle compose modal close - clear reply sender state to prevent data pollution
  const handleComposeOpenChange = (open: boolean) => {
    setComposeOpen(open)
    if (!open) {
      setReplySender(undefined)
      // Increment key to force remount on next open (clean state)
      setComposeKey(k => k + 1)
    }
  }

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

  const handleSync = async () => {
    if (syncingJobId) return // Already syncing

    try {
      const response = await EmailService.triggerSync()
      setSyncingJobId(response.jobId)
      toast.info('Sync started...')
    } catch {
      toast.error('Failed to start sync')
    }
  }

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
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Inbox</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={!!syncingJobId}
            >
              {syncingJobId ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Split Pane */}
        <div className="flex-1 flex min-h-0">
          {/* Left Pane: Email List Skeleton */}
          <div
            className="w-[350px] border-r border-gray-200 overflow-y-auto"
            data-testid="email-list-pane"
          >
            <div className="p-4 space-y-2">
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

          {/* Right Pane: Empty */}
          <div
            className="flex-1 min-w-0 overflow-y-auto bg-white"
            data-testid="email-detail-pane"
          >
            <EmailDetailPanel emailId={null} />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Inbox</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={!!syncingJobId}
            >
              {syncingJobId ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error State */}
        <div className="flex-1 flex min-h-0">
          <div
            className="flex-1 flex items-center justify-center"
            data-testid="email-list-pane"
          >
            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground mb-4">Failed to load emails</p>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.emails.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Inbox</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={!!syncingJobId}
            >
              {syncingJobId ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex min-h-0">
          <div
            className="flex-1 flex items-center justify-center"
            data-testid="email-list-pane"
          >
            <EmptyInbox />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <div className="flex items-center gap-4">
            <ClassificationFilter
              value={classificationFilter}
              onChange={setClassificationFilter}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComposeOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Compose
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={!!syncingJobId}
            >
              {syncingJobId ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Split Pane */}
      <div className="flex-1 flex min-h-0">
        {/* Left Pane: Email List */}
        <div
          className="w-[350px] border-r border-gray-200 overflow-y-auto"
          data-testid="email-list-pane"
        >
          {/* Selection limit indicator */}
          {selectedIds.size > 0 && (
            <div className="px-4 pt-2 text-sm text-muted-foreground">
              {selectedIds.size}/{MAX_SELECTION} emails selected
              {selectedIds.size >= MAX_SELECTION && (
                <span className="text-amber-500 ml-2">(Maximum reached)</span>
              )}
            </div>
          )}

          <div className="p-4 space-y-2">
            {data.emails.map((email) => (
              <EmailCard
                key={email.id}
                email={{
                  ...email,
                  date: new Date(email.date),
                }}
                selected={selectedIds.has(email.id)}
                onSelect={handleSelect}
                activeId={activeId ?? undefined}
                onCardClick={(id) => navigate(`/inbox/${id}`)}
                selectionDisabled={isSelectionDisabled(email.id)}
              />
            ))}
          </div>
        </div>

        {/* Right Pane: Email Detail */}
        <div
          className="flex-1 min-w-0 overflow-y-auto bg-white"
          data-testid="email-detail-pane"
        >
          <EmailDetailPanel
            emailId={activeId}
            onClose={() => navigate('/inbox')}
          />
        </div>
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

      {/* Compose Email Modal - key forces remount for clean state */}
      <ComposeEmailModal
        key={composeKey}
        open={composeOpen}
        onOpenChange={handleComposeOpenChange}
        sender={replySender}
      />
    </div>
  )
}
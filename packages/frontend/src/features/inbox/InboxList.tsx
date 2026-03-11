import { useQuery } from '@tanstack/react-query'
import { EmailService } from '@/services'
import { EmailCard, EmptyInbox } from './EmailCard'
import { Button } from '@/components/ui'
import { RefreshCw } from 'lucide-react'

export interface InboxListProps {
  page?: number
  limit?: number
}

/**
 * Loading skeleton for email cards
 */
function EmailSkeleton() {
  return (
    <div className="space-y-2" data-testid="loading-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-lg bg-muted animate-pulse"
        >
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
  )
}

/**
 * Error state component
 */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-muted-foreground mb-4">Failed to load emails</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}

export function InboxList({
  page = 1,
  limit = 10,
}: InboxListProps) {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['emails', page, limit],
    queryFn: () => EmailService.getEmails({ page, limit }),
  })

  if (isLoading) {
    return <EmailSkeleton />
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />
  }

  if (!data || data.emails.length === 0) {
    return <EmptyInbox />
  }

  return (
    <div className="space-y-2">
      {data.emails.map((email) => (
        <EmailCard
          key={email.id}
          email={{
            ...email,
            date: new Date(email.date),
          }}
          selected={false}
          onSelect={() => {
            // Selection will be handled by parent component with state
          }}
        />
      ))}
    </div>
  )
}
/**
 * EmailDetailPanel - Main orchestration component for email detail view
 *
 * Features:
 * - State machine: Empty → Loading → Error/Success
 * - 404 special handling (deleted email)
 * - Orchestrates Header, Body, Attachments
 * - Passes onClose to Header
 */

import { useEmailDetail } from '@/hooks'
import { isNotFoundError } from '@/types'
import { EmailDetailHeader } from './EmailDetailHeader'
import { EmailDetailBody } from './EmailDetailBody'
import { EmailDetailAttachments } from './EmailDetailAttachments'
import { EmailDetailSkeleton } from './EmailDetailSkeleton'
import { EmailDetailEmpty } from './EmailDetailEmpty'
import { EmailDetailError } from './EmailDetailError'

export interface EmailDetailPanelProps {
  emailId: number | null
  onClose?: () => void
}

export function EmailDetailPanel({ emailId, onClose }: EmailDetailPanelProps) {
  const { data: email, isLoading, isError, error, refetch } = useEmailDetail(emailId)

  // No email selected - show empty state
  if (emailId === null) {
    return <EmailDetailEmpty />
  }

  // Loading state
  if (isLoading) {
    return <EmailDetailSkeleton />
  }

  // Error handling with 404 special case
  if (isError) {
    // Handle 404 specifically - email may have been deleted on another device
    if (isNotFoundError(error)) {
      return <EmailDetailEmpty message="The requested email does not exist or has been deleted." />
    }
    return <EmailDetailError onRetry={() => refetch()} />
  }

  // Success - render email detail (email is guaranteed to exist here)
  if (!email) {
    return <EmailDetailEmpty />
  }

  return (
    <div className="h-full flex flex-col">
      <EmailDetailHeader email={email} onClose={onClose} />
      <hr className="border-gray-200" />
      <EmailDetailBody bodyText={email.bodyText} />
      {email.hasAttachments && <EmailDetailAttachments />}
    </div>
  )
}
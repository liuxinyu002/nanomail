/**
 * EmailDetailHeader - Header component for email detail view
 *
 * Displays:
 * - Subject with fallback
 * - Classification badge
 * - Close button
 * - Avatar with sender info
 * - Smart date formatting
 * - Attachment icon
 */

import { X, Paperclip } from 'lucide-react'
import { formatAbsoluteDate } from '@/lib/date-format'
import type { EmailDetail } from '@/services'
import { Avatar } from './Avatar'
import { ClassificationTag } from '@/components/ClassificationTag'

interface EmailDetailHeaderProps {
  email: EmailDetail
  onClose?: () => void
}

/**
 * Extract display name from email address
 * If sender is "john.doe@example.com", returns "john.doe"
 * Falls back to full email if no local part exists
 */
function extractDisplayName(sender: string): string {
  const localPart = sender.split('@')[0]
  return localPart || sender
}

export function EmailDetailHeader({ email, onClose }: EmailDetailHeaderProps) {
  const displayName = email.sender ? extractDisplayName(email.sender) : ''

  return (
    <div className="p-6">
      {/* Top row: Subject + Badge + Close button */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 truncate">
            {email.subject || '(No Subject)'}
          </h1>
          <ClassificationTag classification={email.classification} size="md" variant="solid" />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Close email detail"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Bottom row: Avatar + Sender + Date + Attachment icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={email.sender} size="md" />
          <div>
            <p className="font-medium text-gray-900">
              {displayName || email.sender || 'Unknown'}
            </p>
            {email.sender && (
              <p className="text-sm text-gray-500">{email.sender}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          <span className="text-sm">
            {formatAbsoluteDate(email.date)}
          </span>
          {email.hasAttachments && (
            <Paperclip className="h-4 w-4" />
          )}
        </div>
      </div>
    </div>
  )
}
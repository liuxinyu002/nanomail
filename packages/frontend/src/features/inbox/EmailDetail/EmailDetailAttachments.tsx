/**
 * EmailDetailAttachments - Attachments section for email detail view
 *
 * Features:
 * - Paperclip icon with "Attachments" label
 * - Placeholder skeleton rows (future: real attachment list)
 */

import { Paperclip } from 'lucide-react'

export function EmailDetailAttachments() {
  return (
    <div className="p-6 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Paperclip className="h-4 w-4 text-gray-600" />
        <span className="font-medium text-gray-600">Attachments</span>
      </div>
      {/* Placeholder for future attachment list */}
      <div className="space-y-2">
        <div className="h-12 bg-gray-100 rounded animate-pulse" />
        <div className="h-12 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  )
}
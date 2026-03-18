import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

interface EmailLinkIconProps {
  emailId: string | number
}

/**
 * A link icon that navigates to the associated email
 * Uses brand blue on hover for consistent interaction feedback
 */
export function EmailLinkIcon({ emailId }: EmailLinkIconProps) {
  return (
    <Link
      to={`/inbox/${emailId}`}
      onClick={(e) => e.stopPropagation()}
      className="text-[#6B7280] hover:text-[#2563EB] transition-colors"
      aria-label="View associated email"
    >
      <ExternalLink className="w-3.5 h-3.5" />
    </Link>
  )
}
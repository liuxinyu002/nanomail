/**
 * React Query hook for fetching single email detail
 *
 * Provides cached data fetching for individual email with:
 * - Automatic caching by emailId
 * - Disabled query when emailId is null
 * - 5-minute stale time for optimal performance
 */

import { useQuery } from '@tanstack/react-query'
import { EmailService } from '@/services'

/**
 * Get a single email's full detail by ID
 *
 * @param emailId - The email ID to fetch, or null to disable the query
 * @returns React Query result with email detail data
 *
 * @example
 * ```tsx
 * // In an inbox component with selected email
 * const [selectedId, setSelectedId] = useState<number | null>(null)
 * const { data: email, isLoading, isError } = useEmailDetail(selectedId)
 *
 * // The query is automatically disabled when selectedId is null
 * if (!selectedId) return <div>Select an email to view details</div>
 * if (isLoading) return <div>Loading...</div>
 * if (isError) return <div>Failed to load email</div>
 *
 * return <EmailDetailView email={email} />
 * ```
 */
export function useEmailDetail(emailId: number | null) {
  return useQuery({
    queryKey: ['email', emailId],
    // Non-null assertion is safe here: the query is disabled when emailId is null,
    // so this function only executes when emailId is guaranteed to be a number
    queryFn: () => EmailService.getEmail(emailId!),
    enabled: emailId !== null,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
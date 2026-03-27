/**
 * React Query hook for fetching user settings
 *
 * Provides cached data fetching for settings with:
 * - Automatic caching with 5-minute stale time
 * - Type-safe SettingsForm return type
 * - Error handling for failed requests
 */

import { useQuery } from '@tanstack/react-query'
import type { SettingsForm } from '@nanomail/shared'
import { buildApiUrl } from '@/config/api.config'

/**
 * Fetch user settings from the API
 *
 * @returns React Query result with settings data
 *
 * @example
 * ```tsx
 * // In a component that needs settings
 * const { data: settings, isLoading, isError } = useSettings()
 *
 * if (isLoading) return <div>Loading...</div>
 * if (isError) return <div>Failed to load settings</div>
 *
 * // Display sender info
 * {settings?.SMTP_USER && (
 *   <span className="text-sm text-muted-foreground">
 *     from {settings.SMTP_USER}
 *   </span>
 * )}
 * ```
 */
export function useSettings() {
  return useQuery<SettingsForm>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch(buildApiUrl('/api/settings'))
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}
/**
 * API Error Types and Utilities
 *
 * Provides standardized error handling for API responses across the application.
 */

/**
 * Standard API error shape from backend responses
 */
export interface ApiError extends Error {
  response?: {
    status: number
    data?: unknown
  }
}

/**
 * Type guard to check if an error has an API error shape
 *
 * Handles both Error instances with response property and plain objects
 * that match the API error shape (for testing compatibility).
 *
 * @param error - The error to check
 * @returns true if the error has a response property with status
 */
export function isApiError(error: unknown): error is ApiError {
  if (!error || typeof error !== 'object') {
    return false
  }

  const err = error as Record<string, unknown>

  // Check if it has a response property with a status number
  return (
    'response' in err &&
    typeof err.response === 'object' &&
    err.response !== null &&
    'status' in err.response &&
    typeof (err.response as Record<string, unknown>).status === 'number'
  )
}

/**
 * Check if an error is a 404 Not Found error
 *
 * @param error - The error to check
 * @returns true if the error is a 404 response
 */
export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.response?.status === 404
}
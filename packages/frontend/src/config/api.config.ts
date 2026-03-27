/**
 * API Configuration
 * Handles API base URL for different environments (web dev, Electron, production)
 */

/**
 * Get the API base URL based on current environment
 * - Development (web): Use Vite proxy (empty string, relative path)
 * - Electron (production): Use localhost:3000 where backend runs
 */
export function getApiBaseUrl(): string {
  // Check if running in Electron (exposed via preload script)
  if (typeof window !== 'undefined' && (window as Window & { electronAPI?: { isElectron: boolean; getApiBaseUrl: () => string } }).electronAPI?.isElectron) {
    return (window as Window & { electronAPI: { getApiBaseUrl: () => string } }).electronAPI.getApiBaseUrl()
  }

  // Development or web: use relative path (Vite proxy handles forwarding)
  return ''
}

/**
 * Build full API URL
 * @param path - API path (e.g., '/api/todos')
 * @returns Full URL (e.g., 'http://localhost:3000/api/todos' or '/api/todos')
 */
export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl()
  return base ? `${base}${path}` : path
}
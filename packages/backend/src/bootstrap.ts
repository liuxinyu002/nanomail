/**
 * Bootstrap script - MUST be imported first
 * Loads environment variables before any other modules
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from project root (monorepo root)
// __dirname points to dist/ when compiled, so we need to go up 3 levels
config({ path: resolve(__dirname, '../../../.env') })

// Re-export for convenience
export { config }
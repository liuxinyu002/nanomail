import { Router, Request, Response } from 'express'
import type { SettingsService } from '../services/SettingsService'
import { createLogger } from '../config/logger.js'

const log = createLogger('SettingsRoutes')

/** LLM-related settings keys that should trigger config cache invalidation */
const LLM_SETTINGS_KEYS = ['LLM_API_KEY', 'LLM_BASE_URL', 'LLM_MODEL']

/**
 * Options for settings routes
 */
export interface SettingsRoutesOptions {
  /** Callback invoked when LLM-related settings are saved */
  onLLMConfigChanged?: () => void
}

/**
 * Creates settings routes with dependency injection
 */
export function createSettingsRoutes(
  settingsService: SettingsService,
  options?: SettingsRoutesOptions
): Router {
  const router = Router()

  /**
   * GET /api/settings
   * Returns all settings as key-value pairs
   */
  router.get('/', async (_req: Request, res: Response) => {
    try {
      // Get all settings from the repository
      const settings = await settingsService.getAll()
      res.json(settings)
    } catch (error) {
      log.error({ err: error }, 'Error fetching settings')
      res.status(500).json({ error: 'Failed to fetch settings' })
    }
  })

  /**
   * GET /api/settings/:key
   * Returns a single setting value
   */
  router.get('/:key', async (req: Request, res: Response) => {
    try {
      const { key } = req.params
      if (!key) {
        return res.status(400).json({ error: 'Key is required' })
      }
      const value = await settingsService.get(key)

      if (value === null) {
        return res.status(404).json({ error: 'Setting not found' })
      }

      res.json({ key, value })
    } catch (error) {
      log.error({ err: error, key: req.params.key }, 'Error fetching setting')
      res.status(500).json({ error: 'Failed to fetch setting' })
    }
  })

  /**
   * PUT /api/settings
   * Saves multiple settings at once
   */
  router.put('/', async (req: Request, res: Response) => {
    try {
      const settings = req.body

      if (typeof settings !== 'object' || settings === null) {
        return res.status(400).json({ error: 'Invalid settings object' })
      }

      // Track if any LLM settings were changed
      let llmConfigChanged = false

      // Save each setting
      for (const [key, value] of Object.entries(settings)) {
        if (typeof value === 'string') {
          await settingsService.set(key, value)
          if (LLM_SETTINGS_KEYS.includes(key)) {
            llmConfigChanged = true
          }
        }
      }

      // Invalidate LLM config cache if relevant settings changed
      if (llmConfigChanged && options?.onLLMConfigChanged) {
        options.onLLMConfigChanged()
      }

      res.json({ success: true })
    } catch (error) {
      log.error({ err: error }, 'Error saving settings')
      res.status(500).json({ error: 'Failed to save settings' })
    }
  })

  /**
   * PUT /api/settings/:key
   * Saves a single setting
   */
  router.put('/:key', async (req: Request, res: Response) => {
    try {
      const { key } = req.params
      if (!key) {
        return res.status(400).json({ error: 'Key is required' })
      }
      const { value } = req.body

      if (typeof value !== 'string') {
        return res.status(400).json({ error: 'Value must be a string' })
      }

      await settingsService.set(key, value)

      // Invalidate LLM config cache if relevant setting changed
      if (LLM_SETTINGS_KEYS.includes(key) && options?.onLLMConfigChanged) {
        options.onLLMConfigChanged()
      }

      res.json({ success: true })
    } catch (error) {
      log.error({ err: error, key: req.params.key }, 'Error saving setting')
      res.status(500).json({ error: 'Failed to save setting' })
    }
  })

  /**
   * DELETE /api/settings/:key
   * Deletes a setting
   */
  router.delete('/:key', async (req: Request, res: Response) => {
    try {
      const { key } = req.params
      if (!key) {
        return res.status(400).json({ error: 'Key is required' })
      }
      await settingsService.delete(key)
      res.json({ success: true })
    } catch (error) {
      log.error({ err: error, key: req.params.key }, 'Error deleting setting')
      res.status(500).json({ error: 'Failed to delete setting' })
    }
  })

  return router
}
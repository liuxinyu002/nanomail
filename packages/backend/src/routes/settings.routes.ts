import { Router, Request, Response } from 'express'
import type { SettingsService } from '../services/SettingsService'

/**
 * Creates settings routes with dependency injection
 */
export function createSettingsRoutes(settingsService: SettingsService): Router {
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
      console.error('Error fetching settings:', error)
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
      const value = await settingsService.get(key)

      if (value === null) {
        return res.status(404).json({ error: 'Setting not found' })
      }

      res.json({ key, value })
    } catch (error) {
      console.error('Error fetching setting:', error)
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

      // Save each setting
      for (const [key, value] of Object.entries(settings)) {
        if (typeof value === 'string') {
          await settingsService.set(key, value)
        }
      }

      res.json({ success: true })
    } catch (error) {
      console.error('Error saving settings:', error)
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
      const { value } = req.body

      if (typeof value !== 'string') {
        return res.status(400).json({ error: 'Value must be a string' })
      }

      await settingsService.set(key, value)
      res.json({ success: true })
    } catch (error) {
      console.error('Error saving setting:', error)
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
      await settingsService.delete(key)
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting setting:', error)
      res.status(500).json({ error: 'Failed to delete setting' })
    }
  })

  return router
}
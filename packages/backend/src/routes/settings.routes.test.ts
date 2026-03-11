import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createSettingsRoutes } from './settings.routes'
import { SettingsService } from '../services/SettingsService'
import { EncryptionService } from '../services/EncryptionService'
import { Repository } from 'typeorm'
import { Settings } from '../entities/Settings.entity'

// Set up MASTER_KEY for encryption service (64-character hex string)
vi.stubEnv('MASTER_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')

// Mock repository for testing
const createMockRepository = () => {
  const store = new Map<string, Settings>()
  let idCounter = 1

  return {
    findOne: async ({ where }: { where: { key: string } }) => {
      for (const [, value] of store) {
        if (value.key === where.key) {
          return value
        }
      }
      return null
    },
    save: async (data: Partial<Settings>) => {
      if ('id' in data && data.id) {
        // Update existing
        for (const [key, value] of store) {
          if (value.id === data.id) {
            const updated = { ...value, ...data } as Settings
            store.set(key, updated)
            return updated
          }
        }
      }
      // Create new
      const newSetting: Settings = {
        id: idCounter++,
        key: data.key!,
        value: data.value!,
      } as Settings
      store.set(data.key!, newSetting)
      return newSetting
    },
    delete: async ({ key }: { key: string }) => {
      store.delete(key)
    },
    find: async () => {
      return Array.from(store.values())
    },
  } as unknown as Repository<Settings>
}

describe('Settings Routes', () => {
  let app: express.Application
  let mockRepository: Repository<Settings>
  let encryptionService: EncryptionService
  let settingsService: SettingsService

  beforeAll(() => {
    app = express()
    app.use(express.json())

    mockRepository = createMockRepository()
    encryptionService = new EncryptionService()
    settingsService = new SettingsService(encryptionService, mockRepository)

    app.use('/api/settings', createSettingsRoutes(settingsService))
  })

  describe('GET /api/settings', () => {
    it('should return empty object when no settings exist', async () => {
      const response = await request(app).get('/api/settings')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({})
    })

    it('should return all settings as key-value pairs', async () => {
      // First set some settings
      await settingsService.set('IMAP_HOST', 'imap.example.com')
      await settingsService.set('SMTP_HOST', 'smtp.example.com')

      const response = await request(app).get('/api/settings')

      expect(response.status).toBe(200)
      expect(response.body.IMAP_HOST).toBe('imap.example.com')
      expect(response.body.SMTP_HOST).toBe('smtp.example.com')
    })
  })

  describe('GET /api/settings/:key', () => {
    it('should return 404 for non-existent key', async () => {
      const response = await request(app).get('/api/settings/NON_EXISTENT')

      expect(response.status).toBe(404)
    })

    it('should return setting value for existing key', async () => {
      await settingsService.set('LLM_API_KEY', 'test-api-key')

      const response = await request(app).get('/api/settings/LLM_API_KEY')

      expect(response.status).toBe(200)
      expect(response.body.value).toBe('test-api-key')
    })
  })

  describe('PUT /api/settings', () => {
    it('should save multiple settings', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({
          IMAP_HOST: 'new-imap.example.com',
          IMAP_PORT: '993',
          SMTP_HOST: 'new-smtp.example.com',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // Verify settings were saved
      expect(await settingsService.get('IMAP_HOST')).toBe('new-imap.example.com')
      expect(await settingsService.get('IMAP_PORT')).toBe('993')
      expect(await settingsService.get('SMTP_HOST')).toBe('new-smtp.example.com')
    })

    it('should handle empty settings object', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({})

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('PUT /api/settings/:key', () => {
    it('should save a single setting', async () => {
      const response = await request(app)
        .put('/api/settings/LLM_MODEL')
        .send({ value: 'gpt-4' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(await settingsService.get('LLM_MODEL')).toBe('gpt-4')
    })

    it('should require value in request body', async () => {
      const response = await request(app)
        .put('/api/settings/TEST_KEY')
        .send({})

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/settings/:key', () => {
    it('should delete an existing setting', async () => {
      await settingsService.set('TO_DELETE', 'value')

      const response = await request(app).delete('/api/settings/TO_DELETE')

      expect(response.status).toBe(200)
      expect(await settingsService.get('TO_DELETE')).toBeNull()
    })

    it('should return 200 even if setting does not exist', async () => {
      const response = await request(app).delete('/api/settings/NON_EXISTENT')

      expect(response.status).toBe(200)
    })
  })
})
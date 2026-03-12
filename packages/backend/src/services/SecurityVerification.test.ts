import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { DataSource } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'
import { EncryptionService } from './EncryptionService'
import { SettingsService } from './SettingsService'
import { Settings } from '../entities/Settings.entity'

describe('Security Verification', () => {
  let dataSource: DataSource
  let encryptionService: EncryptionService
  let settingsService: SettingsService
  const testDbPath = path.resolve(__dirname, '../../data/test-security.sqlite')
  const masterKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

  beforeAll(async () => {
    // Set MASTER_KEY before creating EncryptionService
    process.env.MASTER_KEY = masterKey

    // Ensure data directory exists
    const dataDir = path.dirname(testDbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Create test database
    dataSource = new DataSource({
      type: 'sqlite',
      database: testDbPath,
      entities: [Settings],
      synchronize: true,
      logging: false
    })

    await dataSource.initialize()

    encryptionService = new EncryptionService()
    const repository = dataSource.getRepository(Settings)
    settingsService = new SettingsService(encryptionService, repository)
  })

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy()
    }

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }

    delete process.env.MASTER_KEY
  })

  beforeEach(async () => {
    // Clear settings before each test
    const repository = dataSource.getRepository(Settings)
    await repository.clear()
  })

  describe('Credential Encryption', () => {
    it('should store credentials encrypted in database', async () => {
      const plaintext = 'my-super-secret-password'

      // Store via service
      await settingsService.set('TEST_SECRET', plaintext)

      // Read raw from database
      const repository = dataSource.getRepository(Settings)
      const rawSetting = await repository.findOne({ where: { key: 'TEST_SECRET' } })

      expect(rawSetting).not.toBeNull()
      expect(rawSetting!.value).not.toBe(plaintext)
      expect(rawSetting!.value).toMatch(/^[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/)
    })

    it('should NOT store plaintext in raw database file', async () => {
      const plaintext = 'plaintext-password-12345'

      await settingsService.set('SMTP_PASS', plaintext)

      // Read raw database file
      const dbContent = fs.readFileSync(testDbPath, 'utf-8')

      // The plaintext should NOT appear anywhere in the database file
      expect(dbContent).not.toContain(plaintext)
    })

    it('should retrieve credentials correctly via service', async () => {
      const plaintext = 'imap-password-xyz'

      await settingsService.set('IMAP_PASS', plaintext)
      const retrieved = await settingsService.get('IMAP_PASS')

      expect(retrieved).toBe(plaintext)
    })

    it('should handle multiple credentials correctly', async () => {
      const credentials = {
        IMAP_HOST: 'imap.example.com',
        IMAP_USER: 'user@example.com',
        IMAP_PASS: 'secret-imap-password',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PASS: 'secret-smtp-password',
        LLM_API_KEY: 'sk-1234567890abcdef'
      }

      // Store all credentials
      for (const [key, value] of Object.entries(credentials)) {
        await settingsService.set(key, value)
      }

      // Verify all can be retrieved correctly
      for (const [key, value] of Object.entries(credentials)) {
        const retrieved = await settingsService.get(key)
        expect(retrieved).toBe(value)
      }

      // Verify none appear as plaintext in database
      const dbContent = fs.readFileSync(testDbPath, 'utf-8')
      for (const value of Object.values(credentials)) {
        // Skip non-sensitive values (hostnames are not secrets)
        if (value.includes('password') || value.startsWith('sk-')) {
          expect(dbContent).not.toContain(value)
        }
      }
    })
  })

  describe('Database Integrity', () => {
    it('should use different encryption for same plaintext (random IV)', async () => {
      const plaintext = 'same-password'

      await settingsService.set('SECRET1', plaintext)
      await settingsService.set('SECRET2', plaintext)

      const repository = dataSource.getRepository(Settings)
      const secret1 = await repository.findOne({ where: { key: 'SECRET1' } })
      const secret2 = await repository.findOne({ where: { key: 'SECRET2' } })

      // Both should decrypt to same value
      expect(await settingsService.get('SECRET1')).toBe(plaintext)
      expect(await settingsService.get('SECRET2')).toBe(plaintext)

      // But stored values should be different (due to random IV)
      expect(secret1!.value).not.toBe(secret2!.value)
    })

    it('should detect tampering with encrypted value', async () => {
      const plaintext = 'original-value'

      await settingsService.set('TAMPER_TEST', plaintext)

      // Get the encrypted value
      const repository = dataSource.getRepository(Settings)
      const setting = await repository.findOne({ where: { key: 'TAMPER_TEST' } })
      const encryptedValue = setting!.value

      // Tamper with the ciphertext part
      const parts = encryptedValue.split(':')
      parts[2] = parts[2].slice(0, -2) + 'XX' // Modify ciphertext
      const tamperedValue = parts.join(':')

      // Update with tampered value
      setting!.value = tamperedValue
      await repository.save(setting!)

      // Decryption should fail
      await expect(settingsService.get('TAMPER_TEST')).rejects.toThrow()
    })
  })

  describe('MASTER_KEY Security', () => {
    it('should require MASTER_KEY to decrypt', async () => {
      const plaintext = 'protected-value'

      await settingsService.set('PROTECTED', plaintext)

      // Verify it can be retrieved with correct key
      expect(await settingsService.get('PROTECTED')).toBe(plaintext)

      // Simulate missing MASTER_KEY by creating new service without it
      delete process.env.MASTER_KEY

      expect(() => new EncryptionService()).toThrow('MASTER_KEY environment variable required')

      // Restore for cleanup
      process.env.MASTER_KEY = masterKey
    })

    it('should fail decryption with wrong MASTER_KEY', async () => {
      const plaintext = 'secret-data'

      await settingsService.set('SECRET_DATA', plaintext)

      // Create a new service with different key
      const wrongKey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210'
      process.env.MASTER_KEY = wrongKey

      const wrongEncryptionService = new EncryptionService()
      const repository = dataSource.getRepository(Settings)
      const wrongSettingsService = new SettingsService(wrongEncryptionService, repository)

      // Decryption with wrong key should fail
      await expect(wrongSettingsService.get('SECRET_DATA')).rejects.toThrow()

      // Restore correct key
      process.env.MASTER_KEY = masterKey
    })
  })
})
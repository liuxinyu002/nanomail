import { describe, it, expect, vi, beforeEach } from 'vitest'

// RED Phase: Import from non-existent file - this should fail
import { SettingsService } from './SettingsService'
import type { EncryptionService } from './EncryptionService'
import type { Repository } from 'typeorm'
import { Settings } from '../entities/Settings.entity'

describe('SettingsService', () => {
  let settingsService: SettingsService
  let mockEncryptionService: EncryptionService
  let mockRepository: Repository<Settings>

  beforeEach(() => {
    // Create mock EncryptionService
    mockEncryptionService = {
      encrypt: vi.fn((plaintext: string) => `encrypted:${plaintext}`),
      decrypt: vi.fn((ciphertext: string) => ciphertext.replace('encrypted:', '')),
    } as unknown as EncryptionService

    // Create mock Repository
    mockRepository = {
      findOne: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      create: vi.fn((data: Partial<Settings>) => data as Settings),
    } as unknown as Repository<Settings>

    settingsService = new SettingsService(mockEncryptionService, mockRepository)
  })

  describe('get', () => {
    it('returns null for non-existent key', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)

      const result = await settingsService.get('non-existent-key')

      expect(result).toBeNull()
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { key: 'non-existent-key' },
      })
    })

    it('returns decrypted value for existing key', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue({
        id: 1,
        key: 'api-key',
        value: 'encrypted:my-secret-api-key',
      } as Settings)

      const result = await settingsService.get('api-key')

      expect(result).toBe('my-secret-api-key')
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith('encrypted:my-secret-api-key')
    })

    it('throws error when decryption fails', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue({
        id: 1,
        key: 'corrupted-key',
        value: 'corrupted-encrypted-value',
      } as Settings)
      vi.mocked(mockEncryptionService.decrypt).mockImplementation(() => {
        throw new Error('Decryption failed')
      })

      await expect(settingsService.get('corrupted-key')).rejects.toThrow('Decryption failed')
    })
  })

  describe('set', () => {
    it('stores encrypted value for new key', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)
      vi.mocked(mockRepository.save).mockResolvedValue({
        id: 1,
        key: 'new-key',
        value: 'encrypted:new-value',
      } as Settings)

      await settingsService.set('new-key', 'new-value')

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('new-value')
      expect(mockRepository.save).toHaveBeenCalledWith({
        key: 'new-key',
        value: 'encrypted:new-value',
      })
    })

    it('updates existing key with encrypted value', async () => {
      const existingSetting: Settings = {
        id: 1,
        key: 'existing-key',
        value: 'encrypted:old-value',
      }
      vi.mocked(mockRepository.findOne).mockResolvedValue(existingSetting)
      vi.mocked(mockRepository.save).mockResolvedValue({
        ...existingSetting,
        value: 'encrypted:updated-value',
      })

      await settingsService.set('existing-key', 'updated-value')

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('updated-value')
      expect(mockRepository.save).toHaveBeenCalledWith({
        id: 1,
        key: 'existing-key',
        value: 'encrypted:updated-value',
      })
    })

    it('throws error when encryption fails', async () => {
      vi.mocked(mockEncryptionService.encrypt).mockImplementation(() => {
        throw new Error('Encryption failed')
      })

      await expect(settingsService.set('key', 'value')).rejects.toThrow('Encryption failed')
    })

    it('stores empty string correctly', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)
      vi.mocked(mockRepository.save).mockResolvedValue({
        id: 1,
        key: 'empty-key',
        value: 'encrypted:',
      } as Settings)

      await settingsService.set('empty-key', '')

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('')
      expect(mockRepository.save).toHaveBeenCalledWith({
        key: 'empty-key',
        value: 'encrypted:',
      })
    })
  })

  describe('delete', () => {
    it('deletes existing key', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 1, raw: {} })

      await settingsService.delete('existing-key')

      expect(mockRepository.delete).toHaveBeenCalledWith({ key: 'existing-key' })
    })

    it('succeeds silently for non-existent key', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 0, raw: {} })

      // Should not throw
      await expect(settingsService.delete('non-existent-key')).resolves.toBeUndefined()
    })
  })

  describe('encryption transparency', () => {
    it('never exposes raw encrypted values to callers', async () => {
      const rawEncryptedValue = 'encrypted:my-sensitive-data'
      vi.mocked(mockRepository.findOne).mockResolvedValue({
        id: 1,
        key: 'secret-key',
        value: rawEncryptedValue,
      } as Settings)

      const result = await settingsService.get('secret-key')

      // The caller should receive decrypted value, not the raw encrypted value
      expect(result).toBe('my-sensitive-data')
      expect(result).not.toBe(rawEncryptedValue)
    })

    it('always encrypts values before storing', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)
      vi.mocked(mockRepository.save).mockResolvedValue({
        id: 1,
        key: 'test-key',
        value: 'encrypted:test-value',
      } as Settings)

      await settingsService.set('test-key', 'test-value')

      // Verify encrypt was called
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('test-value')

      // Verify the stored value is encrypted
      const savedData = vi.mocked(mockRepository.save).mock.calls[0][0]
      expect(savedData.value).toBe('encrypted:test-value')
      expect(savedData.value).not.toBe('test-value')
    })
  })

  describe('edge cases', () => {
    it('handles special characters in key names', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)
      vi.mocked(mockRepository.save).mockResolvedValue({
        id: 1,
        key: 'key-with-special.chars_123',
        value: 'encrypted:value',
      } as Settings)

      await settingsService.set('key-with-special.chars_123', 'value')

      expect(mockRepository.save).toHaveBeenCalledWith({
        key: 'key-with-special.chars_123',
        value: 'encrypted:value',
      })
    })

    it('handles unicode values', async () => {
      const unicodeValue = '\u4e2d\u6587 \u65e5\u672c\u8a9e \ud55c\uad6d\uc5b4'
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)
      vi.mocked(mockRepository.save).mockResolvedValue({
        id: 1,
        key: 'unicode-key',
        value: `encrypted:${unicodeValue}`,
      } as Settings)

      await settingsService.set('unicode-key', unicodeValue)

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(unicodeValue)
    })

    it('handles emoji values', async () => {
      const emojiValue = '\u{1F600}\u{1F389}\u{1F680}' // 😀🎉🚀
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)
      vi.mocked(mockRepository.save).mockResolvedValue({
        id: 1,
        key: 'emoji-key',
        value: `encrypted:${emojiValue}`,
      } as Settings)

      await settingsService.set('emoji-key', emojiValue)

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(emojiValue)
    })

    it('handles very long values', async () => {
      const longValue = 'a'.repeat(10000)
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)
      vi.mocked(mockRepository.save).mockResolvedValue({
        id: 1,
        key: 'long-key',
        value: `encrypted:${longValue}`,
      } as Settings)

      await settingsService.set('long-key', longValue)

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(longValue)
    })
  })

  describe('error handling', () => {
    it('propagates repository errors on get', async () => {
      vi.mocked(mockRepository.findOne).mockRejectedValue(new Error('Database error'))

      await expect(settingsService.get('key')).rejects.toThrow('Database error')
    })

    it('propagates repository errors on set', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)
      vi.mocked(mockRepository.save).mockRejectedValue(new Error('Save failed'))

      await expect(settingsService.set('key', 'value')).rejects.toThrow('Save failed')
    })

    it('propagates repository errors on delete', async () => {
      vi.mocked(mockRepository.delete).mockRejectedValue(new Error('Delete failed'))

      await expect(settingsService.delete('key')).rejects.toThrow('Delete failed')
    })
  })
})
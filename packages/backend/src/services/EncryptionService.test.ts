import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// RED Phase: Import from non-existent file - this should fail
import { EncryptionService } from './EncryptionService'

describe('EncryptionService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset modules and environment for each test
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('throws error if MASTER_KEY environment variable is missing', async () => {
      delete process.env.MASTER_KEY

      // Dynamic import to test constructor with fresh module
      const { EncryptionService: FreshEncryptionService } = await import('./EncryptionService')

      expect(() => new FreshEncryptionService()).toThrow('MASTER_KEY environment variable required')
    })

    it('throws error if MASTER_KEY is empty string', async () => {
      process.env.MASTER_KEY = ''

      const { EncryptionService: FreshEncryptionService } = await import('./EncryptionService')

      expect(() => new FreshEncryptionService()).toThrow('MASTER_KEY environment variable required')
    })

    it('throws error if MASTER_KEY is not valid hex (wrong length)', async () => {
      process.env.MASTER_KEY = 'not-valid-key'

      const { EncryptionService: FreshEncryptionService } = await import('./EncryptionService')

      expect(() => new FreshEncryptionService()).toThrow('MASTER_KEY must be a 64-character hex string (32 bytes)')
    })

    it('throws error if MASTER_KEY is not 64 characters', async () => {
      process.env.MASTER_KEY = '0123456789abcdef0123456789abcdef' // 32 chars, not 64

      const { EncryptionService: FreshEncryptionService } = await import('./EncryptionService')

      expect(() => new FreshEncryptionService()).toThrow('MASTER_KEY must be a 64-character hex string (32 bytes)')
    })

    it('initializes successfully with valid MASTER_KEY', async () => {
      // 32 bytes = 64 hex characters
      process.env.MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

      const { EncryptionService: FreshEncryptionService } = await import('./EncryptionService')

      expect(() => new FreshEncryptionService()).not.toThrow()
    })
  })

  describe('encrypt', () => {
    let service: EncryptionService

    beforeEach(async () => {
      process.env.MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
      const { EncryptionService: FreshEncryptionService } = await import('./EncryptionService')
      service = new FreshEncryptionService()
    })

    it('returns compound string with correct format (iv:authTag:ciphertext)', () => {
      const plaintext = 'my-secret-password'
      const result = service.encrypt(plaintext)

      // Format: base64(iv):base64(authTag):base64(ciphertext)
      const parts = result.split(':')
      expect(parts).toHaveLength(3)

      // Each part should be valid base64
      expect(() => Buffer.from(parts[0], 'base64')).not.toThrow()
      expect(() => Buffer.from(parts[1], 'base64')).not.toThrow()
      expect(() => Buffer.from(parts[2], 'base64')).not.toThrow()
    })

    it('generates different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'my-secret-password'

      const result1 = service.encrypt(plaintext)
      const result2 = service.encrypt(plaintext)

      // IV should be different each time, so results should differ
      expect(result1).not.toBe(result2)
    })

    it('handles empty string', () => {
      const plaintext = ''
      const result = service.encrypt(plaintext)

      const parts = result.split(':')
      expect(parts).toHaveLength(3)

      // Should be able to decrypt empty string
      const decrypted = service.decrypt(result)
      expect(decrypted).toBe('')
    })

    it('handles special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;\':",.<>?/~`'
      const result = service.encrypt(plaintext)

      const decrypted = service.decrypt(result)
      expect(decrypted).toBe(plaintext)
    })

    it('handles unicode characters', () => {
      const plaintext = '\u4e2d\u6587 \u65e5\u672c\u8a9e \ud55c\uad6d\uc5b4' // Chinese, Japanese, Korean
      const result = service.encrypt(plaintext)

      const decrypted = service.decrypt(result)
      expect(decrypted).toBe(plaintext)
    })

    it('handles emoji characters', () => {
      const plaintext = '\u{1F600}\u{1F389}\u{1F680}' // 😀🎉🚀
      const result = service.encrypt(plaintext)

      const decrypted = service.decrypt(result)
      expect(decrypted).toBe(plaintext)
    })

    it('handles long strings', () => {
      const plaintext = 'a'.repeat(10000)
      const result = service.encrypt(plaintext)

      const decrypted = service.decrypt(result)
      expect(decrypted).toBe(plaintext)
    })

    it('generates correct IV length (12 bytes for GCM)', () => {
      const plaintext = 'test'
      const result = service.encrypt(plaintext)

      const parts = result.split(':')
      const iv = Buffer.from(parts[0], 'base64')

      // GCM standard IV length is 12 bytes
      expect(iv.length).toBe(12)
    })

    it('generates correct authTag length (16 bytes for GCM)', () => {
      const plaintext = 'test'
      const result = service.encrypt(plaintext)

      const parts = result.split(':')
      const authTag = Buffer.from(parts[1], 'base64')

      // GCM auth tag is 16 bytes
      expect(authTag.length).toBe(16)
    })
  })

  describe('decrypt', () => {
    let service: EncryptionService

    beforeEach(async () => {
      process.env.MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
      const { EncryptionService: FreshEncryptionService } = await import('./EncryptionService')
      service = new FreshEncryptionService()
    })

    it('returns original plaintext after encrypt/decrypt round trip', () => {
      const plaintext = 'my-secret-password'
      const encrypted = service.encrypt(plaintext)
      const decrypted = service.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('throws error for malformed compound string (missing parts)', () => {
      const malformed = 'abc123' // No colons

      expect(() => service.decrypt(malformed)).toThrow('Invalid encrypted data format')
    })

    it('throws error for malformed compound string (too many parts)', () => {
      const malformed = 'a:b:c:d' // 4 parts instead of 3

      expect(() => service.decrypt(malformed)).toThrow('Invalid encrypted data format')
    })

    it('throws error for malformed compound string (invalid base64 IV)', () => {
      const malformed = 'not-valid-base64!:validbase64==:validbase64=='

      expect(() => service.decrypt(malformed)).toThrow()
    })

    it('throws error for malformed compound string (invalid base64 authTag)', () => {
      const malformed = 'validbase64==:not-valid-base64!:validbase64=='

      expect(() => service.decrypt(malformed)).toThrow()
    })

    it('throws error for malformed compound string (invalid base64 ciphertext)', () => {
      const malformed = 'validbase64==:validbase64==:not-valid-base64!'

      expect(() => service.decrypt(malformed)).toThrow()
    })

    it('throws error for invalid IV length', () => {
      // Create a compound string with wrong IV length
      const wrongIv = Buffer.from('short').toString('base64')
      const validAuthTag = Buffer.alloc(16).toString('base64')
      const validCiphertext = Buffer.alloc(16).toString('base64')
      const malformed = `${wrongIv}:${validAuthTag}:${validCiphertext}`

      expect(() => service.decrypt(malformed)).toThrow('Invalid IV length')
    })

    it('throws error for invalid authTag length', () => {
      // Create a compound string with wrong authTag length
      const validIv = Buffer.alloc(12).toString('base64')
      const wrongAuthTag = Buffer.from('short').toString('base64')
      const validCiphertext = Buffer.alloc(16).toString('base64')
      const malformed = `${validIv}:${wrongAuthTag}:${validCiphertext}`

      expect(() => service.decrypt(malformed)).toThrow('Invalid authTag length')
    })

    it('throws error for authentication failure (tampered ciphertext)', () => {
      const plaintext = 'my-secret-password'
      const encrypted = service.encrypt(plaintext)

      // Tamper with ciphertext
      const parts = encrypted.split(':')
      const ciphertext = Buffer.from(parts[2], 'base64')
      ciphertext[0] ^= 0xff // Flip bits
      const tampered = `${parts[0]}:${parts[1]}:${ciphertext.toString('base64')}`

      expect(() => service.decrypt(tampered)).toThrow('Decryption failed')
    })

    it('throws error for authentication failure (tampered authTag)', () => {
      const plaintext = 'my-secret-password'
      const encrypted = service.encrypt(plaintext)

      // Tamper with authTag
      const parts = encrypted.split(':')
      const authTag = Buffer.from(parts[1], 'base64')
      authTag[0] ^= 0xff // Flip bits
      const tampered = `${parts[0]}:${authTag.toString('base64')}:${parts[2]}`

      expect(() => service.decrypt(tampered)).toThrow('Decryption failed')
    })

    it('throws error for authentication failure (tampered IV)', () => {
      const plaintext = 'my-secret-password'
      const encrypted = service.encrypt(plaintext)

      // Tamper with IV
      const parts = encrypted.split(':')
      const iv = Buffer.from(parts[0], 'base64')
      iv[0] ^= 0xff // Flip bits
      const tampered = `${iv.toString('base64')}:${parts[1]}:${parts[2]}`

      expect(() => service.decrypt(tampered)).toThrow('Decryption failed')
    })
  })

  describe('cross-instance compatibility', () => {
    it('can decrypt data encrypted by different instance with same key', async () => {
      process.env.MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

      const { EncryptionService: FreshEncryptionService } = await import('./EncryptionService')
      const service1 = new FreshEncryptionService()
      const service2 = new FreshEncryptionService()

      const plaintext = 'shared-secret'
      const encrypted = service1.encrypt(plaintext)
      const decrypted = service2.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })
  })

  describe('error messages', () => {
    it('provides clear error message for missing MASTER_KEY', async () => {
      delete process.env.MASTER_KEY

      const { EncryptionService: FreshEncryptionService } = await import('./EncryptionService')

      try {
        new FreshEncryptionService()
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('MASTER_KEY')
      }
    })

    it('provides clear error message for decryption failure', async () => {
      process.env.MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

      const { EncryptionService: FreshEncryptionService } = await import('./EncryptionService')
      const service = new FreshEncryptionService()

      // Use properly formatted but invalid encrypted data
      const validIv = Buffer.alloc(12).toString('base64')
      const validAuthTag = Buffer.alloc(16).toString('base64')
      const validCiphertext = Buffer.alloc(16).toString('base64')
      const invalid = `${validIv}:${validAuthTag}:${validCiphertext}`

      try {
        service.decrypt(invalid)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Decryption failed')
      }
    })
  })
})
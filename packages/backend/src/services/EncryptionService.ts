import crypto from 'crypto'

/**
 * EncryptionService provides AES-256-GCM encryption/decryption for sensitive data.
 *
 * Uses a compound string format for encrypted data:
 * `base64(iv):base64(authTag):base64(ciphertext)`
 *
 * Requirements:
 * - MASTER_KEY environment variable must be a 64-character hex string (32 bytes / 256 bits)
 * - AES-256-GCM provides authenticated encryption (confidentiality + integrity)
 */
export class EncryptionService {
  private readonly key: Buffer
  private readonly algorithm = 'aes-256-gcm'
  private readonly ivLength = 12 // GCM standard IV length (96 bits)
  private readonly authTagLength = 16 // GCM auth tag length (128 bits)

  constructor() {
    const masterKey = process.env.MASTER_KEY

    if (!masterKey || masterKey.length === 0) {
      throw new Error('MASTER_KEY environment variable required')
    }

    // Validate hex string and length
    if (!/^[0-9a-fA-F]{64}$/.test(masterKey)) {
      throw new Error('MASTER_KEY must be a 64-character hex string (32 bytes)')
    }

    // Convert hex string to Buffer
    this.key = Buffer.from(masterKey, 'hex')
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   *
   * @param plaintext - The string to encrypt
   * @returns Compound string in format: `base64(iv):base64(authTag):base64(ciphertext)`
   */
  encrypt(plaintext: string): string {
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(this.ivLength)

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, {
      authTagLength: this.authTagLength,
    })

    // Encrypt
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])

    // Get authentication tag
    const authTag = cipher.getAuthTag()

    // Return compound string
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
  }

  /**
   * Decrypts a compound string encrypted with AES-256-GCM.
   *
   * @param compoundString - Encrypted data in format: `base64(iv):base64(authTag):base64(ciphertext)`
   * @returns The decrypted plaintext
   * @throws Error if format is invalid, auth fails, or decryption fails
   */
  decrypt(compoundString: string): string {
    // Parse compound string
    const parts = compoundString.split(':')

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format: expected iv:authTag:ciphertext')
    }

    // Access array elements after length validation
    // TypeScript with noUncheckedIndexedAccess requires non-null assertions
    const ivBase64 = parts[0]!
    const authTagBase64 = parts[1]!
    const ciphertextBase64 = parts[2]!

    // Decode base64 components
    let iv: Buffer
    let authTag: Buffer
    let ciphertext: Buffer

    try {
      iv = Buffer.from(ivBase64, 'base64')
      authTag = Buffer.from(authTagBase64, 'base64')
      ciphertext = Buffer.from(ciphertextBase64, 'base64')
    } catch {
      throw new Error('Invalid encrypted data format: base64 decoding failed')
    }

    // Validate IV length
    if (iv.length !== this.ivLength) {
      throw new Error(`Invalid IV length: expected ${this.ivLength} bytes, got ${iv.length}`)
    }

    // Validate authTag length
    if (authTag.length !== this.authTagLength) {
      throw new Error(`Invalid authTag length: expected ${this.authTagLength} bytes, got ${authTag.length}`)
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv, {
      authTagLength: this.authTagLength,
    })

    // Set authentication tag
    decipher.setAuthTag(authTag)

    // Decrypt
    try {
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ])

      return plaintext.toString('utf8')
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
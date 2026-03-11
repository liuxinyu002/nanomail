import type { Repository } from 'typeorm'
import type { Settings } from '../entities/Settings.entity'
import type { EncryptionService } from './EncryptionService'

/**
 * SettingsService provides transparent encryption/decryption for settings values.
 *
 * This service wraps the Settings repository and automatically:
 * - Encrypts values before storing in the database
 * - Decrypts values when retrieving from the database
 *
 * Callers never see raw encrypted values - they only work with plaintext.
 */
export class SettingsService {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly repository: Repository<Settings>
  ) {}

  /**
   * Retrieves a setting value by key, automatically decrypting it.
   *
   * @param key - The setting key to retrieve
   * @returns The decrypted value, or null if the key doesn't exist
   * @throws Error if decryption fails (corrupted data)
   */
  async get(key: string): Promise<string | null> {
    const setting = await this.repository.findOne({
      where: { key },
    })

    if (!setting) {
      return null
    }

    // Decrypt the value before returning to caller
    return this.encryptionService.decrypt(setting.value)
  }

  /**
   * Stores a setting value, automatically encrypting it.
   *
   * If the key already exists, the value is updated.
   * If the key doesn't exist, a new setting is created.
   *
   * @param key - The setting key
   * @param value - The plaintext value to store (will be encrypted)
   * @throws Error if encryption fails
   */
  async set(key: string, value: string): Promise<void> {
    // Encrypt the value before storing
    const encryptedValue = this.encryptionService.encrypt(value)

    // Check if setting already exists
    const existing = await this.repository.findOne({
      where: { key },
    })

    if (existing) {
      // Update existing setting
      await this.repository.save({
        id: existing.id,
        key,
        value: encryptedValue,
      })
    } else {
      // Create new setting
      await this.repository.save({
        key,
        value: encryptedValue,
      })
    }
  }

  /**
   * Deletes a setting by key.
   *
   * Succeeds silently if the key doesn't exist.
   *
   * @param key - The setting key to delete
   */
  async delete(key: string): Promise<void> {
    await this.repository.delete({ key })
  }
}
/**
 * Migration: Add completedAt field to todos table
 *
 * This migration:
 * 1. Adds the completedAt column (nullable datetime, default null)
 * 2. Backfills historical data: sets completedAt = updatedAt for completed todos
 *
 * Run this migration after deploying the entity changes.
 *
 * Usage:
 *   pnpm --filter @nanomail/backend tsx src/database/migrations/addCompletedAtField.ts
 */

import 'reflect-metadata'
import { AppDataSource } from '../../config/database'
import { createLogger } from '../../config/logger'

const log = createLogger('Migration:AddCompletedAt')

async function runMigration(): Promise<void> {
  log.info('Starting migration: add completedAt field to todos table')

  try {
    await AppDataSource.initialize()
    const queryRunner = AppDataSource.createQueryRunner()

    try {
      // Step 1: Check if column already exists
      const tableInfo = await queryRunner.query(
        `PRAGMA table_info(todos)`
      )
      const hasCompletedAt = tableInfo.some(
        (col: { name: string }) => col.name === 'completedAt'
      )

      if (hasCompletedAt) {
        log.info('completedAt column already exists, skipping column creation')
      } else {
        // Step 2: Add completedAt column
        log.info('Adding completedAt column...')
        await queryRunner.query(`
          ALTER TABLE todos
          ADD COLUMN completedAt DATETIME DEFAULT NULL
        `)
        log.info('completedAt column added successfully')
      }

      // Step 3: Backfill historical data
      // SQLite doesn't have an updatedAt column by default, so we use createdAt as fallback
      // For completed todos without completedAt, set it to their createdAt
      log.info('Backfilling historical data...')
      const result = await queryRunner.query(`
        UPDATE todos
        SET completedAt = createdAt
        WHERE status = 'completed'
          AND completedAt IS NULL
      `)
      log.info({ changes: result.changes }, 'Historical data backfilled')

      // Step 4: Create index for archive queries (if not exists)
      log.info('Creating archive index...')
      try {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_todos_archive
          ON todos(status, completedAt DESC, id DESC)
        `)
        log.info('Archive index created successfully')
      } catch (indexError) {
        // Index might already exist from TypeORM synchronize
        log.info({ err: indexError }, 'Index may already exist, continuing')
      }

      log.info('Migration completed successfully')
    } finally {
      await queryRunner.release()
    }
  } catch (error) {
    log.error({ err: error }, 'Migration failed')
    throw error
  } finally {
    await AppDataSource.destroy()
  }
}

// Run migration if executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      log.info('Migration script finished')
      process.exit(0)
    })
    .catch((error) => {
      log.error({ err: error }, 'Migration script failed')
      process.exit(1)
    })
}

export { runMigration }

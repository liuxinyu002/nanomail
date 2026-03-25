import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration: Add completedAt field to todos table
 *
 * This migration:
 * 1. Adds the completedAt column (nullable datetime, default null)
 * 2. Backfills historical data: sets completedAt = createdAt for completed todos
 * 3. Creates an index for archive queries
 */
export class AddTodoCompletedAt1711000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add completedAt column
    await queryRunner.query(`
      ALTER TABLE todos
      ADD COLUMN completedAt DATETIME DEFAULT NULL
    `)

    // Step 2: Backfill historical data
    // SQLite doesn't have an updatedAt column by default, so we use createdAt as fallback
    // For completed todos without completedAt, set it to their createdAt
    await queryRunner.query(`
      UPDATE todos
      SET completedAt = createdAt
      WHERE status = 'completed'
        AND completedAt IS NULL
    `)

    // Step 3: Create index for archive queries
    await queryRunner.query(`
      CREATE INDEX idx_todos_archive
      ON todos(status, completedAt DESC, id DESC)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop the index
    await queryRunner.query(`
      DROP INDEX idx_todos_archive
    `)

    // Step 2: SQLite doesn't support DROP COLUMN directly
    // We need to recreate the table without the completedAt column
    await queryRunner.query(`
      CREATE TABLE todos_backup AS
      SELECT id, emailId, description, status, deadline, boardColumnId, position, notes, source, createdAt
      FROM todos
    `)

    await queryRunner.query(`DROP TABLE todos`)

    await queryRunner.query(`
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emailId INTEGER,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        deadline DATETIME,
        boardColumnId INTEGER DEFAULT 1,
        position INTEGER DEFAULT 0,
        notes TEXT,
        source VARCHAR(20) DEFAULT 'manual',
        createdAt DATETIME NOT NULL
      )
    `)

    await queryRunner.query(`
      INSERT INTO todos
      SELECT * FROM todos_backup
    `)

    await queryRunner.query(`DROP TABLE todos_backup`)
  }
}

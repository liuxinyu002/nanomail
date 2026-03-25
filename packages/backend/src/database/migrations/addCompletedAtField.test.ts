import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import 'reflect-metadata'
import { DataSource } from 'typeorm'

describe('Migration: addCompletedAtField', () => {
  let dataSource: DataSource

  beforeAll(async () => {
    // Create an in-memory SQLite database for testing
    // We don't use entities here - we manually create the table structure
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [], // No entities - we'll manually manage schema
      synchronize: false,
      logging: false
    })
    await dataSource.initialize()

    // Create the todos table without completedAt (simulating pre-migration state)
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emailId INTEGER,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        deadline DATETIME,
        boardColumnId INTEGER DEFAULT 1,
        position INTEGER DEFAULT 0,
        notes TEXT,
        source VARCHAR(20) DEFAULT 'manual',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  })

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy()
    }
  })

  it('should add completedAt column to todos table', async () => {
    // Run migration step
    const queryRunner = dataSource.createQueryRunner()
    await queryRunner.query(`
      ALTER TABLE todos
      ADD COLUMN completedAt DATETIME DEFAULT NULL
    `)

    // Verify column exists
    const tableInfo = await queryRunner.query(`PRAGMA table_info(todos)`)
    const completedAtCol = tableInfo.find(
      (col: { name: string }) => col.name === 'completedAt'
    )

    expect(completedAtCol).toBeDefined()
    expect(completedAtCol.type.toUpperCase()).toBe('DATETIME')

    await queryRunner.release()
  })

  it('should backfill completedAt for completed todos', async () => {
    // Insert test data
    const createdAt = '2024-01-01 10:00:00'
    await dataSource.query(`
      INSERT INTO todos (description, status, createdAt, completedAt)
      VALUES
        ('Completed task 1', 'completed', ?, NULL),
        ('Completed task 2', 'completed', ?, NULL),
        ('Pending task', 'pending', ?, NULL)
    `, [createdAt, createdAt, createdAt])

    // Run backfill
    await dataSource.query(`
      UPDATE todos
      SET completedAt = createdAt
      WHERE status = 'completed' AND completedAt IS NULL
    `)

    // Verify backfill
    const todos = await dataSource.query(`
      SELECT description, status, completedAt
      FROM todos
      ORDER BY id
    `)

    expect(todos[0].completedAt).toBe(createdAt)
    expect(todos[1].completedAt).toBe(createdAt)
    expect(todos[2].completedAt).toBeNull()
  })

  it('should create archive index', async () => {
    const queryRunner = dataSource.createQueryRunner()

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_todos_archive
      ON todos(status, completedAt DESC, id DESC)
    `)

    // Verify index exists
    const indices = await queryRunner.query(`
      SELECT name FROM sqlite_master
      WHERE type = 'index' AND name = 'idx_todos_archive'
    `)

    expect(indices.length).toBeGreaterThan(0)
    expect(indices[0].name).toBe('idx_todos_archive')

    await queryRunner.release()
  })
})

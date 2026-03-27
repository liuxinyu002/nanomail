import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as path from 'path'
import * as fs from 'fs'

console.log('[Database] Loading better-sqlite3...')
let BetterSqlite3: any
try {
  BetterSqlite3 = require('better-sqlite3')
  console.log('[Database] better-sqlite3 loaded successfully')
} catch (error) {
  console.error('[Database] Failed to load better-sqlite3:', error)
  throw error
}
import { Settings } from '../entities/Settings.entity'
import { Email } from '../entities/Email.entity'
import { Todo } from '../entities/Todo.entity'
import { Label } from '../entities/Label.entity'
import { BoardColumn } from '../entities/BoardColumn.entity'

/**
 * Get database path based on environment
 * - Production: Use USER_DATA_PATH (passed from Electron main process)
 * - Development: Use project-relative path
 */
function getDatabasePath(): string {
  const isProduction = process.env.NODE_ENV === 'production'

  console.log('[Database] getDatabasePath called')
  console.log('[Database] NODE_ENV:', process.env.NODE_ENV)
  console.log('[Database] isProduction:', isProduction)
  console.log('[Database] USER_DATA_PATH:', process.env.USER_DATA_PATH)

  if (isProduction && process.env.USER_DATA_PATH) {
    // Production: use userData directory (persistent across app updates)
    const userDataPath = process.env.USER_DATA_PATH
    const dataDir = path.join(userDataPath, 'data')

    console.log('[Database] Production mode, dataDir:', dataDir)

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      console.log('[Database] Creating data directory...')
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const dbPath = path.join(dataDir, 'database.sqlite')
    console.log('[Database] Database path:', dbPath)
    return dbPath
  }

  // Development: use project-relative path
  const devPath = path.resolve(__dirname, '../../data/database.sqlite')
  console.log('[Database] Development mode, path:', devPath)
  return devPath
}

/**
 * Check if this is a fresh installation (no existing database)
 */
function isFreshInstall(): boolean {
  const dbPath = getDatabasePath()
  return !fs.existsSync(dbPath)
}

const dbPath = getDatabasePath()
const freshInstall = isFreshInstall()

// In production, enable synchronize for fresh installs to create initial schema
// This is safe because:
// 1. Only runs once when database doesn't exist
// 2. TypeORM's synchronize only creates missing tables, it doesn't drop existing ones
// 3. For subsequent runs, synchronize is disabled to prevent accidental schema changes
const shouldSynchronize = process.env.NODE_ENV !== 'production' || freshInstall

console.log('[Database] Fresh install:', freshInstall)
console.log('[Database] Synchronize enabled:', shouldSynchronize)

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  driver: BetterSqlite3,
  database: dbPath,
  entities: [Settings, Email, Todo, Label, BoardColumn],
  synchronize: shouldSynchronize,
  logging: false
})

/**
 * Default board columns to seed on first initialization
 * Inbox (id: 1) is a system column that cannot be deleted
 */
const DEFAULT_COLUMNS = [
  { id: 1, name: '收件箱', color: '#C9CDD4', order: 0, isSystem: 1 },  // Inbox - system column (Macaron Gray)
  { id: 2, name: '待处理', color: '#f59e0b', order: 1, isSystem: 0 },  // Todo
  { id: 3, name: '进行中', color: '#10b981', order: 2, isSystem: 0 },  // In Progress
  { id: 4, name: '已完成', color: '#3b82f6', order: 3, isSystem: 0 },  // Done
]

export async function initializeDatabase(): Promise<void> {
  console.log('[Database] initializeDatabase called')
  console.log('[Database] Attempting to initialize DataSource...')
  try {
    await AppDataSource.initialize()
    console.log('[Database] DataSource initialized successfully')
  } catch (error) {
    console.error('[Database] DataSource initialization failed:', error)
    throw error
  }

  // Seed default board columns if they don't exist
  const columnRepository = AppDataSource.getRepository(BoardColumn)
  const existingColumns = await columnRepository.count()

  if (existingColumns === 0) {
    await columnRepository.save(
      DEFAULT_COLUMNS.map(col => columnRepository.create(col))
    )
  }
}

export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy()
  }
}
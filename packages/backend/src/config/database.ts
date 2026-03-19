import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Settings } from '../entities/Settings.entity'
import { Email } from '../entities/Email.entity'
import { Todo } from '../entities/Todo.entity'
import { Label } from '../entities/Label.entity'
import { BoardColumn } from '../entities/BoardColumn.entity'
import * as path from 'path'

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.resolve(__dirname, '../../data/database.sqlite'),
  entities: [Settings, Email, Todo, Label, BoardColumn],
  synchronize: process.env.NODE_ENV !== 'production',
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
  await AppDataSource.initialize()

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
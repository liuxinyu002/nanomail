import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Settings } from '../entities/Settings.entity'
import { Email } from '../entities/Email.entity'
import { Todo } from '../entities/Todo.entity'
import { Label } from '../entities/Label.entity'
import * as path from 'path'

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.resolve(__dirname, '../../data/database.sqlite'),
  entities: [Settings, Email, Todo, Label],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false
})

export async function initializeDatabase(): Promise<void> {
  await AppDataSource.initialize()
}

export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy()
  }
}
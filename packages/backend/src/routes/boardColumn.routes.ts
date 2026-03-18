import { Router } from 'express'
import type { DataSource } from 'typeorm'
import { BoardColumn } from '../entities/BoardColumn.entity'
import { Todo } from '../entities/Todo.entity'
import { CreateBoardColumnSchema, UpdateBoardColumnSchema, BoardColumnIds } from '@nanomail/shared'
import { createLogger } from '../config/logger.js'

const log = createLogger('boardColumn.routes')

/**
 * BoardColumns response
 */
export interface BoardColumnsResponse {
  columns: Array<{
    id: number
    name: string
    color: string | null
    order: number
    isSystem: boolean
    createdAt: string
  }>
}

/**
 * Formats a BoardColumn entity for API response.
 * Converts Date fields to ISO strings and isSystem number to boolean.
 */
function formatBoardColumn(column: BoardColumn): BoardColumnsResponse['columns'][0] {
  return {
    id: column.id,
    name: column.name,
    color: column.color,
    order: column.order,
    isSystem: column.isSystem === 1,
    createdAt: column.createdAt.toISOString(),
  }
}

/**
 * Creates Express routes for board column operations.
 */
export function createBoardColumnRoutes(dataSource: DataSource): Router {
  const router = Router()
  const columnRepository = dataSource.getRepository(BoardColumn)

  /**
   * @route GET /api/board-columns
   * @description List all board columns sorted by order.
   * @returns {BoardColumnsResponse} List of board columns
   */
  router.get('/', async (req, res, next) => {
    try {
      log.debug('Fetching all board columns')
      const columns = await columnRepository.find({
        order: { order: 'ASC' }
      })

      res.json({ columns: columns.map(formatBoardColumn) })
    } catch (error) {
      log.error({ err: error }, 'Failed to fetch board columns')
      next(error)
    }
  })

  /**
   * @route POST /api/board-columns
   * @description Create a new board column.
   * @bodyparam {string} name - Column name (1-50 characters)
   * @bodyparam {string} [color] - Optional color code
   * @bodyparam {number} order - Position order
   * @returns {Object} Created column object
   * @throws {400} Invalid request body
   */
  router.post('/', async (req, res, next) => {
    try {
      log.debug({ body: req.body }, 'Creating board column')
      const validationResult = CreateBoardColumnSchema.safeParse(req.body)
      if (!validationResult.success) {
        log.warn({ errors: validationResult.error.errors }, 'Invalid request body for creating column')
        return res.status(400).json({
          error: 'Invalid request body',
          details: validationResult.error.errors,
        })
      }

      const { name, color, order } = validationResult.data

      const column = columnRepository.create({
        name,
        color: color ?? null,
        order,
        isSystem: 0, // User-created columns are not system columns
      })

      const savedColumn = await columnRepository.save(column)
      log.info({ columnId: savedColumn.id, name: savedColumn.name }, 'Board column created')
      res.status(201).json(formatBoardColumn(savedColumn))
    } catch (error) {
      log.error({ err: error }, 'Failed to create board column')
      next(error)
    }
  })

  /**
   * @route PATCH /api/board-columns/:id
   * @description Update a board column.
   * @param {number} id - Column ID
   * @bodyparam {string} [name] - Column name (1-50 characters)
   * @bodyparam {string} [color] - Color code
   * @bodyparam {number} [order] - Position order
   * @returns {Object} Updated column object
   * @throws {400} Invalid request body or column ID
   * @throws {404} Column not found
   */
  router.patch('/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      log.debug({ columnId: id, body: req.body }, 'Updating board column')

      if (isNaN(id)) {
        log.warn({ param: req.params.id }, 'Invalid column ID provided')
        return res.status(400).json({ error: 'Invalid column ID' })
      }

      const validationResult = UpdateBoardColumnSchema.safeParse(req.body)
      if (!validationResult.success) {
        log.warn({ columnId: id, errors: validationResult.error.errors }, 'Invalid request body for updating column')
        return res.status(400).json({
          error: 'Invalid request body',
          details: validationResult.error.errors,
        })
      }

      const column = await columnRepository.findOne({ where: { id } })
      if (!column) {
        log.warn({ columnId: id }, 'Column not found for update')
        return res.status(404).json({ error: 'Column not found' })
      }

      const validatedData = validationResult.data

      // Update only provided fields
      if (validatedData.name !== undefined) {
        column.name = validatedData.name
      }
      if (validatedData.color !== undefined) {
        column.color = validatedData.color ?? null
      }
      if (validatedData.order !== undefined) {
        column.order = validatedData.order
      }

      const savedColumn = await columnRepository.save(column)
      log.info({ columnId: savedColumn.id, name: savedColumn.name }, 'Board column updated')
      res.json(formatBoardColumn(savedColumn))
    } catch (error) {
      log.error({ err: error }, 'Failed to update board column')
      next(error)
    }
  })

  /**
   * @route DELETE /api/board-columns/:id
   * @description Delete a board column. System columns cannot be deleted.
   * All todos in the column will be moved to Inbox (id=1).
   * @param {number} id - Column ID
   * @returns {Object} { message: string, movedTasks: number }
   * @throws {400} Invalid column ID
   * @throws {403} Cannot delete system column
   * @throws {404} Column not found
   */
  router.delete('/:id', async (req, res, next) => {
    const queryRunner = dataSource.createQueryRunner()

    try {
      const id = parseInt(req.params.id, 10)
      log.debug({ columnId: id }, 'Deleting board column')

      if (isNaN(id)) {
        log.warn({ param: req.params.id }, 'Invalid column ID provided for deletion')
        return res.status(400).json({ error: 'Invalid column ID' })
      }

      // Start transaction FIRST to prevent race condition
      await queryRunner.connect()
      await queryRunner.startTransaction()

      try {
        // Fetch column INSIDE transaction to prevent race condition
        const column = await queryRunner.manager.getRepository(BoardColumn).findOne({ where: { id } })
        if (!column) {
          log.warn({ columnId: id }, 'Column not found for deletion')
          await queryRunner.rollbackTransaction()
          return res.status(404).json({ error: 'Column not found' })
        }

        // Prevent deletion of system columns (Inbox)
        if (column.isSystem === 1) {
          log.warn({ columnId: id, name: column.name }, 'Attempted to delete system column')
          await queryRunner.rollbackTransaction()
          return res.status(403).json({ error: 'Cannot delete system column' })
        }

        // Migrate all todos from this column to Inbox
        const todoRepository = queryRunner.manager.getRepository(Todo)
        const updateResult = await todoRepository.update(
          { boardColumnId: id },
          { boardColumnId: BoardColumnIds.INBOX }
        )

        // Delete the column
        await queryRunner.manager.getRepository(BoardColumn).delete(id)

        // Commit transaction
        await queryRunner.commitTransaction()

        log.info({ columnId: id, name: column.name, movedTasks: updateResult.affected ?? 0 }, 'Board column deleted')
        res.status(200).json({
          message: `Column "${column.name}" deleted successfully`,
          movedTasks: updateResult.affected ?? 0,
        })
      } catch (error) {
        // Rollback on error
        await queryRunner.rollbackTransaction()
        throw error
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to delete board column')
      next(error)
    } finally {
      await queryRunner.release()
    }
  })

  return router
}
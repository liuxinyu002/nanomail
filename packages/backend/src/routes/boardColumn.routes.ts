import { Router } from 'express'
import type { DataSource } from 'typeorm'
import { BoardColumn } from '../entities/BoardColumn.entity'
import { CreateBoardColumnSchema, UpdateBoardColumnSchema } from '@nanomail/shared'

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
      const columns = await columnRepository.find({
        order: { order: 'ASC' }
      })

      res.json({ columns: columns.map(formatBoardColumn) })
    } catch (error) {
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
      const validationResult = CreateBoardColumnSchema.safeParse(req.body)
      if (!validationResult.success) {
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
      res.status(201).json(formatBoardColumn(savedColumn))
    } catch (error) {
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
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid column ID' })
      }

      const validationResult = UpdateBoardColumnSchema.safeParse(req.body)
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: validationResult.error.errors,
        })
      }

      const column = await columnRepository.findOne({ where: { id } })
      if (!column) {
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
      res.json(formatBoardColumn(savedColumn))
    } catch (error) {
      next(error)
    }
  })

  /**
   * @route DELETE /api/board-columns/:id
   * @description Delete a board column. System columns cannot be deleted.
   * @param {number} id - Column ID
   * @returns {void} 204 No Content on success
   * @throws {400} Invalid column ID
   * @throws {403} Cannot delete system column
   * @throws {404} Column not found
   */
  router.delete('/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid column ID' })
      }

      const column = await columnRepository.findOne({ where: { id } })
      if (!column) {
        return res.status(404).json({ error: 'Column not found' })
      }

      // Prevent deletion of system columns (Inbox)
      if (column.isSystem === 1) {
        return res.status(403).json({ error: 'Cannot delete system column' })
      }

      await columnRepository.delete(id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  })

  return router
}
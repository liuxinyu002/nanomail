import { Router } from 'express'
import type { DataSource, SelectQueryBuilder } from 'typeorm'
import { Todo, type TodoStatus } from '../entities/Todo.entity'
import { UpdateTodoSchema, TodoDateRangeQuerySchema, UpdateTodoPositionSchema, BatchUpdateTodoPositionSchema } from '@nanomail/shared'

/**
 * Todos query parameters
 */
export interface TodosQuery {
  status?: TodoStatus
  boardColumnId?: number
  emailId?: number
}

/**
 * Todos response
 */
export interface TodosResponse {
  todos: Array<{
    id: number
    emailId: number
    description: string
    status: TodoStatus
    deadline: string | null
    boardColumnId: number
    position: number
    createdAt: string
  }>
}

/**
 * Valid todo statuses
 */
const VALID_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed']

/**
 * Formats a Todo entity for API response.
 * Converts Date fields to ISO strings and handles nullable deadline.
 */
function formatTodo(todo: Todo): TodosResponse['todos'][0] {
  return {
    id: todo.id,
    emailId: todo.emailId,
    description: todo.description,
    status: todo.status,
    deadline: todo.deadline?.toISOString() ?? null,
    boardColumnId: todo.boardColumnId,
    position: todo.position,
    createdAt: todo.createdAt.toISOString(),
  }
}

/**
 * Applies status, boardColumnId, and emailId filters to a TypeORM query builder.
 */
function applyFiltersToQueryBuilder(
  queryBuilder: SelectQueryBuilder<Todo>,
  filters: { status?: unknown; boardColumnId?: unknown; emailId?: unknown }
): SelectQueryBuilder<Todo> {
  let qb = queryBuilder

  if (filters.status && VALID_STATUSES.includes(filters.status as TodoStatus)) {
    qb = qb.andWhere('todo.status = :status', { status: filters.status })
  }
  if (filters.boardColumnId) {
    const boardColumnId = parseInt(filters.boardColumnId as string, 10)
    if (!isNaN(boardColumnId)) {
      qb = qb.andWhere('todo.boardColumnId = :boardColumnId', { boardColumnId })
    }
  }
  if (filters.emailId) {
    const emailId = parseInt(filters.emailId as string, 10)
    if (!isNaN(emailId)) {
      qb = qb.andWhere('todo.emailId = :emailId', { emailId })
    }
  }

  return qb
}

/**
 * Builds a where clause object from query parameters.
 */
function buildWhereClause(query: {
  status?: unknown
  boardColumnId?: unknown
  emailId?: unknown
}): Record<string, unknown> {
  const where: Record<string, unknown> = {}

  if (query.status && VALID_STATUSES.includes(query.status as TodoStatus)) {
    where.status = query.status
  }
  if (query.boardColumnId) {
    const boardColumnId = parseInt(query.boardColumnId as string, 10)
    if (!isNaN(boardColumnId)) {
      where.boardColumnId = boardColumnId
    }
  }
  if (query.emailId) {
    const emailId = parseInt(query.emailId as string, 10)
    if (!isNaN(emailId)) {
      where.emailId = emailId
    }
  }

  return where
}

/**
 * Creates Express routes for todo operations.
 */
export function createTodoRoutes(dataSource: DataSource): Router {
  const router = Router()
  const todoRepository = dataSource.getRepository(Todo)

  /**
   * @route GET /api/todos
   * @description List todos with optional filtering by status, boardColumnId, emailId, and date range.
   * @queryparam {string} status - Filter by status (pending, in_progress, completed)
   * @queryparam {number} boardColumnId - Filter by board column ID
   * @queryparam {number} emailId - Filter by email ID
   * @queryparam {string} startDate - Start date for deadline range (YYYY-MM-DD)
   * @queryparam {string} endDate - End date for deadline range (YYYY-MM-DD)
   * @returns {TodosResponse} List of todos sorted by position within column, then deadline (nulls last), then createdAt
   */
  router.get('/', async (req, res, next) => {
    try {
      const { startDate, endDate, status, boardColumnId, emailId } = req.query

      // Date range query using query builder
      if (startDate && endDate) {
        const dateRangeResult = TodoDateRangeQuerySchema.safeParse({ startDate, endDate })

        if (!dateRangeResult.success) {
          // Fall back to regular query if date format is invalid
          const where = buildWhereClause({ status, boardColumnId, emailId })
          const todos = await todoRepository.find({
            where,
            order: {
              position: 'ASC',
              deadline: { direction: 'ASC', nulls: 'LAST' },
              createdAt: 'ASC',
            },
          })
          return res.json({ todos: todos.map(formatTodo) })
        }

        // Valid date range - use query builder
        const start = new Date(`${startDate}T00:00:00Z`)
        const end = new Date(`${endDate}T23:59:59Z`)

        let queryBuilder = todoRepository
          .createQueryBuilder('todo')
          .where('todo.deadline BETWEEN :start AND :end', { start, end })
          .orWhere('todo.deadline IS NULL')
          .orderBy('todo.position', 'ASC')
          .addOrderBy('todo.deadline', 'ASC', 'NULLS LAST')
          .addOrderBy('todo.createdAt', 'ASC')

        queryBuilder = applyFiltersToQueryBuilder(queryBuilder, { status, boardColumnId, emailId })
        const todos = await queryBuilder.getMany()

        return res.json({ todos: todos.map(formatTodo) })
      }

      // Regular query without date range
      const where = buildWhereClause(req.query)
      const todos = await todoRepository.find({
        where,
        order: {
          position: 'ASC',
          deadline: { direction: 'ASC', nulls: 'LAST' },
          createdAt: 'ASC',
        },
      })

      res.json({ todos: todos.map(formatTodo) })
    } catch (error) {
      next(error)
    }
  })

  /**
   * @route PATCH /api/todos/:id/status
   * @description Update only the status of a todo item.
   * @param {number} id - Todo ID
   * @bodyparam {string} status - New status (pending, in_progress, completed)
   * @returns {Object} Updated todo object
   * @throws {400} Invalid status value
   * @throws {404} Todo not found
   */
  router.patch('/:id/status', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid todo ID' })
      }

      const { status } = req.body

      if (!status || !VALID_STATUSES.includes(status)) {
        res.status(400).json({
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        })
        return
      }

      const todo = await todoRepository.findOne({ where: { id } })

      if (!todo) {
        res.status(404).json({ error: 'Todo not found' })
        return
      }

      todo.status = status
      await todoRepository.save(todo)

      res.json(formatTodo(todo))
    } catch (error) {
      next(error)
    }
  })

  /**
   * @route PATCH /api/todos/:id/position
   * @description Update the position and/or column of a todo item (for drag-and-drop).
   * @param {number} id - Todo ID
   * @bodyparam {number} boardColumnId - New column ID (required)
   * @bodyparam {number} [position] - New position within column
   * @bodyparam {string|null} [deadline] - Optional deadline update
   * @returns {Object} Updated todo object
   * @throws {400} Invalid request body
   * @throws {404} Todo not found
   */
  router.patch('/:id/position', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid todo ID' })
      }

      const validationResult = UpdateTodoPositionSchema.safeParse(req.body)
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: validationResult.error.errors,
        })
      }

      const { boardColumnId, position, deadline } = validationResult.data

      const todo = await todoRepository.findOne({ where: { id } })
      if (!todo) {
        return res.status(404).json({ error: 'Todo not found' })
      }

      todo.boardColumnId = boardColumnId
      if (position !== undefined) {
        todo.position = position
      }
      if (deadline !== undefined) {
        todo.deadline = deadline ? new Date(deadline) : null
      }

      await todoRepository.save(todo)
      res.json(formatTodo(todo))
    } catch (error) {
      next(error)
    }
  })

  /**
   * @route POST /api/todos/batch-position
   * @description Batch update positions of multiple todos (for rebalancing after drag-and-drop).
   * @bodyparam {Array} updates - Array of { id, boardColumnId, position }
   * @returns {Object} Success message
   * @throws {400} Invalid request body
   */
  router.post('/batch-position', async (req, res, next) => {
    try {
      const validationResult = BatchUpdateTodoPositionSchema.safeParse(req.body)
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: validationResult.error.errors,
        })
      }

      const { updates } = validationResult.data

      await dataSource.transaction(async (transactionManager) => {
        const transactionRepo = transactionManager.getRepository(Todo)
        for (const update of updates) {
          await transactionRepo.update(update.id, {
            boardColumnId: update.boardColumnId,
            position: update.position,
          })
        }
      })

      res.json({ success: true, updated: updates.length })
    } catch (error) {
      next(error)
    }
  })

  /**
   * @route PATCH /api/todos/:id
   * @description Update todo fields (description, deadline, status, boardColumnId, position).
   *             Uses Zod schema validation. Rejects unknown fields.
   * @param {number} id - Todo ID
   * @bodyparam {string} [description] - New description (1-2000 chars)
   * @bodyparam {string|null} [deadline] - New deadline (ISO datetime or null to clear)
   * @bodyparam {string} [status] - New status (pending, in_progress, completed)
   * @bodyparam {number} [boardColumnId] - New column ID
   * @bodyparam {number} [position] - New position within column
   * @returns {Object} Updated todo object
   * @throws {400} Invalid request body or todo ID
   * @throws {404} Todo not found
   */
  router.patch('/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid todo ID' })
      }

      const validationResult = UpdateTodoSchema.safeParse(req.body)
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: validationResult.error.errors,
        })
      }

      const validatedData = validationResult.data
      const todo = await todoRepository.findOne({ where: { id } })

      if (!todo) {
        return res.status(404).json({ error: 'Todo not found' })
      }

      // Update only provided fields
      if (validatedData.description !== undefined) {
        todo.description = validatedData.description
      }
      if (validatedData.deadline !== undefined) {
        todo.deadline = validatedData.deadline ? new Date(validatedData.deadline) : null
      }
      if (validatedData.status !== undefined) {
        todo.status = validatedData.status
      }
      if (validatedData.boardColumnId !== undefined) {
        todo.boardColumnId = validatedData.boardColumnId
      }
      if (validatedData.position !== undefined) {
        todo.position = validatedData.position
      }

      await todoRepository.save(todo)
      res.json(formatTodo(todo))
    } catch (error) {
      next(error)
    }
  })

  /**
   * @route DELETE /api/todos/:id
   * @description Delete a todo item by ID.
   * @param {number} id - Todo ID
   * @returns {void} 204 No Content on success
   * @throws {400} Invalid todo ID
   * @throws {404} Todo not found
   */
  router.delete('/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid todo ID' })
      }

      const result = await todoRepository.delete(id)

      if (result.affected === 0) {
        return res.status(404).json({ error: 'Todo not found' })
      }

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  })

  return router
}
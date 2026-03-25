import { Router } from 'express'
import type { DataSource, SelectQueryBuilder } from 'typeorm'
import { Todo, type TodoStatus } from '../entities/Todo.entity'
import {
  UpdateTodoSchema,
  TodoDateRangeQuerySchema,
  UpdateTodoPositionSchema,
  BatchUpdateTodoPositionSchema,
  ArchivedTodosQuerySchema,
  ArchiveCursorPayloadSchema,
  BoardColumnIds
} from '@nanomail/shared'
import { Not } from 'typeorm'
import { createLogger } from '../config/logger'
import { z } from 'zod'

const log = createLogger('TodoRoutes')

/**
 * Valid todo statuses
 */
const VALID_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed']

/**
 * Todos query parameters
 */
export interface TodosQuery {
  status?: TodoStatus
  excludeStatus?: TodoStatus
  boardColumnId?: number
  emailId?: number
}

/**
 * API response for todos list endpoint
 */
export interface TodosResponse {
  todos: Array<{
    id: number
    emailId: number | null
    description: string
    status: string
    deadline: string | null
    boardColumnId: number
    position: number
    notes: string | null
    color: string | null
    source: string
    completedAt: string | null
    createdAt: string
  }>
}

/**
 * Formats a Todo entity for API response.
 * Converts Date fields to ISO strings and handles nullable deadline.
 * Color is derived from the related BoardColumn entity.
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
    notes: todo.notes,
    color: todo.boardColumn?.color ?? null,
    source: todo.source,
    completedAt: todo.completedAt?.toISOString() ?? null,
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
 * Supports excludeStatus to filter out specific statuses using Not() operator.
 */
function buildWhereClause(query: {
    status?: unknown
    excludeStatus?: unknown
    boardColumnId?: unknown
    emailId?: unknown
}): { where: Record<string, unknown>, excludeStatus?: TodoStatus } {
    const where: Record<string, unknown> = {}
    let excludeStatus: TodoStatus | undefined

    if (query.status && VALID_STATUSES.includes(query.status as TodoStatus)) {
        where.status = query.status
    }
    if (query.excludeStatus && VALID_STATUSES.includes(query.excludeStatus as TodoStatus)) {
        excludeStatus = query.excludeStatus as TodoStatus
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

    return { where, excludeStatus }
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
     * @queryparam {string} excludeStatus - Exclude todos with this status (conflicts with status param)
     * @queryparam {number} boardColumnId - Filter by board column ID
     * @queryparam {number} emailId - Filter by email ID
     * @queryparam {string} startDate - Start date for deadline range (YYYY-MM-DD)
     * @queryparam {string} endDate - End date for deadline range (YYYY-MM-DD)
     * @returns {TodosResponse} List of todos sorted by position within column, then deadline (nulls last), then createdAt
     */
    router.get('/', async (req, res, next) => {
        try {
            const { startDate, endDate, status, excludeStatus, boardColumnId, emailId } = req.query

            // Check for conflicting status and excludeStatus parameters
            if (status && excludeStatus && status === excludeStatus) {
                return res.status(400).json({
                    error: `Parameter conflict: cannot use status=${status} and excludeStatus=${excludeStatus} together`
                })
            }

            // Date range query using query builder
            if (startDate && endDate) {
                const dateRangeResult = TodoDateRangeQuerySchema.safeParse({ startDate, endDate })

                if (!dateRangeResult.success) {
                    // Fall back to regular query if date format is invalid
                    const { where, excludeStatus: excludeStatusFilter } = buildWhereClause({ status, excludeStatus, boardColumnId, emailId })
                    let queryBuilder = todoRepository
                        .createQueryBuilder('todo')
                        .leftJoinAndSelect('todo.boardColumn', 'boardColumn')

                    // Apply where clause filters
                    Object.entries(where).forEach(([key, value]) => {
                        queryBuilder = queryBuilder.andWhere(`todo.${key} = :${key}`, { [key]: value })
                    })

                    // Apply excludeStatus filter
                    if (excludeStatusFilter && VALID_STATUSES.includes(excludeStatusFilter as TodoStatus)) {
                        queryBuilder = queryBuilder.andWhere('todo.status != :excludeStatus', { excludeStatus: excludeStatusFilter })
                    }

                    const todos = await queryBuilder
                        .orderBy('todo.position', 'ASC')
                        .addOrderBy('todo.deadline', 'ASC', 'NULLS LAST')
                        .addOrderBy('todo.createdAt', 'ASC')
                        .getMany()

                    return res.json({ todos: todos.map(formatTodo) })
                }

                // Valid date range - use query builder
                const start = new Date(`${startDate}T00:00:00Z`)
                const end = new Date(`${endDate}T23:59:59Z`)

                let queryBuilder = todoRepository
                    .createQueryBuilder('todo')
                    .leftJoinAndSelect('todo.boardColumn', 'boardColumn')
                    .where('todo.deadline BETWEEN :start AND :end', { start, end })
                    .orWhere('todo.deadline IS NULL')
                    .orderBy('todo.position', 'ASC')
                    .addOrderBy('todo.deadline', 'ASC', 'NULLS LAST')
                    .addOrderBy('todo.createdAt', 'ASC')

                queryBuilder = applyFiltersToQueryBuilder(queryBuilder, { status, boardColumnId, emailId })

                // Apply excludeStatus filter for date range query
                if (excludeStatus && VALID_STATUSES.includes(excludeStatus as TodoStatus)) {
                    queryBuilder = queryBuilder.andWhere('todo.status != :excludeStatus', { excludeStatus })
                }

                const todos = await queryBuilder.getMany()

                return res.json({ todos: todos.map(formatTodo) })
            }

            // Regular query without date range
            const { where, excludeStatus: excludeStatusFilter } = buildWhereClause(req.query)

            // Use query builder to support excludeStatus with Not()
            let queryBuilder = todoRepository
                .createQueryBuilder('todo')
                .leftJoinAndSelect('todo.boardColumn', 'boardColumn')

            // Apply where clause filters
            Object.entries(where).forEach(([key, value]) => {
                queryBuilder = queryBuilder.andWhere(`todo.${key} = :${key}`, { [key]: value })
            })

            // Apply excludeStatus filter
            if (excludeStatusFilter && VALID_STATUSES.includes(excludeStatusFilter as TodoStatus)) {
                queryBuilder = queryBuilder.andWhere('todo.status != :excludeStatus', { excludeStatus: excludeStatusFilter })
            }

            const todos = await queryBuilder
                .orderBy('todo.position', 'ASC')
                .addOrderBy('todo.deadline', 'ASC', 'NULLS LAST')
                .addOrderBy('todo.createdAt', 'ASC')
                .getMany()

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

            const todo = await todoRepository.findOne({
                where: { id },
                relations: ['boardColumn'],
            })

            if (!todo) {
                res.status(404).json({ error: 'Todo not found' })
                return
            }

            const previousStatus = todo.status
            const newStatus = status

            // Check if trying to change completed status to pending
            if (previousStatus === 'completed' && newStatus !== 'completed') {
                return res.status(400).json({
                    error: 'Please use the /restore endpoint to unarchive a completed todo'
                })
            }

            // CompletedAt management
            if (previousStatus !== 'completed' && newStatus === 'completed') {
                todo.completedAt = new Date()
            }
            // If staying completed, don't change completedAt
            // If changing from completed to something else, it should go through /restore endpoint

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
                    details: validationResult.error.errors
                })
            }

            const { boardColumnId, position, deadline } = validationResult.data

            // Use update() to bypass TypeORM relation tracking issue
            // When boardColumn relation is loaded, save() uses the relation object
            // instead of the boardColumnId value, causing updates to be ignored
            const updateData: Record<string, unknown> = { boardColumnId }
            if (position !== undefined) {
                updateData.position = position
            }
            if (deadline !== undefined) {
                updateData.deadline = deadline ? new Date(deadline) : null
            }

            await todoRepository.update(id, updateData)

            // Fetch the updated todo with relations for response
            const updatedTodo = await todoRepository.findOne({
                where: { id },
                relations: ['boardColumn']
            })
            if (!updatedTodo) {
                return res.status(404).json({ error: 'Todo not found' })
            }

            res.json(formatTodo(updatedTodo))
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
                    details: validationResult.error.errors
                })
            }

            const { updates } = validationResult.data

            await dataSource.transaction(async (transactionManager) => {
                const transactionRepo = transactionManager.getRepository(Todo)
                for (const update of updates) {
                    await transactionRepo.update(update.id, {
                        boardColumnId: update.boardColumnId,
                        position: update.position
                    })
                }
            })

            res.json({ success: true, updated: updates.length })
        } catch (error) {
            next(error)
        }
    })

    // =====================================================
    // Phase 3: Archive Box Feature Implementation
    // =====================================================

    /**
     * @route GET /api/todos/archive
     * @description Get archived (completed) todos with cursor-based pagination.
     * @queryparam {number} limit - Number of items per page (default: 20, max: 100)
     * @queryparam {string} cursor - Base64-encoded cursor for pagination
     * @returns {ArchivedTodosResponse} Paginated list of completed todos
     */
    router.get('/archive', async (req, res, next) => {
        try {
            const { limit, cursor } = req.query

            // Validate limit parameter - reject explicit 0 or negative values
            const limitStr = String(limit ?? '')
            if (limit && (limitStr === '0' || limitStr.startsWith('-'))) {
                return res.status(400).json({ error: 'Limit must be between 1 and 100' })
            }
            const parsedLimit = parseInt(limitStr, 10) || 20
            if (parsedLimit < 1 || parsedLimit > 100) {
                return res.status(400).json({ error: 'Limit must be between 1 and 100' })
            }
            const validatedLimit = parsedLimit

            // Build query for completed todos
            let queryBuilder = todoRepository
                .createQueryBuilder('todo')
                .leftJoinAndSelect('todo.boardColumn', 'boardColumn')
                .where('todo.status = :status', { status: 'completed' })

            // Handle cursor pagination
            if (cursor && typeof cursor === 'string') {
                try {
                    // Decode cursor from Base64
                    const cursorJson = Buffer.from(cursor, 'base64').toString('utf-8')
                    const cursorPayload = JSON.parse(cursorJson)

                    // Validate cursor payload using Zod
                    const cursorValidation = ArchiveCursorPayloadSchema.safeParse(cursorPayload)
                    if (!cursorValidation.success) {
                        return res.status(400).json({ error: 'Invalid cursor format' })
                    }
                    const parsedCursor = cursorValidation.data

                    // Apply cursor conditions:
                    // completedAt < cursor.completedAt OR (completedAt = cursor.completedAt AND id < cursor.id)
                    queryBuilder.andWhere(
                        '(todo.completedAt < :completedAt OR (todo.completedAt = :completedAt AND todo.id < :id))',
                        {
                            completedAt: new Date(parsedCursor.completedAt),
                            id: parsedCursor.id
                        }
                    )
                } catch (error) {
                    log.debug({ err: error, cursor }, 'Failed to parse archive cursor')
                    return res.status(400).json({ error: 'Invalid cursor format' })
                }
            }

            // Apply ordering and limit
            queryBuilder
                .orderBy('todo.completedAt', 'DESC')
                .addOrderBy('todo.id', 'DESC')
                .limit(validatedLimit + 1) // Fetch one extra to check for more

            const todos = await queryBuilder.getMany()

            // Determine if there are more results
            const hasMore = todos.length > validatedLimit
            if (hasMore) {
                todos.pop() // Remove the extra item
            }

            // Build next cursor
            let nextCursor: string | null = null
            if (hasMore && todos.length > 0) {
                const lastTodo = todos[todos.length - 1]
                const cursorPayload = {
                    completedAt: lastTodo.completedAt!.toISOString(),
                    id: lastTodo.id
                }
                nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString('base64')
            }

            res.json({
                todos: todos.map(formatTodo),
                nextCursor,
                hasMore
            })
        } catch (error) {
            next(error)
        }
    })

    /**
     * @route POST /api/todos/:id/restore
     * @description Restore a completed todo to pending status and move it to Inbox.
     * @param {number} id - Todo ID
     * @returns {Object} Restored todo object
     * @throws {400} Invalid todo ID or todo is not completed
     * @throws {404} Todo not found
     */
    router.post('/:id/restore', async (req, res, next) => {
        try {
            const id = parseInt(req.params.id, 10)
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid todo ID' })
            }

            // Find the todo
            const todo = await todoRepository.findOne({
                where: { id }
            })

            if (!todo) {
                return res.status(404).json({ error: 'Todo not found' })
            }

            // Check if todo is completed
            if (todo.status !== 'completed') {
                return res.status(400).json({
                    error: 'Restore can only be used on completed todos. This todo has status: ' + todo.status
                })
            }

            // Get current minimum position in Inbox
            const minPositionResult = await todoRepository
                .createQueryBuilder('todo')
                .select('MIN(todo.position)', 'min')
                .where('todo.boardColumnId = :boardColumnId', { boardColumnId: BoardColumnIds.INBOX })
                .getRawOne()
            const minPosition = minPositionResult?.min

            // Check for position overflow - if minPosition is too close to INT_MIN
            const POSITION_OVERFLOW_THRESHOLD = -2147483648 + 1024
            if (minPosition != null && minPosition <= POSITION_OVERFLOW_THRESHOLD) {
                log.warn({ minPosition, todoId: id }, 'Inbox position values need rebalancing')
                return res.status(500).json({
                    error: 'Inbox position values need rebalancing. Please contact support.'
                })
            }

            const newPosition = minPosition != null ? minPosition - 1024 : 0

            // Update the todo
            await todoRepository.update(id, {
                status: 'pending',
                completedAt: null,
                boardColumnId: BoardColumnIds.INBOX,
                position: newPosition
            })

            // Fetch updated todo with relations
            const updatedTodo = await todoRepository.findOne({
                where: { id },
                relations: ['boardColumn']
            })

            if (!updatedTodo) {
                return res.status(404).json({ error: 'Todo not found' })
            }

            res.json(formatTodo(updatedTodo))
        } catch (error) {
            next(error)
        }
    })

    /**
     * @route PATCH /api/todos/:id
     * @description Update todo fields (description, deadline, status, boardColumnId, position, notes).
     *             Uses Zod schema validation. Rejects unknown fields.
     * @param {number} id - Todo ID
     * @bodyparam {string} [description] - New description (1-2000 chars)
     * @bodyparam {string|null} [deadline] - New deadline (ISO datetime or null to clear)
     * @bodyparam {string} [status] - New status (pending, in_progress, completed)
     * @bodyparam {number} [boardColumnId] - New column ID
     * @bodyparam {number} [position] - New position within column
     * @bodyparam {string|null} [notes] - Optional notes (max 2000 chars, null to clear)
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
                    details: validationResult.error.errors
                })
            }

            const validatedData = validationResult.data

            // Check if todo exists
            const existingTodo = await todoRepository.findOne({ where: { id } })
            if (!existingTodo) {
                return res.status(404).json({ error: 'Todo not found' })
            }

            // Check if trying to change completed status to pending
            if (existingTodo.status === 'completed' && validatedData.status === 'pending') {
                return res.status(400).json({
                    error: 'Please use the /restore endpoint to unarchive a completed todo'
                })
            }

            // Build update data object
            const updateData: Record<string, unknown> = {}
            if (validatedData.description !== undefined) {
                updateData.description = validatedData.description
            }
            if (validatedData.deadline !== undefined) {
                updateData.deadline = validatedData.deadline ? new Date(validatedData.deadline) : null
            }
            if (validatedData.status !== undefined) {
                updateData.status = validatedData.status
                // CompletedAt management
                if (validatedData.status === 'completed' && existingTodo.status !== 'completed') {
                    updateData.completedAt = new Date()
                }
            }
            if (validatedData.boardColumnId !== undefined) {
                updateData.boardColumnId = validatedData.boardColumnId
            }
            if (validatedData.position !== undefined) {
                updateData.position = validatedData.position
            }
            if (validatedData.notes !== undefined) {
                updateData.notes = validatedData.notes
            }

            // Use update() to bypass TypeORM relation tracking issue
            // When boardColumn relation is loaded, save() uses the relation object
            // instead of the boardColumnId value, causing updates to be ignored
            if (Object.keys(updateData).length > 0) {
                await todoRepository.update(id, updateData)
            }

            // Fetch the updated todo with relations for response
            const updatedTodo = await todoRepository.findOne({
                where: { id },
                relations: ['boardColumn']
            })
            if (!updatedTodo) {
                return res.status(404).json({ error: 'Todo not found' })
            }

            res.json(formatTodo(updatedTodo))
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
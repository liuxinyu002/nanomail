import { Router } from 'express'
import type { DataSource } from 'typeorm'
import { Todo, type TodoStatus, type TodoUrgency } from '../entities/Todo.entity'

/**
 * Todos query parameters
 */
export interface TodosQuery {
  status?: TodoStatus
  urgency?: TodoUrgency
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
    urgency: TodoUrgency
    status: TodoStatus
    createdAt: string
  }>
}

/**
 * Valid todo statuses
 */
const VALID_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed']

/**
 * Valid todo urgencies
 */
const VALID_URGENCIES: TodoUrgency[] = ['high', 'medium', 'low']

/**
 * Creates Express routes for todo operations.
 */
export function createTodoRoutes(dataSource: DataSource): Router {
  const router = Router()
  const todoRepository = dataSource.getRepository(Todo)

  // GET /api/todos - List todos with filtering
  router.get('/', async (req, res, next) => {
    try {
      // Build where clause
      const where: Record<string, unknown> = {}

      if (req.query.status && VALID_STATUSES.includes(req.query.status as TodoStatus)) {
        where.status = req.query.status
      }

      if (req.query.urgency && VALID_URGENCIES.includes(req.query.urgency as TodoUrgency)) {
        where.urgency = req.query.urgency
      }

      if (req.query.emailId) {
        where.emailId = parseInt(req.query.emailId as string, 10)
      }

      // Get todos
      const todos = await todoRepository.find({
        where,
        order: { createdAt: 'DESC' },
      })

      // Format response
      const response: TodosResponse = {
        todos: todos.map((todo) => ({
          id: todo.id,
          emailId: todo.emailId,
          description: todo.description,
          urgency: todo.urgency,
          status: todo.status,
          createdAt: todo.createdAt.toISOString(),
        })),
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  })

  // PATCH /api/todos/:id/status - Update todo status
  router.patch('/:id/status', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      const { status } = req.body

      // Validate status
      if (!status || !VALID_STATUSES.includes(status)) {
        res.status(400).json({
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        })
        return
      }

      // Find todo
      const todo = await todoRepository.findOne({ where: { id } })

      if (!todo) {
        res.status(404).json({ error: 'Todo not found' })
        return
      }

      // Update status
      todo.status = status
      await todoRepository.save(todo)

      res.json({
        id: todo.id,
        emailId: todo.emailId,
        description: todo.description,
        urgency: todo.urgency,
        status: todo.status,
        createdAt: todo.createdAt.toISOString(),
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
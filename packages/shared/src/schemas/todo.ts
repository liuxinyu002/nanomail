import { z } from 'zod'

/**
 * Schema for Todo status
 */
export const TodoStatusSchema = z.enum(['pending', 'in_progress', 'completed'])

/**
 * Schema for Todo entity
 * Note: urgency field is deprecated - status now determined by boardColumnId
 */
export const TodoSchema = z.object({
  id: z.number().int().positive(),
  emailId: z.number().int().positive(),
  description: z.string().min(1).max(2000),
  status: TodoStatusSchema,
  deadline: z.string().datetime().nullable(),
  boardColumnId: z.number().int().positive().default(1), // Required, defaults to Inbox (id: 1)
  position: z.number().int().optional(), // Position within column for ordering
  createdAt: z.coerce.date()
})

/**
 * Schema for creating a new Todo
 */
export const CreateTodoSchema = TodoSchema.omit({
  id: true,
  createdAt: true
})

/**
 * Schema for updating a Todo
 * Note: emailId is not updatable - a todo cannot be moved to a different email
 * Uses .strict() to reject any unknown fields like id, emailId, createdAt
 */
export const UpdateTodoSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: TodoStatusSchema.optional(),
  boardColumnId: z.number().int().positive().optional(),
  position: z.number().int().optional()
}).strict()

/**
 * Schema for date range query in Todo calendar view
 * Used to fetch todos within a specific date range
 */
export const TodoDateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

export type TodoStatus = z.infer<typeof TodoStatusSchema>
export type Todo = z.infer<typeof TodoSchema>
export type CreateTodo = z.infer<typeof CreateTodoSchema>
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>
export type TodoDateRangeQuery = z.infer<typeof TodoDateRangeQuerySchema>
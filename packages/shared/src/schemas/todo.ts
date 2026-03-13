import { z } from 'zod'

/**
 * Schema for urgency levels in Todo items
 */
export const UrgencySchema = z.enum(['high', 'medium', 'low'])

/**
 * Schema for Todo status
 */
export const TodoStatusSchema = z.enum(['pending', 'in_progress', 'completed'])

/**
 * Schema for Todo entity
 */
export const TodoSchema = z.object({
  id: z.number().int().positive(),
  emailId: z.number().int().positive(),
  description: z.string().min(1).max(2000),
  urgency: UrgencySchema,
  status: TodoStatusSchema,
  deadline: z.string().datetime().nullable(),
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
 */
export const UpdateTodoSchema = CreateTodoSchema.partial()

export type Urgency = z.infer<typeof UrgencySchema>
export type TodoStatus = z.infer<typeof TodoStatusSchema>
export type Todo = z.infer<typeof TodoSchema>
export type CreateTodo = z.infer<typeof CreateTodoSchema>
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>
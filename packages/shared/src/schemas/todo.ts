import { z } from 'zod'

/**
 * Schema for Todo status
 */
export const TodoStatusSchema = z.enum(['pending', 'in_progress', 'completed'])

/**
 * Schema for Todo source - tracks where the todo was created from
 * - email: extracted from email content
 * - chat: created by AI assistant
 * - manual: manually created by user
 */
export const TodoSourceSchema = z.enum(['email', 'chat', 'manual'])

/**
 * Schema for Todo entity
 * Note: urgency field is deprecated - status now determined by boardColumnId
 * Note: color field is derived from related BoardColumn, not stored in database
 * Note: emailId is nullable to support standalone todos created by AI assistant
 * Note: completedAt is server-managed, set when status changes to 'completed'
 */
export const TodoSchema = z.object({
  id: z.number().int().positive(),
  emailId: z.number().int().positive().nullable(), // Nullable for standalone todos (AI-created)
  description: z.string().min(1).max(2000),
  status: TodoStatusSchema,
  deadline: z.string().datetime().nullable(),
  boardColumnId: z.number().int().positive().default(1), // Required, defaults to Inbox (id: 1)
  position: z.number().int().optional(), // Position within column for ordering
  notes: z.string().max(2000).nullable().default(null), // Optional notes field, max 2000 chars
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().default(null), // Derived from BoardColumn
  source: TodoSourceSchema.default('manual'), // Track todo origin
  completedAt: z.string().datetime().nullable().default(null), // Server-managed: set when status becomes 'completed'
  createdAt: z.coerce.date()
})

/**
 * Schema for creating a new Todo
 * Uses .strict() to reject unknown fields like id, color (derived), createdAt
 * Note: completedAt is server-managed and should not be provided by client
 */
export const CreateTodoSchema = TodoSchema.omit({
  id: true,
  color: true, // Color is derived from BoardColumn, not stored
  completedAt: true, // Server-managed: set when status becomes 'completed'
  createdAt: true
}).strict()

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
  position: z.number().int().optional(),
  notes: z.string().max(2000).nullable().optional()
}).strict()

/**
 * Schema for date range query in Todo calendar view
 * Used to fetch todos within a specific date range
 */
export const TodoDateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

/**
 * Schema for querying todos with filters
 * Used by the main todo list view to filter todos
 */
export const TodosQuerySchema = z.object({
  status: TodoStatusSchema.optional(),
  excludeStatus: TodoStatusSchema.optional(),
  boardColumnId: z.number().int().positive().optional(),
  emailId: z.number().int().positive().optional()
}).strict()

/**
 * Schema for querying archived (completed) todos
 * Supports cursor-based pagination
 */
export const ArchivedTodosQuerySchema = z.object({
  limit: z.number().int().min(1).max(100),
  cursor: z.string().base64().optional()
})

/**
 * Schema for archive cursor (opaque Base64 string)
 * This is the format exposed to clients
 */
export const ArchiveCursorSchema = z.string().base64()

/**
 * Schema for archive cursor payload (internal structure)
 * Used by backend to encode/decode cursor values
 */
export const ArchiveCursorPayloadSchema = z.object({
  completedAt: z.string().datetime(),
  id: z.number().int().positive()
}).strict()

/**
 * Schema for archived todos response
 * Returns paginated completed todos with cursor for next page
 */
export const ArchivedTodosResponseSchema = z.object({
  todos: z.array(TodoSchema),
  nextCursor: z.string().base64().nullable(),
  hasMore: z.boolean()
})

export type TodoStatus = z.infer<typeof TodoStatusSchema>
export type TodoSource = z.infer<typeof TodoSourceSchema>
export type Todo = z.infer<typeof TodoSchema>
export type CreateTodo = z.infer<typeof CreateTodoSchema>
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>
export type TodoDateRangeQuery = z.infer<typeof TodoDateRangeQuerySchema>
export type TodosQuery = z.infer<typeof TodosQuerySchema>
export type ArchivedTodosQuery = z.infer<typeof ArchivedTodosQuerySchema>
export type ArchiveCursor = z.infer<typeof ArchiveCursorSchema>
export type ArchiveCursorPayload = z.infer<typeof ArchiveCursorPayloadSchema>
export type ArchivedTodosResponse = z.infer<typeof ArchivedTodosResponseSchema>

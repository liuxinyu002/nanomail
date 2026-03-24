/**
 * Todo Tools for AI Assistant
 * Implements create, update, delete operations for todos
 */

import { z } from 'zod'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { MoreThan, In } from 'typeorm'
import { Tool, type ToolDeps, type ToolResult } from './types'
import { Todo } from '../../../entities/Todo.entity'
import { BoardColumn } from '../../../entities/BoardColumn.entity'

// Initialize dayjs plugins
dayjs.extend(customParseFormat)
dayjs.extend(utc)
dayjs.extend(timezone)

// ============================================
// Helper Functions
// ============================================

/**
 * Parse datetime string with robust validation
 * Supports ISO 8601 formats with timezone
 *
 * IMPORTANT: Pre-check for valid format to prevent dayjs from misinterpreting
 * natural language inputs like "tomorrow" as valid dates.
 */
export function parseDateTime(input: string): { isValid: boolean; toDate(): Date | null } {
  // Pre-check: input must contain at least one digit to be a valid date
  // This prevents dayjs from accepting "tomorrow", "next week", etc.
  if (!input || !/\d/.test(input)) {
    return { isValid: false, toDate: () => null }
  }

  const parsed = dayjs(input)

  if (!parsed.isValid()) {
    return { isValid: false, toDate: () => null }
  }

  return {
    isValid: true,
    toDate: () => parsed.toDate()
  }
}

/**
 * Format todo for JSON response
 * Includes all fields required by TodoSchema for frontend validation
 */
export function formatTodoForResponse(todo: Todo, color: string | null): {
  id: number
  emailId: number | null
  description: string
  deadline: string | null
  status: string
  boardColumnId: number
  notes: string | null
  color: string | null
  source: 'email' | 'chat' | 'manual'
  createdAt: string
} {
  return {
    id: todo.id,
    emailId: todo.emailId,
    description: todo.description,
    deadline: todo.deadline?.toISOString() ?? null,
    status: todo.status,
    boardColumnId: todo.boardColumnId,
    notes: todo.notes ?? null,
    color: color,
    source: todo.source,
    createdAt: todo.createdAt.toISOString()
  }
}

// ============================================
// Zod Schemas
// ============================================

/**
 * Schema for createTodo tool
 * IMPORTANT: This tool requires the 'description' parameter. Always provide it when calling this tool.
 */
export const CreateTodoSchema = z.object({
  description: z.string().min(1, 'Description cannot be empty').refine(
    (val) => val.trim().length > 0,
    { message: 'Description cannot be empty' }
  ).describe('[REQUIRED] The task content - what the user wants to remember or track. Example: "项目验收会" or "Call mom"'),
  deadline: z.string().optional().nullable().describe('[OPTIONAL] Deadline in ISO 8601 format with timezone. Example: "2026-03-25T15:00:00+08:00"'),
  notes: z.string().optional().nullable().describe('[OPTIONAL] Additional details or context about the task'),
  forceCreate: z.boolean().optional().describe('[OPTIONAL] Set to true ONLY if user explicitly confirmed creating duplicate')
}).strict()

/**
 * Schema for updateTodo tool
 * IMPORTANT: Either 'id' must be provided, or provide enough info to identify the todo.
 */
export const UpdateTodoSchema = z.object({
  id: z.number().int().positive().describe('[REQUIRED] The numeric ID of the todo to update. You MUST provide this field.'),
  description: z.string().min(1, 'Description cannot be empty').refine(
    (val) => val.trim().length > 0,
    { message: 'Description cannot be empty' }
  ).optional().describe('[OPTIONAL] New task content'),
  deadline: z.string().nullable().optional().describe('[OPTIONAL] New deadline as ISO 8601 datetime, or null to remove deadline'),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().describe('[OPTIONAL] New status: "pending", "in_progress", or "completed"'),
  notes: z.string().nullable().optional().describe('[OPTIONAL] Additional notes')
}).strict()

/**
 * Schema for deleteTodo tool
 * IMPORTANT: The 'id' parameter is REQUIRED.
 */
export const DeleteTodoSchema = z.object({
  id: z.number().int().positive().describe('[REQUIRED] The numeric ID of the todo to delete. You MUST provide this field.')
}).strict()

// ============================================
// CreateTodoTool
// ============================================

export class CreateTodoTool extends Tool<typeof CreateTodoSchema> {
  name = 'createTodo' as const
  description = '[REQUIRED PARAMETERS: description] Create a new todo item. Always provide the "description" parameter with the task content. Example: {description: "项目验收会", deadline: "2026-03-25T15:00:00+08:00"}'
  schema = CreateTodoSchema

  async execute(
    params: z.infer<typeof CreateTodoSchema>,
    deps?: ToolDeps
  ): Promise<string> {
    if (!deps) {
      return 'Error: Tool dependencies not provided'
    }

    const { description, deadline, notes, forceCreate } = params
    const { dataSource, defaultColumnId } = deps
    const todoRepo = dataSource.getRepository(Todo)

    try {
      // Validation: Check for empty description (after trim)
      const trimmedDescription = description.trim()
      if (trimmedDescription.length === 0) {
        return JSON.stringify({
          success: false,
          reason: 'EMPTY_DESCRIPTION',
          message: 'Task description cannot be empty'
        })
      }

      // Validation: Check description length
      if (description.length > 2000) {
        return JSON.stringify({
          success: false,
          reason: 'DESCRIPTION_TOO_LONG',
          message: `Task description exceeds 2000 characters (current: ${description.length})`
        })
      }

      // Validate and normalize notes
      let normalizedNotes: string | null = null
      if (notes !== undefined && notes !== null) {
        const trimmedNotes = notes.trim()
        if (trimmedNotes.length === 0) {
          normalizedNotes = null
        } else if (trimmedNotes.length > 2000) {
          return JSON.stringify({
            success: false,
            reason: 'NOTES_TOO_LONG',
            message: 'Notes exceed 2000 characters'
          })
        } else {
          normalizedNotes = trimmedNotes
        }
      }

      // Validate and normalize deadline
      let normalizedDeadline: Date | null = null
      if (deadline) {
        const parsed = parseDateTime(deadline)
        if (!parsed.isValid) {
          return JSON.stringify({
            success: false,
            reason: 'INVALID_DEADLINE_FORMAT',
            message: `Deadline format is invalid. Expected ISO 8601 format (e.g., 2024-01-15T15:00:00+08:00). Received: ${deadline}`
          })
        }
        normalizedDeadline = parsed.toDate()
      }

      // Check for duplicates (unless forceCreate is true)
      if (!forceCreate) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

        // Check condition 1: Created within 5 minutes with same description
        // OR condition 2: Same description with pending/in_progress status
        const existingDuplicate = await todoRepo.findOne({
          where: [
            // Condition 1: Created within 5 minutes (network retry protection)
            { description, createdAt: MoreThan(fiveMinutesAgo) },
            // Condition 2: Same description and still incomplete (business logic duplicate)
            { description, status: In(['pending', 'in_progress']) }
          ]
        })

        if (existingDuplicate) {
          // Determine which condition matched for better user feedback
          const isRecent = existingDuplicate.createdAt > fiveMinutesAgo
          const isIncomplete = ['pending', 'in_progress'].includes(existingDuplicate.status)

          let warningContext = ''
          if (isRecent && isIncomplete) {
            warningContext = '（5分钟内创建且未完成）'
          } else if (isRecent) {
            warningContext = '（5分钟内已创建）'
          } else {
            warningContext = '（存在同名未完成待办）'
          }

          return JSON.stringify({
            success: false,
            reason: 'DUPLICATE_DETECTED',
            message: `检测到重复待办${warningContext}（ID: ${existingDuplicate.id}）。请询问用户是否确认要再次创建。如果用户确认，请在下次调用时将 forceCreate 参数设置为 true。`,
            existingTodo: formatTodoForResponse(existingDuplicate, null)
          })
        }
      }

      // Create todo
      const todo = todoRepo.create({
        description,
        deadline: normalizedDeadline,
        boardColumnId: defaultColumnId,
        status: 'pending',
        emailId: null,
        notes: normalizedNotes,
        source: 'chat'
      })
      await todoRepo.save(todo)

      // Fetch BoardColumn color for complete TodoSchema response
      const boardColumnRepo = dataSource.getRepository(BoardColumn)
      const boardColumn = await boardColumnRepo.findOne({ where: { id: todo.boardColumnId } })
      const color = boardColumn?.color ?? null

      return JSON.stringify({
        success: true,
        message: `Todo created successfully with ID ${todo.id}`,
        todo: formatTodoForResponse(todo, color)
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        reason: 'DATABASE_ERROR',
        message: 'Failed to create todo due to a system error. Please try again later.'
      })
    }
  }
}

// ============================================
// UpdateTodoTool
// ============================================

export class UpdateTodoTool extends Tool<typeof UpdateTodoSchema> {
  name = 'updateTodo' as const
  description = '[REQUIRED PARAMETERS: id] Update an existing todo. Always provide "id" to identify which todo to update. Example: {id: 1, description: "new description", status: "completed"}'
  schema = UpdateTodoSchema

  async execute(
    params: z.infer<typeof UpdateTodoSchema>,
    deps?: ToolDeps
  ): Promise<string> {
    if (!deps) {
      return 'Error: Tool dependencies not provided'
    }

    const { id, description, deadline, status, notes } = params
    const { dataSource } = deps
    const todoRepo = dataSource.getRepository(Todo)

    try {
      // Check existence
      const todo = await todoRepo.findOne({ where: { id } })
      if (!todo) {
        return JSON.stringify({
          success: false,
          reason: 'TODO_NOT_FOUND',
          message: `Todo with ID ${id} does not exist`
        })
      }

      // Validate description if provided
      if (description !== undefined) {
        const trimmedDescription = description.trim()
        if (trimmedDescription.length === 0) {
          return JSON.stringify({
            success: false,
            reason: 'EMPTY_DESCRIPTION',
            message: 'Task description cannot be empty'
          })
        }
        if (description.length > 2000) {
          return JSON.stringify({
            success: false,
            reason: 'DESCRIPTION_TOO_LONG',
            message: 'Task description exceeds 2000 characters'
          })
        }
      }

      // Validate and parse deadline if provided
      let newDeadline = todo.deadline
      if (deadline !== undefined) {
        if (deadline === null) {
          newDeadline = null
        } else {
          const parsed = parseDateTime(deadline)
          if (!parsed.isValid) {
            return JSON.stringify({
              success: false,
              reason: 'INVALID_DEADLINE_FORMAT',
              message: `Deadline format is invalid. Expected ISO 8601 format. Received: ${deadline}`
            })
          }
          newDeadline = parsed.toDate()
        }
      }

      // Validate and normalize notes if provided
      let newNotes = todo.notes
      if (notes !== undefined) {
        if (notes === null) {
          newNotes = null
        } else {
          const trimmedNotes = notes.trim()
          if (trimmedNotes.length === 0) {
            newNotes = null
          } else if (trimmedNotes.length > 2000) {
            return JSON.stringify({
              success: false,
              reason: 'NOTES_TOO_LONG',
              message: 'Notes exceed 2000 characters'
            })
          } else {
            newNotes = trimmedNotes
          }
        }
      }

      // Update fields
      if (description !== undefined) todo.description = description
      todo.deadline = newDeadline
      if (status !== undefined) todo.status = status
      todo.notes = newNotes

      await todoRepo.save(todo)

      // Fetch BoardColumn color for complete TodoSchema response
      const boardColumnRepo = dataSource.getRepository(BoardColumn)
      const boardColumn = await boardColumnRepo.findOne({ where: { id: todo.boardColumnId } })
      const color = boardColumn?.color ?? null

      return JSON.stringify({
        success: true,
        message: `Todo ${id} updated successfully`,
        todo: formatTodoForResponse(todo, color)
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        reason: 'DATABASE_ERROR',
        message: 'Failed to update todo due to a system error. Please try again later.'
      })
    }
  }
}

// ============================================
// DeleteTodoTool
// ============================================

export class DeleteTodoTool extends Tool<typeof DeleteTodoSchema> {
  name = 'deleteTodo' as const
  description = '[REQUIRED PARAMETERS: id] Delete a todo item. Always provide "id" to identify which todo to delete. Example: {id: 1}'
  schema = DeleteTodoSchema

  async execute(
    params: z.infer<typeof DeleteTodoSchema>,
    deps?: ToolDeps
  ): Promise<string> {
    if (!deps) {
      return 'Error: Tool dependencies not provided'
    }

    const { id } = params
    const { dataSource } = deps
    const todoRepo = dataSource.getRepository(Todo)

    try {
      // Check existence
      const todo = await todoRepo.findOne({ where: { id } })
      if (!todo) {
        return JSON.stringify({
          success: false,
          reason: 'TODO_NOT_FOUND',
          message: `Todo with ID ${id} does not exist`
        })
      }

      // Fetch BoardColumn color before deletion
      const boardColumnRepo = dataSource.getRepository(BoardColumn)
      const boardColumn = await boardColumnRepo.findOne({ where: { id: todo.boardColumnId } })
      const color = boardColumn?.color ?? null

      // Store info before deletion
      const deletedInfo = formatTodoForResponse(todo, color)

      await todoRepo.remove(todo)

      return JSON.stringify({
        success: true,
        message: `Todo ${id} deleted successfully`,
        todo: deletedInfo
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        reason: 'DATABASE_ERROR',
        message: 'Failed to delete todo due to a system error. Please try again later.'
      })
    }
  }
}

// ============================================
// Export tool instances
// ============================================

export const createTodoTool = new CreateTodoTool()
export const updateTodoTool = new UpdateTodoTool()
export const deleteTodoTool = new DeleteTodoTool()

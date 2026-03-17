import { z } from 'zod'

export const BoardColumnIds = {
  INBOX: 1,
  TODO: 2,
  IN_PROGRESS: 3,
  DONE: 4,
} as const

export const BoardColumnSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  order: z.number().int().nonnegative(),
  isSystem: z.boolean(),
  createdAt: z.coerce.date()
})

export const CreateBoardColumnSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  order: z.number().int().nonnegative()
})

export const UpdateBoardColumnSchema = CreateBoardColumnSchema.partial().strict()

export const UpdateTodoPositionSchema = z.object({
  boardColumnId: z.number().int().positive(),
  position: z.number().int().nonnegative().optional(),
  deadline: z.string().datetime().nullable().optional()
})

export const BatchUpdateTodoPositionSchema = z.object({
  updates: z.array(z.object({
    id: z.number().int().positive(),
    boardColumnId: z.number().int().positive(),
    position: z.number().int().nonnegative()
  }))
})

export type BoardColumn = z.infer<typeof BoardColumnSchema>
export type CreateBoardColumn = z.infer<typeof CreateBoardColumnSchema>
export type UpdateBoardColumn = z.infer<typeof UpdateBoardColumnSchema>
export type UpdateTodoPosition = z.infer<typeof UpdateTodoPositionSchema>
export type BatchUpdateTodoPosition = z.infer<typeof BatchUpdateTodoPositionSchema>

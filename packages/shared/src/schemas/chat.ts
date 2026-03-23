import { z } from 'zod'

/**
 * Chat message schema (compatible with mainstream AI SDKs like OpenAI)
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().nullable(),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal('function').default('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string() // JSON string as returned by LLM
    })
  })).optional(),
  toolCallId: z.string().optional() // Corresponds to OpenAI's tool_call_id
})

/**
 * Chat context schema - provides context for AI requests
 */
export const ChatContextSchema = z.object({
  currentTime: z.string().datetime(), // ISO format datetime required
  timeZone: z.string(), // User's timezone, e.g., "Asia/Shanghai"
  currentLocation: z.string().optional(),
  sourcePage: z.string().optional() // Page context, e.g., "email-list"
})

/**
 * Chat request schema - full request structure for AI chat
 */
export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  context: ChatContextSchema,
  stream: z.boolean().optional().default(true) // Streaming output toggle, defaults to true
})

/**
 * Session start event data - for WebSocket session initialization
 */
export const SessionStartDataSchema = z.object({
  sessionId: z.string(),
  agentRole: z.string()
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type ChatContext = z.infer<typeof ChatContextSchema>
export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type SessionStartData = z.infer<typeof SessionStartDataSchema>

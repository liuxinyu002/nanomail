# Phase 3: AI Engine & Agent Core

> **Context:** Build the brains of the application. This involves standard API routing for LLMs, a multi-step pipeline for email summarization, and the ReAct loop for drafting replies.

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 3 of 5 |
| **Focus Area** | LLM integration, AI pipeline, ReAct agent |
| **Total Tasks** | 8 subtasks across 3 task groups |
| **Dependencies** | Phase 2 (Mail Ingestion & Sync Routing) |
| **Estimated Effort** | 3-4 days |

---

## T7: Hybrid LLM Adapter & Tool Registry

### Context
Ensure the app can speak to OpenAI, DeepSeek, or local Ollama using standard OpenAI Node SDK formats. This abstraction enables model flexibility without code changes.

### Dependencies
- **Requires**: T6 (Backend API Core) for settings retrieval

### Tasks

#### T7.1: LLM Factory Service
Wrap the `openai` Node SDK into a factory service that reads the base URL and API key from `SettingsService` (supporting overrides for Ollama/DeepSeek).

**Implementation Notes:**
```typescript
import OpenAI from 'openai'

interface LLMConfig {
  provider: 'openai' | 'deepseek' | 'ollama'
  apiKey?: string
  baseUrl?: string
  model: string
}

class LLMService {
  private client: OpenAI

  async initialize(): Promise<void> {
    const provider = await settingsService.get('LLM_PROVIDER') || 'openai'
    const apiKey = await settingsService.get('LLM_API_KEY')
    const baseUrl = await settingsService.get('LLM_BASE_URL')

    const config: LLMConfig = {
      provider,
      apiKey,
      model: await settingsService.get('LLM_MODEL') || 'gpt-4',
      baseUrl: this.getBaseUrl(provider, baseUrl)
    }

    this.client = new OpenAI({
      apiKey: config.apiKey || 'ollama', // Ollama doesn't need real key
      baseURL: config.baseUrl
    })
  }

  private getBaseUrl(provider: string, customUrl?: string): string {
    if (customUrl) return customUrl
    switch (provider) {
      case 'deepseek': return 'https://api.deepseek.com/v1'
      case 'ollama': return 'http://localhost:11434/v1'
      default: return undefined // OpenAI default
    }
  }
}
```

**Configuration Keys Required:**
| Key | Description | Example Values |
|-----|-------------|----------------|
| LLM_PROVIDER | Model provider | openai, deepseek, ollama |
| LLM_API_KEY | API key | sk-xxx |
| LLM_MODEL | Model name | gpt-4, deepseek-chat |
| LLM_BASE_URL | Custom endpoint (optional) | http://localhost:11434/v1 |

**Deliverables:**
- [ ] LLM factory service created
- [ ] Support for OpenAI, DeepSeek, Ollama
- [ ] Configuration from SettingsService
- [ ] Connection test method

---

#### T7.2: Token Truncator Utility
Implement a Token Truncator utility to slice long email bodies before sending them to the LLM.

**Implementation Notes:**
```typescript
class TokenTruncator {
  // Approximate token count (4 chars ≈ 1 token for English)
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  // Truncate to fit within context window
  truncate(text: string, maxTokens: number): string {
    const estimated = this.estimateTokens(text)
    if (estimated <= maxTokens) return text

    // Keep beginning and end, remove middle
    const keepTokens = maxTokens - 50 // Reserve for truncation notice
    const charsToKeep = keepTokens * 4
    const startChars = Math.floor(charsToKeep * 0.7)
    const endChars = Math.floor(charsToKeep * 0.3)

    return text.slice(0, startChars) +
           '\n\n[...content truncated...]\n\n' +
           text.slice(-endChars)
  }
}
```

**Considerations:**
- Different models have different context limits
- Preserve email headers and signatures
- Add truncation indicator for user awareness

**Deliverables:**
- [ ] Token estimation method
- [ ] Smart truncation preserving context
- [ ] Configurable max token limit

---

#### T7.3: Tool Registry Implementation
Create a Tool Registry to define and handle OpenAI standard Tool Calling schemas.

**Implementation Notes:**
```typescript
interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown> // JSON Schema
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  getSchema(): OpenAI.ChatCompletionTool[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Unknown tool: ${name}`)
    return tool.execute(args)
  }
}
```

**Deliverables:**
- [ ] ToolRegistry class implemented
- [ ] Standard OpenAI tool schema generation
- [ ] Tool execution with error handling
- [ ] Extensible registration system

---

## T8: Three-Step AI Pipeline

### Context
The synchronous pipeline triggered when the user manually selects emails in the inbox. Each step builds on the previous one.

### Dependencies
- **Requires**: T7 (Hybrid LLM Adapter)

### Tasks

#### T8.1: Step 1 - Spam/Newsletter Detection
Implement Step 1: Spam/Newsletter detection prompt. If flagged, update DB and halt pipeline for this email.

**Implementation Notes:**
```typescript
const SPAM_DETECTION_PROMPT = `
Analyze the following email and determine if it is:
1. SPAM - Unsolicited promotional content
2. NEWSLETTER - Subscribed promotional content
3. IMPORTANT - Personal or work-related email that needs attention

Email:
From: {sender}
Subject: {subject}
Body: {body}

Respond with ONLY a JSON object:
{ "classification": "SPAM" | "NEWSLETTER" | "IMPORTANT", "confidence": 0.0-1.0 }
`

async function detectSpam(email: Email): Promise<ClassificationResult> {
  const prompt = SPAM_DETECTION_PROMPT
    .replace('{sender}', email.sender)
    .replace('{subject}', email.subject)
    .replace('{body}', email.body_text)

  const response = await llmService.chat(prompt)
  const result = JSON.parse(response)

  // Update email in database
  if (result.classification !== 'IMPORTANT') {
    await emailRepository.update(email.id, {
      is_spam: result.classification === 'SPAM',
      // Add label
    })
    // HALT pipeline
    return { continue: false, classification: result.classification }
  }

  return { continue: true, classification: 'IMPORTANT' }
}
```

**Deliverables:**
- [ ] Spam detection prompt template
- [ ] Classification logic implemented
- [ ] Database update for flagged emails
- [ ] Pipeline halt mechanism

---

#### T8.2: Step 2 - TL;DR Summary Generation
Implement Step 2: TL;DR Summary generation prompt. Update `Email` record.

**Implementation Notes:**
```typescript
const SUMMARY_PROMPT = `
Summarize the following email in 2-3 concise sentences. Focus on:
- The main topic or request
- Any deadlines or time-sensitive information
- Required actions from the recipient

Email:
From: {sender}
Subject: {subject}
Body: {body}

Provide ONLY the summary, no additional text.
`

async function generateSummary(email: Email): Promise<string> {
  const prompt = SUMMARY_PROMPT
    .replace('{sender}', email.sender)
    .replace('{subject}', email.subject)
    .replace('{body}', truncate(email.body_text, 2000))

  const summary = await llmService.chat(prompt)

  // Update email record
  await emailRepository.update(email.id, {
    summary: summary.trim()
  })

  return summary
}
```

**Deliverables:**
- [ ] Summary generation prompt
- [ ] Summary stored in Email record
- [ ] Summary displayed in frontend (Phase 4)

---

#### T8.3: Step 3 - Action Item Extraction
Implement Step 3: Action Item extraction prompt. Parse structured JSON output to create rows in the `Todo` table (linking back to the `email_id` and setting urgency).

**Implementation Notes:**
```typescript
const ACTION_ITEMS_PROMPT = `
Extract action items from the following email. Each item should have:
- A clear, actionable description
- An urgency level: HIGH (deadline within 24h), MEDIUM (deadline within a week), LOW (no specific deadline)

Email:
From: {sender}
Subject: {subject}
Body: {body}

Respond with ONLY a JSON array:
[
  {
    "description": "Action item description",
    "urgency": "HIGH" | "MEDIUM" | "LOW",
    "deadline": "YYYY-MM-DD" | null
  }
]

If no action items are needed, respond with: []
`

async function extractActionItems(email: Email): Promise<Todo[]> {
  const prompt = ACTION_ITEMS_PROMPT
    .replace('{sender}', email.sender)
    .replace('{subject}', email.subject)
    .replace('{body}', truncate(email.body_text, 3000))

  const response = await llmService.chat(prompt)
  const items = JSON.parse(response)

  // Create Todo records
  const todos: Todo[] = []
  for (const item of items) {
    const todo = await todoRepository.create({
      email_id: email.id,
      description: item.description,
      urgency: item.urgency,
      status: 'pending'
    })
    todos.push(todo)
  }

  return todos
}
```

**Deliverables:**
- [ ] Action item extraction prompt
- [ ] JSON parsing and validation
- [ ] Todo records created with proper linking
- [ ] Urgency classification working

---

## T9: ReAct Agent & SSE Streaming Service

### Context
The "human-in-the-loop" drafting assistant. This requires handling a thinking loop and streaming the results dynamically to the frontend.

### Dependencies
- **Requires**: T7 (Hybrid LLM Adapter), T8 (Three-Step AI Pipeline)

### Tasks

#### T9.1: Search Local Emails Tool
Register a `search_local_emails` tool allowing the LLM to query the `Email` SQLite table for context.

**Implementation Notes:**
```typescript
const searchEmailsTool: Tool = {
  name: 'search_local_emails',
  description: 'Search the local email database for relevant context',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (searches subject and body)'
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default: 5)'
      }
    },
    required: ['query']
  },
  execute: async (args) => {
    const { query, limit = 5 } = args
    const emails = await emailRepository.search(query, limit)
    return emails.map(e => ({
      id: e.id,
      subject: e.subject,
      sender: e.sender,
      snippet: e.snippet,
      date: e.date
    }))
  }
}

toolRegistry.register(searchEmailsTool)
```

**Deliverables:**
- [ ] Tool schema defined
- [ ] Database search implementation
- [ ] Tool registered in registry

---

#### T9.2: ReAct Loop Core
Implement the ReAct loop core (Think -> Tool -> Act) based on `nanobot` principles.

**Implementation Notes:**
```typescript
interface ReActState {
  thought: string
  action?: string
  actionInput?: Record<string, unknown>
  observation?: string
  finalAnswer?: string
}

async function* reactLoop(
  instruction: string,
  email: Email,
  maxIterations: number = 5
): AsyncGenerator<ReActState> {
  const messages: OpenAI.ChatCompletionMessage[] = [
    { role: 'system', content: REACT_SYSTEM_PROMPT },
    { role: 'user', content: instruction }
  ]

  for (let i = 0; i < maxIterations; i++) {
    // Get LLM response
    const response = await llmService.chatWithTools(
      messages,
      toolRegistry.getSchema()
    )

    // Yield thought
    yield { thought: response.content || '' }

    // Check for tool calls
    if (response.tool_calls) {
      for (const toolCall of response.tool_calls) {
        const result = await toolRegistry.execute(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        )

        yield {
          action: toolCall.function.name,
          actionInput: JSON.parse(toolCall.function.arguments),
          observation: JSON.stringify(result)
        }

        // Add tool result to conversation
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [toolCall]
        })
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        })
      }
    }

    // Check for final answer
    if (response.content?.includes('Final Answer:')) {
      const answer = response.content.split('Final Answer:')[1].trim()
      yield { finalAnswer: answer }
      return
    }
  }

  // Max iterations reached
  yield { finalAnswer: 'I could not complete the task within the allowed iterations.' }
}
```

**ReAct System Prompt Template:**
```
You are an email assistant that follows the ReAct (Reason + Act) pattern.

Available tools:
{tools}

Use the following format:

Thought: [your reasoning]
Action: [tool name]
Action Input: [tool input as JSON]
Observation: [tool result]
... (repeat as needed)
Thought: I now have enough information
Final Answer: [your response to the user]
```

**Deliverables:**
- [ ] ReAct loop implementation
- [ ] Tool call handling
- [ ] Conversation history management
- [ ] Max iteration safety limit

---

#### T9.3: SSE Streaming Endpoint
Expose a Server-Sent Events (SSE) endpoint (`/api/agent/draft`) that streams the Agent's thought process (tool usage) and the final draft text chunk-by-chunk.

**API Design:**
```typescript
// POST /api/agent/draft
// Request:
interface DraftRequest {
  emailId: number
  instruction: string // e.g., "Draft a reply acknowledging the meeting"
}

// SSE Event Types:
type SSEEvent =
  | { type: 'thought', content: string }
  | { type: 'action', tool: string, input: Record<string, unknown> }
  | { type: 'observation', content: string }
  | { type: 'chunk', content: string }
  | { type: 'done', draft: string }
  | { type: 'error', message: string }
```

**Implementation Notes:**
```typescript
import { Response } from 'express'

app.post('/api/agent/draft', async (req: Request, res: Response) => {
  const { emailId, instruction } = req.body

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const email = await emailRepository.findById(emailId)

  try {
    for await (const state of reactLoop(instruction, email)) {
      if (state.thought) {
        res.write(`data: ${JSON.stringify({ type: 'thought', content: state.thought })}\n\n`)
      }
      if (state.action) {
        res.write(`data: ${JSON.stringify({ type: 'action', tool: state.action, input: state.actionInput })}\n\n`)
      }
      if (state.observation) {
        res.write(`data: ${JSON.stringify({ type: 'observation', content: state.observation })}\n\n`)
      }
      if (state.finalAnswer) {
        // Stream final answer character by character
        for (const char of state.finalAnswer) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: char })}\n\n`)
        }
        res.write(`data: ${JSON.stringify({ type: 'done', draft: state.finalAnswer })}\n\n`)
      }
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`)
  }

  res.end()
})
```

**Deliverables:**
- [ ] SSE endpoint with proper headers
- [ ] Event streaming for ReAct states
- [ ] Character-by-character streaming for final draft
- [ ] Error handling and graceful shutdown

---

## Phase 3 Completion Checklist

- [ ] LLM factory service supporting OpenAI/DeepSeek/Ollama
- [ ] Token truncator for long emails
- [ ] Tool registry with OpenAI schema support
- [ ] Spam/newsletter detection working
- [ ] TL;DR summary generation working
- [ ] Action item extraction creating Todo records
- [ ] ReAct loop implemented with tools
- [ ] SSE streaming endpoint operational
- [ ] All prompts tested and refined

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/process-emails` | Queue emails for AI processing |
| POST | `/api/agent/draft` | SSE stream for draft generation |

## Next Phase

→ [Phase 4: Frontend Interaction & Workspace](./plan_4.md)
# Phase 3.2: Hybrid LLM Adapter & Tool Registry

> **Context:** This is Stage 2 of Phase 3. Implement LLM provider abstraction and tool registry following nanobot's `providers/base.py` and `agent/tools/` architecture. This enables model flexibility without code changes.

---

## Phase Context

| Aspect | Details |
|--------|---------|
| **Phase Number** | 3.2 of 4 stages |
| **Task Group** | T7 |
| **Parent Phase** | [Phase 3: AI Engine & Agent Core](./plan_3_1.md) |
| **Dependencies** | T6 (Backend API Core) for settings retrieval |
| **Next Stage** | [Phase 3.3: Three-Step AI Pipeline](./plan_3_3.md) |

---

## T7: Hybrid LLM Adapter & Tool Registry

### Context
Implement LLM provider abstraction and tool registry following nanobot's `providers/base.py` and `agent/tools/` architecture. This enables model flexibility without code changes.

### Dependencies
- **Requires**: T6 (Backend API Core) for settings retrieval

### [Nanobot Reference] - Required Reading Before Coding

| File Path | Purpose | Key Patterns |
|-----------|---------|--------------|
| `docs/SDK/nanobot/providers/base.py` | LLM provider abstraction | `LLMProvider` abstract class, `LLMResponse`, `ToolCallRequest` dataclasses |
| `docs/SDK/nanobot/providers/registry.py` | Provider specifications | `ProviderSpec` frozen dataclass, 50+ provider configs |
| `docs/SDK/nanobot/providers/litellm_provider.py` | Multi-provider implementation | Auto-detection, prefix handling, prompt caching |
| `docs/SDK/nanobot/agent/tools/base.py` | Tool abstraction | `Tool` abstract class, `to_schema()`, `validate_params()`, `cast_params()` |
| `docs/SDK/nanobot/agent/tools/registry.py` | Tool registry | Registration, schema generation, execution |

### Tasks

---

#### T7.1: LLM Provider Abstraction

Implement the `LLMProvider` abstract base class and `LiteLLMProvider` following nanobot's provider architecture.

**TypeScript Interface Definitions (translated from nanobot):**

```typescript
// src/services/llm/types.ts
// Reference: nanobot/providers/base.py

/**
 * Tool call request from LLM response
 * Maps to nanobot's ToolCallRequest dataclass
 */
interface ToolCallRequest {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/**
 * Normalized LLM response
 * Maps to nanobot's LLMResponse dataclass
 */
interface LLMResponse {
  content: string | null
  toolCalls: ToolCallRequest[]
  finishReason: 'stop' | 'tool_calls' | 'error' | 'length'
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  // Extended reasoning for DeepSeek-R1, Kimi, etc.
  reasoningContent?: string
  thinkingBlocks?: Array<{
    type: string
    thinking: string
  }>
}

/**
 * Provider specification for registry
 * Maps to nanobot's ProviderSpec frozen dataclass
 */
interface ProviderSpec {
  readonly name: string
  readonly keywords: readonly string[]
  readonly envKey: string
  readonly displayName: string
  readonly litellmPrefix: string
  readonly defaultApiBase: string
  readonly isGateway: boolean  // Routes any model (e.g., OpenRouter)
  readonly isLocal: boolean    // Local deployment (Ollama, vLLM)
  readonly supportsPromptCaching: boolean
}

/**
 * Abstract LLM Provider
 * Reference: nanobot/providers/base.py - LLMProvider
 */
abstract class LLMProvider {
  protected apiKey: string | null
  protected apiBase: string | null

  constructor(config: { apiKey?: string; apiBase?: string }) {
    this.apiKey = config.apiKey ?? null
    this.apiBase = config.apiBase ?? null
  }

  /**
   * Core chat method with tool support
   * Reference: nanobot/providers/base.py - chat() abstract method
   */
  abstract chat(params: {
    messages: Array<{ role: string; content: string | null; toolCalls?: ToolCallRequest[] }>
    tools?: Array<Record<string, unknown>>
    model?: string
    maxTokens?: number
    temperature?: number
    reasoningEffort?: 'low' | 'medium' | 'high'
  }): Promise<LLMResponse>

  abstract getDefaultModel(): string
}
```

**LiteLLM Provider Implementation:**

```typescript
// src/services/llm/litellm-provider.ts
// Reference: nanobot/providers/litellm_provider.py

import OpenAI from 'openai'

class LiteLLMProvider extends LLMProvider {
  private client: OpenAI
  private providerRegistry: Map<string, ProviderSpec>

  constructor(config: {
    apiKey?: string
    apiBase?: string
    providerRegistry: Map<string, ProviderSpec>
  }) {
    super(config)
    this.providerRegistry = config.providerRegistry
    this.client = new OpenAI({
      apiKey: config.apiKey ?? 'ollama', // Ollama doesn't need real key
      baseURL: config.apiBase
    })
  }

  /**
   * Auto-detect provider from model name or API key prefix
   * Reference: nanobot/providers/litellm_provider.py - _detect_provider()
   */
  private detectProvider(model: string): ProviderSpec | null {
    // Check model keywords
    for (const spec of this.providerRegistry.values()) {
      if (spec.keywords.some(kw => model.toLowerCase().includes(kw))) {
        return spec
      }
    }
    // Check API key prefix detection
    // ...
    return null
  }

  /**
   * Apply provider-specific model prefix
   * Reference: nanobot/providers/litellm_provider.py - _apply_prefix()
   */
  private applyModelPrefix(model: string, spec: ProviderSpec): string {
    if (spec.litellmPrefix && !model.startsWith(spec.litellmPrefix)) {
      return `${spec.litellmPrefix}/${model}`
    }
    return model
  }

  /**
   * Sanitize empty content that causes 400 errors
   * Reference: nanobot/providers/litellm_provider.py - _sanitize_empty_content()
   */
  private sanitizeMessages(
    messages: Array<{ role: string; content: string | null }>
  ): Array<{ role: string; content: string }> {
    return messages.map(msg => ({
      ...msg,
      content: msg.content ?? '(empty)'
    }))
  }

  async chat(params: ChatParams): Promise<LLMResponse> {
    const provider = this.detectProvider(params.model ?? this.getDefaultModel())
    const model = provider
      ? this.applyModelPrefix(params.model ?? this.getDefaultModel(), provider)
      : params.model ?? this.getDefaultModel()

    const sanitizedMessages = this.sanitizeMessages(params.messages)

    const response = await this.client.chat.completions.create({
      model,
      messages: sanitizedMessages,
      tools: params.tools,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7
    })

    // Normalize tool call IDs (9-char alphanumeric for compatibility)
    // Reference: nanobot/providers/litellm_provider.py - tool call ID normalization
    const toolCalls = (response.choices[0]?.message.tool_calls ?? []).map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    }))

    return {
      content: response.choices[0]?.message.content ?? null,
      toolCalls,
      finishReason: response.choices[0]?.finish_reason ?? 'stop',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0
      }
    }
  }

  getDefaultModel(): string {
    return 'gpt-4o-mini'
  }
}
```

**Provider Registry:**

```typescript
// src/services/llm/provider-registry.ts
// Reference: nanobot/providers/registry.py

const PROVIDER_SPECS: ProviderSpec[] = [
  {
    name: 'openai',
    keywords: ['gpt', 'o1', 'o3', 'o4'],
    envKey: 'OPENAI_API_KEY',
    displayName: 'OpenAI',
    litellmPrefix: '',
    defaultApiBase: '',
    isGateway: false,
    isLocal: false,
    supportsPromptCaching: false
  },
  {
    name: 'deepseek',
    keywords: ['deepseek'],
    envKey: 'DEEPSEEK_API_KEY',
    displayName: 'DeepSeek',
    litellmPrefix: 'deepseek',
    defaultApiBase: 'https://api.deepseek.com/v1',
    isGateway: false,
    isLocal: false,
    supportsPromptCaching: false
  },
  {
    name: 'ollama',
    keywords: ['llama', 'mistral', 'qwen', 'gemma'],
    envKey: 'OLLAMA_API_BASE',
    displayName: 'Ollama',
    litellmPrefix: 'ollama',
    defaultApiBase: 'http://localhost:11434/v1',
    isGateway: false,
    isLocal: true,
    supportsPromptCaching: false
  },
  // ... Add more providers as needed
]

class ProviderRegistry {
  private specs: Map<string, ProviderSpec>

  constructor() {
    this.specs = new Map(PROVIDER_SPECS.map(s => [s.name, s]))
  }

  get(name: string): ProviderSpec | undefined {
    return this.specs.get(name)
  }

  detectByModel(model: string): ProviderSpec | undefined {
    return PROVIDER_SPECS.find(spec =>
      spec.keywords.some(kw => model.toLowerCase().includes(kw))
    )
  }

  detectByApiKeyPrefix(apiKey: string): ProviderSpec | undefined {
    return PROVIDER_SPECS.find(spec =>
      spec.keywords.some(kw => apiKey.toLowerCase().startsWith(kw))
    )
  }
}
```

**Deliverables:**
- [ ] `LLMProvider` abstract class with `chat()` method
- [ ] `LLMResponse` and `ToolCallRequest` interfaces
- [ ] `LiteLLMProvider` implementation with auto-detection
- [ ] `ProviderRegistry` with OpenAI/DeepSeek/Ollama specs
- [ ] Connection test method

---

#### T7.2: Tool Registry Implementation

Implement the `Tool` abstract base class and `ToolRegistry` following nanobot's tool architecture.

> **Important:** Use **Zod** for schema validation. DO NOT write custom `castParams`/`validateParams` - Zod provides type-safe runtime validation with automatic JSON Schema generation.

**TypeScript Interface Definitions:**

```typescript
// src/services/agent/tools/types.ts
// Reference: nanobot/agent/tools/base.py

import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

/**
 * Abstract Tool base class
 * Reference: nanobot/agent/tools/base.py - Tool class
 *
 * Uses Zod for schema validation instead of hand-rolled validators.
 * This provides:
 * - TypeScript type inference
 * - Runtime validation
 * - Automatic JSON Schema generation for LLM
 */
abstract class Tool<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  /**
   * Zod schema defining tool parameters
   * Subclasses MUST override this
   */
  abstract get schema(): TSchema

  /**
   * TypeScript type inferred from Zod schema
   */
  type Params = z.infer<TSchema>

  /**
   * Unique tool name (e.g., 'search_emails', 'read_file')
   */
  abstract get name(): string

  /**
   * Description shown to LLM for tool selection
   */
  abstract get description(): string

  /**
   * Execute the tool with validated parameters
   * Reference: nanobot/agent/tools/base.py - execute()
   */
  abstract execute(params: z.infer<TSchema>): Promise<string>

  /**
   * Convert to OpenAI function schema using zod-to-json-schema
   * Reference: nanobot/agent/tools/base.py - to_schema()
   */
  toSchema(): Record<string, unknown> {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: zodToJsonSchema(this.schema, {
          removeAdditionalStrategy: 'strict'
        })
      }
    }
  }

  /**
   * Validate and parse parameters using Zod
   * Throws ZodError on validation failure
   */
  parseParams(params: Record<string, unknown>): z.infer<TSchema> {
    return this.schema.parse(params)
  }

  /**
   * Safe parse that returns result or error
   */
  safeParseParams(params: Record<string, unknown>):
    { success: true; data: z.infer<TSchema> } | { success: false; error: z.ZodError } {
    return this.schema.safeParse(params)
  }
}
```

**Tool Registry Implementation:**

```typescript
// src/services/agent/tools/registry.ts
// Reference: nanobot/agent/tools/registry.py

/**
 * Tool registry for managing available tools
 * Reference: nanobot/agent/tools/registry.py - ToolRegistry class
 */
class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * Get all tool schemas for LLM
   */
  getDefinitions(): Array<Record<string, unknown>> {
    return Array.from(this.tools.values()).map(tool => tool.toSchema())
  }

  /**
   * Execute a tool with Zod validation
   * Reference: nanobot/agent/tools/registry.py - execute()
   */
  async execute(name: string, params: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name)

    if (!tool) {
      return `Error: Tool '${name}' not found.\n\n[Analyze the error above and try a different approach.]`
    }

    try {
      // Use Zod for validation and parsing
      const result = tool.safeParseParams(params)

      if (!result.success) {
        const errors = result.error.errors.map(e =>
          `${e.path.join('.')}: ${e.message}`
        ).join('; ')
        return `Error: ${errors}\n\n[Analyze the error above and try a different approach.]`
      }

      // Execute with validated params
      const output = await tool.execute(result.data)

      // Handle tool-returned errors
      if (typeof output === 'string' && output.startsWith('Error')) {
        return `${output}\n\n[Analyze the error above and try a different approach.]`
      }

      return output
    } catch (error) {
      return `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}\n\n[Analyze the error above and try a different approach.]`
    }
  }

  /**
   * List all registered tools
   */
  list(): string[] {
    return Array.from(this.tools.keys())
  }
}
```

**Example Tool with Zod Schema:**

```typescript
// src/services/agent/tools/search-emails.ts

import { z } from 'zod'

// Define schema once - get TS types, runtime validation, and JSON Schema
const SearchEmailsSchema = z.object({
  query: z.string().describe('Search query (searches subject and body)'),
  limit: z.number().int().min(1).max(20).default(5).describe('Maximum results to return'),
  sender: z.string().optional().describe('Filter by sender email address'),
  dateFrom: z.string().datetime().optional().describe('Filter emails after this date'),
  dateTo: z.string().datetime().optional().describe('Filter emails before this date')
})

class SearchEmailsTool extends Tool<typeof SearchEmailsSchema> {
  name = 'search_local_emails' as const
  description = 'Search the local email database for relevant context'
  schema = SearchEmailsSchema

  constructor(private emailRepository: EmailRepository) {
    super()
  }

  async execute(params: z.infer<typeof SearchEmailsSchema>): Promise<string> {
    const emails = await this.emailRepository.search({
      query: params.query,
      limit: params.limit,
      sender: params.sender,
      dateRange: params.dateFrom && params.dateTo
        ? { from: new Date(params.dateFrom), to: new Date(params.dateTo) }
        : undefined
    })

    if (emails.length === 0) {
      return 'No emails found matching the query.'
    }

    return emails.map((email, i) => `
[${i + 1}] ID: ${email.id}
From: ${email.sender}
Subject: ${email.subject}
Date: ${email.date.toISOString()}
Snippet: ${email.snippet}
    `.trim()).join('\n\n')
  }
}
```

**Dependencies Required:**

```bash
npm install zod zod-to-json-schema
```

**Deliverables:**
- [ ] `Tool` abstract class using Zod for schema
- [ ] `ToolRegistry` with Zod validation
- [ ] `zod-to-json-schema` for OpenAI schema generation
- [ ] Example tools with Zod schemas

---

#### T7.3: Token Truncator Utility

Implement token estimation and smart truncation for long email bodies.

**Implementation Notes:**

```typescript
// src/services/agent/utils/token-truncator.ts

/**
 * Token estimation and truncation utility
 * Approximates tokens (4 chars ≈ 1 token for English)
 */
class TokenTruncator {
  /**
   * Estimate token count from text
   */
  estimateTokens(text: string): number {
    // More accurate: use tiktoken for OpenAI models
    // Approximation: 4 characters per token
    return Math.ceil(text.length / 4)
  }

  /**
   * Truncate text to fit within context window
   * Preserves beginning and end, removes middle
   */
  truncate(text: string, maxTokens: number, options?: {
    preserveHeaders?: boolean
    preserveSignature?: boolean
  }): { text: string; wasTruncated: boolean; originalTokens: number } {
    const estimated = this.estimateTokens(text)

    if (estimated <= maxTokens) {
      return { text, wasTruncated: false, originalTokens: estimated }
    }

    const reserveTokens = 50 // For truncation notice
    const keepTokens = maxTokens - reserveTokens
    const charsToKeep = keepTokens * 4

    // 70% beginning, 30% end
    const startChars = Math.floor(charsToKeep * 0.7)
    const endChars = Math.floor(charsToKeep * 0.3)

    const truncated =
      text.slice(0, startChars) +
      '\n\n[...content truncated for token limit...]\n\n' +
      text.slice(-endChars)

    return {
      text: truncated,
      wasTruncated: true,
      originalTokens: estimated
    }
  }
}
```

**Deliverables:**
- [ ] Token estimation method
- [ ] Smart truncation preserving context
- [ ] Configurable max token limit

---

## T7 Completion Checklist

- [ ] `LLMProvider` abstract class with `chat()` method
- [ ] `LLMResponse` and `ToolCallRequest` interfaces
- [ ] `LiteLLMProvider` with auto-detection and prefix handling
- [ ] `ProviderRegistry` with OpenAI/DeepSeek/Ollama specs
- [ ] `Tool` abstract class using **Zod** for schema validation
- [ ] `ToolRegistry` with Zod validation (no custom castParams/validateParams)
- [ ] `TokenTruncator` utility
- [ ] Dependencies: `zod`, `zod-to-json-schema`

---

## File Structure

```
src/
└── services/
    ├── llm/
    │   ├── types.ts              # LLMResponse, ToolCallRequest, ProviderSpec
    │   ├── provider-registry.ts  # ProviderRegistry class
    │   └── litellm-provider.ts   # LiteLLMProvider implementation
    └── agent/
        ├── tools/
        │   ├── types.ts          # Tool abstract class (Zod-based)
        │   ├── registry.ts       # ToolRegistry class
        │   └── search-emails.ts  # SearchEmailsTool example
        └── utils/
            └── token-truncator.ts
```

---

## Next Stage

Proceed to **[Phase 3.3: Three-Step AI Pipeline](./plan_3_3.md)** to implement the email analysis pipeline.
# Phase 3.1: Overview & Architecture

> **Context:** Build the brains of the application. This involves LLM provider abstraction, tool registry, multi-step pipeline for email summarization, and the ReAct agent loop. All core patterns are translated from the `nanobot` Python project.

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 3 of 5 |
| **Focus Area** | LLM integration, AI pipeline, ReAct agent |
| **Total Tasks** | 8 subtasks across 3 task groups |
| **Dependencies** | Phase 2 (Mail Ingestion & Sync Routing) |
| **Estimated Effort** | 3-4 days |
| **Reference Project** | `docs/SDK/nanobot/` (nanobot Python agent framework) |

---

## Architecture Overview: From nanobot to TypeScript

```
┌─────────────────────────────────────────────────────────────────┐
│                    NanoMail Agent Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐ │
│  │   Message    │───▶│  AgentLoop   │───▶│  SSE Streaming   │ │
│  │    Bus       │    │  (ReAct)     │    │    Endpoint      │ │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘ │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐             │
│         ▼                   ▼                   ▼             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │ LLMProvider  │    │ ToolRegistry │    │ContextBuilder│    │
│  │   (base)     │    │   (tools)    │    │  (prompts)   │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│         │                   │                   │             │
│         ▼                   ▼                   ▼             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │LiteLLM       │    │  Tool Base   │    │ MemoryStore  │    │
│  │Provider      │    │  (abstract)  │    │ (2-layer)    │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 3 Task Groups

Phase 3 is divided into 3 main task groups (T7, T8, T9), each with multiple subtasks:

### T7: Hybrid LLM Adapter & Tool Registry (Phase 3.2)

**Goal:** Implement LLM provider abstraction and tool registry following nanobot's architecture.

**Subtasks:**
- T7.1: LLM Provider Abstraction - `LLMProvider` abstract class, `LiteLLMProvider` implementation
- T7.2: Tool Registry Implementation - `Tool` abstract class with Zod schema validation
- T7.3: Token Truncator Utility - Token estimation and smart truncation

**Key Deliverables:**
- `LLMProvider` abstract class with `chat()` method
- `LLMResponse` and `ToolCallRequest` interfaces
- `LiteLLMProvider` with auto-detection and prefix handling
- `ProviderRegistry` with OpenAI/DeepSeek/Ollama specs
- `Tool` abstract class using Zod for schema validation
- `ToolRegistry` with Zod validation
- `TokenTruncator` utility

**Dependencies:** T6 (Backend API Core) for settings retrieval

---

### T8: Three-Step AI Pipeline (Phase 3.3)

**Goal:** Implement the synchronous pipeline triggered when user manually selects emails. Each step builds on the previous one.

**Subtasks:**
- T8.1: Context Builder Service - `ContextBuilder` with system prompt construction
- T8.2: Memory Store Implementation - Two-layer memory (MEMORY.md + HISTORY.md)
- T8.3: One-Shot Email Analysis Pipeline - Single LLM call for classification, summary, action items

**Key Deliverables:**
- `ContextBuilder` class with `buildSystemPrompt()`, `buildMessages()`
- `MemoryStore` with two-layer memory (async fs.promises API)
- `EmailAnalysisSchema` with Zod
- `EmailAnalyzer` with one-shot extraction
- `BatchEmailProcessor` with concurrency control

**Dependencies:** T7 (Hybrid LLM Adapter & Tool Registry)

---

### T9: ReAct Agent & SSE Streaming Service (Phase 3.4)

**Goal:** Implement the "human-in-the-loop" drafting assistant using the ReAct pattern. This is the core agent functionality.

**Subtasks:**
- T9.1: Search Local Emails Tool - `SearchEmailsTool` for database search
- T9.2: ReAct Agent Loop Core - `AgentLoop` with Think -> Action -> Observation pattern
- T9.3: SSE Streaming Endpoint - Real-time streaming for draft generation

**Key Deliverables:**
- `SearchEmailsTool` with Zod schema
- `AgentLoop` with AsyncGenerator pattern
- SSE endpoint `/api/agent/draft`
- SSE endpoint `/api/process-emails`
- Frontend SSE client using `eventsource-parser`

**Dependencies:** T7, T8

---

## Key Reference Files

Before starting any subtask, read the corresponding nanobot Python files:

| Task | Reference File | Purpose |
|------|----------------|---------|
| T7.1 | `docs/SDK/nanobot/providers/base.py` | LLM provider abstraction |
| T7.1 | `docs/SDK/nanobot/providers/litellm_provider.py` | Multi-provider implementation |
| T7.2 | `docs/SDK/nanobot/agent/tools/base.py` | Tool abstraction |
| T8.1 | `docs/SDK/nanobot/agent/context.py` | System prompt builder |
| T8.2 | `docs/SDK/nanobot/agent/memory.py` | Two-layer memory |
| T9.2 | `docs/SDK/nanobot/agent/loop.py` | ReAct agent loop |

---

## Dependencies Summary

```json
{
  "dependencies": {
    "openai": "^4.x",
    "zod": "^3.x",
    "zod-to-json-schema": "^3.x"
  },
  "dependencies (frontend)": {
    "eventsource-parser": "^2.x"
  }
}
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Single email analysis | < 3s | One-shot extraction |
| Batch 10 emails | < 15s | Concurrency limit: 3 |
| Draft generation | < 10s | maxIterations: 5 |
| Rate limit prevention | 3 concurrent | Batch delay: 1s |

---

## Next Steps

Proceed to **[Phase 3.2: Hybrid LLM Adapter & Tool Registry](./plan_3_2.md)** to start implementation.
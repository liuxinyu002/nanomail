## Project Implementation Plan: Smart Email Agent

### Phase 1: Data Layer & Security Infrastructure

**Context:** Establish the foundational scaffolding. Before touching emails or AI, we must guarantee that the environment can securely store sensitive credentials (IMAP/SMTP/LLM keys) using the master encryption key.

* **T1: Project Scaffolding & Tooling**
* *Context:* Set up the monorepo structure separating the Node.js backend and React frontend.
* *Dependencies:* `none`
* * [ ] **T1.1**: Initialize a Node.js + TypeScript project for the backend. Set up ESLint and Prettier.


* * [ ] **T1.2**: Initialize a Vite + React + TypeScript project for the frontend.


* * [ ] **T1.3**: Configure Tailwind CSS and initialize Shadcn UI in the frontend workspace.




* **T2: Database Setup & Entity Modeling**
* *Context:* Configure the local SQLite database using TypeORM. Because this is single-tenant, no user foreign keys are needed.
* *Dependencies:* `T1`
* * [ ] **T2.1**: Install `sqlite3` and `typeorm`. Configure the TypeORM data source to write to a local file (e.g., `data/database.sqlite`).


* * [ ] **T2.2**: Define the `Settings` entity (key-value store for encrypted credentials).


* * [ ] **T2.3**: Define the `Email` entity (id, subject, sender, snippet, body_text, has_attachments, date).


* * [ ] **T2.4**: Define the `Todo` entity (id, email_id, description, urgency, status) and `Label` entity.




* **T3: Secure Vault Implementation**
* *Context:* All credentials must be encrypted at rest. Implement an interception layer for the `Settings` table.
* *Dependencies:* `T2`
* * [ ] **T3.1**: Create an `EncryptionService` using Node's native `crypto` module (AES-256-GCM). Require a `MASTER_KEY` environment variable.


* * [ ] **T3.2**: Create a `SettingsService` that automatically encrypts values before saving to the `Settings` table and decrypts them upon retrieval.


* * [ ] **T3.3**: Write simple unit tests or a verification script to ensure keys are unreadable in the raw SQLite file but readable via the service.





### Phase 2: Mail Ingestion & Sync Routing

**Context:** Connect the system to the outside world by syncing emails and providing the infrastructure to send them.

* **T4: Data Ingestion Engine (IMAP)**
* *Context:* Retrieve raw emails, parse them, and store the clean text in the database.
* *Dependencies:* `T3`
* * [ ] **T4.1**: Integrate `node-imap` (or `imapflow`). Fetch IMAP credentials via `SettingsService`.


* * [ ] **T4.2**: Implement MIME parsing (e.g., using `mailparser`) to extract pure text bodies and strip/ignore attachments for the MVP.


* * [ ] **T4.3**: Create a polling cron job or background worker to quietly fetch new emails and save them to the `Email` table.




* **T5: SMTP Dispatcher Module**
* *Context:* Create the service responsible for closing the loop—sending the final drafted replies.
* *Dependencies:* `T3`
* * [ ] **T5.1**: Set up `nodemailer` configured with SMTP credentials fetched from `SettingsService`.


* * [ ] **T5.2**: Expose a generic `sendEmail(to, subject, body)` backend service method.




* **T6: Backend API Core**
* *Context:* Establish the REST API required for the frontend to fetch data and trigger the AI pipeline.
* *Dependencies:* `T4`, `T5`
* * [ ] **T6.1**: Create GET endpoints for `/api/emails` (with pagination/limits) and `/api/todos`.


* * [ ] **T6.2**: Create a POST endpoint `/api/process-emails` that accepts an array of Email IDs to queue for AI processing.





### Phase 3: AI Engine & Agent Core

**Context:** Build the brains of the application. This involves standard API routing for LLMs, a multi-step pipeline for email summarization, and the ReAct loop for drafting replies.

* **T7: Hybrid LLM Adapter & Tool Registry**
* *Context:* Ensure the app can speak to OpenAI, DeepSeek, or local Ollama using standard OpenAI Node SDK formats.
* *Dependencies:* `T6`
* * [ ] **T7.1**: Wrap the `openai` Node SDK into a factory service that reads the base URL and API key from `SettingsService` (supporting overrides for Ollama/DeepSeek).


* * [ ] **T7.2**: Implement a Token Truncator utility to slice long email bodies before sending them to the LLM.


* * [ ] **T7.3**: Create a Tool Registry to define and handle OpenAI standard Tool Calling schemas.




* **T8: Three-Step AI Pipeline**
* *Context:* The synchronous pipeline triggered when the user manually selects emails in the inbox.
* *Dependencies:* `T7`
* * [ ] **T8.1**: Implement Step 1: Spam/Newsletter detection prompt. If flagged, update DB and halt pipeline for this email.


* * [ ] **T8.2**: Implement Step 2: TL;DR Summary generation prompt. Update `Email` record.


* * [ ] **T8.3**: Implement Step 3: Action Item extraction prompt. Parse structured JSON output to create rows in the `Todo` table (linking back to the `email_id` and setting urgency).




* **T9: ReAct Agent & SSE Streaming Service**
* *Context:* The "human-in-the-loop" drafting assistant. This requires handling a thinking loop and streaming the results dynamically.
* *Dependencies:* `T7`, `T8`
* * [ ] **T9.1**: Register a `search_local_emails` tool allowing the LLM to query the `Email` SQLite table for context.


* * [ ] **T9.2**: Implement the ReAct loop core (Think -> Tool -> Act) based on `nanobot` principles.


* * [ ] **T9.3**: Expose a Server-Sent Events (SSE) endpoint (`/api/agent/draft`) that streams the Agent's thought process (tool usage) and the final draft text chunk-by-chunk.





### Phase 4: Frontend Interaction & Workspace

**Context:** Build out the single-page application UI with a focus on a clean, minimalist "Vibe" aesthetic using Shadcn and Tailwind.

* **T10: UI Layout & Settings Dashboard**
* *Context:* The base layout and the crucial configuration screen to enter keys.
* *Dependencies:* `T6`
* * [ ] **T10.1**: Create the main layout shell (Sidebar navigation: Inbox, To-Do, Settings).


* * [ ] **T10.2**: Build the Settings form allowing the user to input and save IMAP, SMTP, and LLM API keys.




* **T11: Vibe Inbox & AI Trigger**
* *Context:* The frameless email list and the manual AI dispatch mechanism.
* *Dependencies:* `T10`
* * [ ] **T11.1**: Render the inbox list fetching from `/api/emails`. Design as frameless cards (Sender, Title, 15-char snippet).


* * [ ] **T11.2**: Implement multi-select checkboxes (enforce max 5 limit) and a floating "Run AI" action button calling `/api/process-emails`.


* * [ ] **T11.3**: Build the collapsible dropdown component for processed emails to reveal the Summary and a lightweight, checkable To-Do list.




* **T12: Smart To-Do Dashboard**
* *Context:* The independent Kanban-style or list-style board for extracted Action Items.
* *Dependencies:* `T10`
* * [ ] **T12.1**: Fetch and render To-Dos from `/api/todos`, grouped or sorted by urgency (High, Med, Low).


* * [ ] **T12.2**: Wire up standard completion toggles to mark tasks as done in the database.




* **T13: Agent Intent Editor**
* *Context:* The real-time AI drafting interface.
* *Dependencies:* `T12`, `T9`, `T5`
* * [ ] **T13.1**: Add an "Assist Reply" button to To-Do cards that opens a modal or side-panel with a short-instruction text input.


* * [ ] **T13.2**: Connect to the SSE endpoint (`/api/agent/draft`). Build a UI state to show the Agent's "Thinking/Searching..." status, followed by a typewriter effect streaming the draft into a rich text editor.


* * [ ] **T13.3**: Add a "Send" button in the editor that calls the backend SMTP dispatch service (`T5`), marks the To-Do as complete, and closes the flow.





### Phase 5: Delivery & Deployment

**Context:** Finalize the application for self-hosted, private deployment.

* **T14: Containerization**
* *Context:* Package the app into Docker for easy deployment on NAS, VPS, or local machines.
* *Dependencies:* `T11`, `T13` (Frontend & Backend feature complete)
* * [ ] **T14.1**: Write a multi-stage `Dockerfile`. Stage 1: Build React frontend. Stage 2: Build Node TS backend. Stage 3: Serve static frontend files from the Node backend or Nginx.


* * [ ] **T14.2**: Write `docker-compose.yml`. Ensure persistent volume mounts for `data/` (where SQLite and attachments live) and environment variable pass-through for `MASTER_KEY`.




* **T15: Final Testing & Documentation**
* *Context:* Polish the open-source/delivery assets.
* *Dependencies:* `T14`
* * [ ] **T15.1**: Run End-to-End tests: Ingest test email -> trigger pipeline -> generate To-Do -> ask agent to reply -> catch SMTP output.


* * [ ] **T15.2**: Write a comprehensive `README.md` focusing on the self-hosted deployment steps, generating a Master Key, and connecting Ollama/DeepSeek.
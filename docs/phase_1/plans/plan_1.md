# Phase 1: Data Layer & Security Infrastructure

> **Context:** Establish the foundational scaffolding. Before touching emails or AI, we must guarantee that the environment can securely store sensitive credentials (IMAP/SMTP/LLM keys) using the master encryption key.

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 1 of 5 |
| **Focus Area** | Project scaffolding, database setup, security layer |
| **Total Tasks** | 10 subtasks across 3 task groups |
| **Dependencies** | None (Entry Point) |
| **Estimated Effort** | 2-3 days |

---

## T1: Project Scaffolding & Tooling

### Context
Set up the monorepo structure separating the Node.js backend and React frontend. This establishes the foundation for all subsequent development work and enables shared TypeScript interfaces between workspaces.

### Dependencies
None (Entry Point)

### Tasks

#### T1.0: Initialize Monorepo Root
Set up the root-level monorepo configuration with pnpm workspaces to enable code sharing between frontend and backend.

**Implementation Notes:**
- Create root `package.json` with workspace references
- Create `pnpm-workspace.yaml` defining `packages/*` as workspace members
- This enables shared TypeScript interfaces (API payloads, Tool schemas) across workspaces
- Example `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - 'packages/*'
  ```

**Deliverables:**
- [ ] Root `package.json` configured
- [ ] `pnpm-workspace.yaml` created
- [ ] Workspace structure documented

---

#### T1.1: Initialize Backend Project
Initialize a Node.js + TypeScript project for the backend. Set up ESLint and Prettier.

**Implementation Notes:**
- Use `pnpm init` or `npm init` for package setup
- Configure `tsconfig.json` with strict mode enabled
- Set up ESLint with `@typescript-eslint` rules
- Configure Prettier with project formatting standards
- Add `concurrently` for running multiple scripts

**Deliverables:**
- [ ] `package.json` with TypeScript dependencies
- [ ] `tsconfig.json` with strict configuration
- [ ] `.eslintrc.js` and `.prettierrc` files
- [ ] Project folder structure established

---

#### T1.2: Initialize Frontend Project
Initialize a Vite + React + TypeScript project for the frontend.

**Implementation Notes:**
- Use `pnpm create vite@latest frontend --template react-ts`
- Configure TypeScript path aliases for clean imports
- Set up environment variable handling (`.env.local`)

**Deliverables:**
- [ ] Vite + React + TypeScript project initialized
- [ ] Frontend workspace configuration complete

---

#### T1.3: Configure UI Framework
Configure Tailwind CSS and initialize Shadcn UI in the frontend workspace.

**Implementation Notes:**
- Install Tailwind CSS and configure `tailwind.config.js`
- Initialize Shadcn UI with default theme
- Set up CSS variables for theming support

**Deliverables:**
- [ ] Tailwind CSS configured
- [ ] Shadcn UI initialized with components

---

#### T1.4: Initialize Shared Workspace & Zod Schemas
Initialize the `@smart-email/shared` package to establish the single source of truth for Data Contracts.

**Implementation Notes:**
- Initialize `package.json` and `tsconfig.json` inside `packages/shared/`
- Install `zod` as a dependency
- Create foundational schemas mapping to T2 entities (e.g., `TodoSchema`, `SettingsSchema`) and export their inferred TypeScript types (`z.infer`)
- Ensure both `frontend` and `backend` workspaces correctly link to `@smart-email/shared` via `workspace:*`

**Deliverables:**
- [ ] `packages/shared` directory initialized with config
- [ ] Foundational Zod schemas and types created and exported
- [ ] Cross-workspace imports successfully resolving

---

## T2: Database Setup & Entity Modeling

### Context
Configure the local SQLite database using TypeORM. Because this is single-tenant, no user foreign keys are needed. This simplifies the data model significantly.

### Dependencies
- **Requires**: T1 (Project Scaffolding)

### Tasks

#### T2.1: Configure Database Connection
Install `sqlite3` and `typeorm`. Configure the TypeORM data source to write to a local file (e.g., `data/database.sqlite`).

**Implementation Notes:**
```typescript
// Expected structure
import { DataSource } from 'typeorm'

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'data/database.sqlite',
  entities: ['src/entities/**/*.ts'],
  synchronize: true, // Development only
  logging: true
})
```

**Deliverables:**
- [ ] SQLite and TypeORM dependencies installed
- [ ] Data source configured with proper path
- [ ] Database file created on first run

---

#### T2.2: Define Settings Entity
Define the `Settings` entity (key-value store for encrypted credentials).

**Entity Schema:**
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Auto-increment primary key |
| key | VARCHAR(255) | Unique setting identifier |
| value | TEXT | Encrypted compound string (IV:AuthTag:Ciphertext) |

**Implementation Notes:**
- All sensitive values will be encrypted by the Vault layer
- **Critical:** The `value` field stores a compound string containing IV, Auth Tag, and Ciphertext concatenated with colons (e.g., `base64(iv):base64(authTag):base64(ciphertext)`)
- AES-256-GCM requires both IV and Auth Tag for decryption - both must be stored alongside the ciphertext
- Common keys: `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS`, `SMTP_HOST`, `LLM_API_KEY`

**Deliverables:**
- [ ] `Settings` entity defined with TypeORM decorators
- [ ] Unique constraint on `key` field

---

#### T2.3: Define Email Entity
Define the `Email` entity (id, subject, sender, snippet, body_text, has_attachments, date).

**Entity Schema:**
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Auto-increment primary key |
| subject | VARCHAR(500) | Email subject line |
| sender | VARCHAR(255) | Sender email address |
| snippet | VARCHAR(200) | Preview text (first 15 chars of body) |
| body_text | TEXT | Full email body (parsed plain text) |
| has_attachments | BOOLEAN | Flag for attachment presence |
| date | DATETIME | Email received/sent date |
| is_processed | BOOLEAN | AI pipeline processing status |
| is_spam | BOOLEAN | Spam detection flag |

**Deliverables:**
- [ ] `Email` entity defined with all required fields
- [ ] Indexes on `date` and `is_processed` for query performance

---

#### T2.4: Define Todo and Label Entities
Define the `Todo` entity (id, email_id, description, urgency, status) and `Label` entity.

**Todo Entity Schema:**
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Auto-increment primary key |
| email_id | INTEGER (FK) | Reference to source email |
| description | TEXT | Action item description |
| urgency | ENUM | 'high', 'medium', 'low' |
| status | ENUM | 'pending', 'in_progress', 'completed' |
| created_at | DATETIME | Creation timestamp |

**Label Entity Schema:**
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Auto-increment primary key |
| email_id | INTEGER (FK) | Reference to email |
| name | VARCHAR(100) | Label name (e.g., 'newsletter', 'spam') |

**Implementation Notes:**
- Use TypeORM's `@ManyToOne` decorator on `Todo.email` and `Label.email` to establish relations
- Use TypeORM's `@OneToMany` decorator on `Email` to enable `email.todos` and `email.labels` access
- This enables eager/lazy loading and proper ORM relation management
- Example:
  ```typescript
  // In Todo entity
  @ManyToOne(() => Email, email => email.todos)
  email: Email

  // In Email entity
  @OneToMany(() => Todo, todo => todo.email)
  todos: Todo[]
  ```

**Deliverables:**
- [ ] `Todo` entity with proper TypeORM relation to `Email`
- [ ] `Label` entity with proper TypeORM relation to `Email`
- [ ] `Email` entity with reverse relations for todos and labels
- [ ] Enum types defined for urgency and status

---

## T3: Secure Vault Implementation

### Context
All credentials must be encrypted at rest. Implement an interception layer for the `Settings` table. This is a critical security requirement.

### Dependencies
- **Requires**: T2 (Database Setup)

### Tasks

#### T3.1: Create Encryption Service
Create an `EncryptionService` using Node's native `crypto` module (AES-256-GCM). Require a `MASTER_KEY` environment variable.

**Implementation Notes:**
```typescript
// Expected API
class EncryptionService {
  constructor() {
    const key = process.env.MASTER_KEY
    if (!key) throw new Error('MASTER_KEY environment variable required')
  }

  encrypt(plaintext: string): string // Returns compound string: iv:authTag:ciphertext
  decrypt(compoundString: string): string // Parses iv, authTag, ciphertext and returns plaintext
}
```

**AES-GCM Storage Format (Critical):**
The `encrypt` method must return a compound string that includes all components needed for decryption:
- **Format:** `base64(iv):base64(authTag):base64(ciphertext)`
- Each component separated by a colon (`:`)
- Example output: `dGVzdEl2U2FsdA==:YXV0aFRhZ0hlcmU=:ZW5jcnlwdGVkRGF0YQ==`

The `decrypt` method must parse this compound string and extract all three components before decryption.

**Security Requirements:**
- Use AES-256-GCM for authenticated encryption
- Generate random IV (12 bytes recommended for GCM) for each encryption
- Auth Tag is automatically generated by GCM mode (16 bytes)
- Key must be 32 bytes (256 bits)
- Never reuse IV with the same key

**Deliverables:**
- [ ] `EncryptionService` class implemented with compound string format
- [ ] Proper error handling for missing MASTER_KEY
- [ ] Unit tests for encrypt/decrypt round-trip
- [ ] Unit tests verifying correct parsing of compound string format

---

#### T3.2: Create Settings Service
Create a `SettingsService` that automatically encrypts values before saving to the `Settings` table and decrypts them upon retrieval.

**Expected API:**
```typescript
class SettingsService {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}
```

**Implementation Notes:**
- Transparent encryption/decryption at service layer
- Never expose raw encrypted values to callers
- Handle non-existent keys gracefully

**Deliverables:**
- [ ] `SettingsService` with automatic encryption
- [ ] Integration with `EncryptionService`
- [ ] Error handling for decryption failures

---

#### T3.3: Security Verification
Write simple unit tests or a verification script to ensure keys are unreadable in the raw SQLite file but readable via the service.

**Test Cases:**
1. Store a credential, verify it's encrypted in database file
2. Retrieve credential via service, verify it matches original
3. Attempt to read raw database, verify value is not plaintext

**Deliverables:**
- [ ] Unit tests for encryption/decryption flow
- [ ] Verification that raw SQLite contains no plaintext secrets
- [ ] Documentation for MASTER_KEY generation

---

## Phase 1 Completion Checklist

- [ ] Monorepo root configured with pnpm workspaces
- [ ] Monorepo structure established with backend/frontend separation
- [ ] Shared workspace (`@smart-email/shared`) initialized with Zod schemas
- [ ] TypeScript configured with strict mode
- [ ] ESLint and Prettier configured
- [ ] SQLite database operational with TypeORM
- [ ] All entities defined with proper TypeORM relations
- [ ] Encryption service using AES-256-GCM with compound string format
- [ ] Settings service with transparent encryption
- [ ] Security verification tests passing

## Next Phase

→ [Phase 2: Mail Ingestion & Sync Routing](./plan_2.md)
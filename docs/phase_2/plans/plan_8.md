# Implementation Plan: Email Folders (Sent & Trash) with Local-First Architecture

> **Status**: Ready for Implementation
> **Created**: 2026-03-15
> **Related Discussion**: Email Folder Management for Local-First Architecture

---

## 1. Overview

Add Sent and Trash folder functionality to NanoMail, enabling users to distinguish and manage email lists by folder type. This plan implements a Local-First architecture with a three-phase deletion strategy and auto-vacuum cleanup for trashed emails.

**Key Design Decisions**:
- Orthogonal data model: Folder + Direction + Status separation
- Three-phase deletion: Move to Trash -> Permanent Delete with confirmation -> Auto-vacuum
- `trashed_at` timestamp: Records when email was moved to Trash, used for auto-vacuum (more accurate than `updated_at`)
- Contact fields stored as JSON for flexibility
- Frontend derives `display_contact` dynamically based on `direction`
- Attachment entity with cascade delete and explicit `@JoinColumn`
- SQLite foreign keys enabled for database-level cascade delete
- Secure deletion order: DB record first, then filesystem files

---

## 2. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Add `folder` enum field: inbox/sent/trash/draft/archive | High |
| FR-2 | Add `direction` enum field: incoming/outgoing (immutable) | High |
| FR-3 | Add contact fields: `from`, `to`, `cc`, `bcc` as JSON | High |
| FR-4 | Add `trashed_at` timestamp field for accurate trash duration tracking | High |
| FR-5 | Implement Trash folder view with deleted emails | High |
| FR-6 | Implement Sent folder view with outgoing emails | High |
| FR-7 | Regular delete moves email to Trash (no confirmation) | High |
| FR-8 | Permanent delete removes from database with confirmation dialog | High |
| FR-9 | Restore from Trash uses `direction` to determine target folder | Medium |
| FR-10 | Auto-vacuum deletes trashed emails older than 30 days (using `trashed_at`) | Medium |
| FR-11 | Display contact derived from direction | High |
| FR-12 | Attachment entity with cascade delete | Medium |
| FR-13 | SQLite foreign keys enabled for cascade delete | High |
| FR-14 | Basic batch selection and delete for Trash cleanup | Medium |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Migration uses drop/recreate strategy (acceptable for local-first) |
| NFR-2 | Auto-vacuum runs in background, non-blocking |
| NFR-3 | Frontend uses optimistic updates for delete/restore |
| NFR-4 | Both panes (list/detail) scroll independently |

### Out of Scope

- Draft functionality (only field reserved)
- Archive functionality (only field reserved)
- Email sending functionality
- Star/flag functionality
- Email move between custom folders

---

## 3. Architecture Changes

### 3.1 Data Model

#### Email Entity Changes

```typescript
// packages/backend/src/entities/Email.entity.ts

// New enums
export type EmailFolder = 'inbox' | 'sent' | 'trash' | 'draft' | 'archive'
export type EmailDirection = 'incoming' | 'outgoing'

// Contact type (stored as JSON)
interface EmailContact {
  name: string | null
  email: string
}

interface EmailContactList extends Array<EmailContact> {}

@Entity('emails')
export class Email {
  // ... existing fields ...

  // NEW: Folder classification
  @Column({
    type: 'varchar',
    length: 20,
    default: 'inbox'
  })
  folder: EmailFolder = 'inbox'

  // NEW: Direction (immutable - records email physical nature)
  @Column({
    type: 'varchar',
    length: 10,
    default: 'incoming'
  })
  direction: EmailDirection = 'incoming'

  // NEW: Contact fields (JSON type)
  @Column({ type: 'simple-json', nullable: true })
  from: EmailContact | null = null

  @Column({ type: 'simple-json', nullable: true })
  to: EmailContactList | null = null

  @Column({ type: 'simple-json', nullable: true })
  cc: EmailContactList | null = null

  @Column({ type: 'simple-json', nullable: true })
  bcc: EmailContactList | null = null

  // NEW: Read/Star status
  @Column({ type: 'boolean', default: false })
  is_read: boolean = false

  @Column({ type: 'boolean', default: false })
  is_starred: boolean = false

  // NEW: Trash timestamp - records when email was moved to trash
  @Column({ type: 'datetime', nullable: true })
  trashed_at!: Date | null

  // Keep sender for backward compatibility during migration
  // Will be removed after migration
  @Column({ type: 'varchar', length: 255, nullable: true })
  sender!: string | null

  // ... existing fields ...
}
```

#### Attachment Entity (New)

```typescript
// packages/backend/src/entities/Attachment.entity.ts

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'integer' })
  emailId!: number

  @ManyToOne(() => Email, (email) => email.attachments, {
    onDelete: 'CASCADE'  // Auto-delete when email is deleted
  })
  @JoinColumn({ name: 'emailId' })  // Must be explicit for FK constraint
  email!: Relation<Email>

  @Column({ type: 'varchar', length: 255 })
  filename!: string  // UUID filename

  @Column({ type: 'varchar', length: 500 })
  originalFilename!: string

  @Column({ type: 'varchar', length: 100 })
  mimeType!: string

  @Column({ type: 'integer' })
  size!: number  // bytes

  @Column({ type: 'varchar', length: 500 })
  localPath!: string  // data/attachments/{emailId}/{uuid}

  @Column({ type: 'varchar', length: 255, nullable: true })
  contentId!: string | null  // For inline images

  @Column({ type: 'boolean', default: false })
  isInline!: boolean
}
```

### 3.2 Frontend Display Contact Derivation

```typescript
// packages/frontend/src/utils/email.ts

interface DisplayContact {
  name: string | null
  email: string
  extra?: string  // "and N others"
  allRecipients?: EmailContact[]  // Full recipient list for tooltip
}

export function getDisplayContact(email: Email): DisplayContact {
  if (email.direction === 'incoming') {
    // Show sender
    return {
      name: email.from?.name ?? null,
      email: email.from?.email ?? email.sender ?? 'Unknown'
    }
  } else {
    // Show first recipient with tooltip support for multiple
    const recipients = email.to ?? []
    if (recipients.length === 0) {
      return { name: null, email: 'No recipient' }
    }
    const first = recipients[0]
    const extra = recipients.length > 1
      ? `and ${recipients.length - 1} others`
      : undefined
    return {
      name: first.name,
      email: first.email,
      extra,
      // Include all recipients for Tooltip display
      allRecipients: recipients.length > 1 ? recipients : undefined
    }
  }
}
```

### 3.3 File Structure

```
packages/
├── shared/src/schemas/
│   ├── email.ts              # Modified: Add folder, direction, contact schemas
│   └── index.ts              # Modified: Export new types
├── backend/src/
│   ├── entities/
│   │   ├── Email.entity.ts   # Modified: Add new fields
│   │   └── Attachment.entity.ts  # New: Attachment entity
│   ├── routes/
│   │   └── email.routes.ts   # Modified: Add folder param, delete endpoints
│   ├── services/
│   │   ├── EmailSyncService.ts  # Modified: Handle new fields
│   │   └── AutoVacuumService.ts # New: Auto-cleanup service
│   └── config/
│       └── database.ts       # Modified: Add Attachment entity
└── frontend/src/
    ├── pages/
    │   └── MailPage.tsx      # New: Dynamic folder page
    ├── features/mail/        # New: Renamed from inbox
    │   ├── MailList.tsx      # Modified from InboxList
    │   ├── MailCard.tsx      # Modified from EmailCard
    │   └── MailDetail/       # Renamed from EmailDetail
    ├── components/layout/
    │   └── MainLayout.tsx    # Modified: Add folder navigation
    ├── hooks/
    │   ├── useEmails.ts      # New: Folder-aware email list
    │   └── useEmailMutations.ts  # New: Delete/restore mutations
    ├── utils/
    │   └── email.ts          # New: Display contact helper
    └── App.tsx               # Modified: Dynamic route
```

---

## 4. API Interface Design

### 4.1 Get Emails by Folder

```
GET /api/emails?folder={inbox|sent|trash}&page={n}&limit={n}
```

**Response**: Same as existing `EmailsResponse`, filtered by folder.

### 4.2 Move to Trash (Soft Delete)

```
PATCH /api/emails/:id
Content-Type: application/json

{
  "folder": "trash"
}
```

**Response**: Updated email object.

### 4.3 Restore from Trash

```
PATCH /api/emails/:id
Content-Type: application/json

{
  "action": "restore"
}
```

**Behavior**: Backend determines target folder based on `email.direction`:
- `direction === 'outgoing'` → restored to `sent`
- `direction === 'incoming'` → restored to `inbox`

**Response**: Updated email object with new folder.

**Rationale**: Prevents cognitive confusion where deleted sent emails would incorrectly appear in inbox. No `previous_folder` field needed — keeps data model minimal.

### 4.4 Permanent Delete

```
DELETE /api/emails/:id
```

**Behavior**:
1. Delete email record from database
2. Cascade delete attachments (via FK)
3. Delete attachment files from filesystem

**Response**:
```json
{
  "success": true,
  "deletedId": 123
}
```

### 4.5 Get Single Email (Updated)

```
GET /api/emails/:id
```

**Response**: Includes new fields `folder`, `direction`, `from`, `to`, `cc`, `bcc`, `is_read`, `is_starred`.

### 4.6 Get Folder Statistics

```
GET /api/emails/stats
```

**Response**:
```json
{
  "inbox": { "total": 42, "unread": 5 },
  "sent": { "total": 15, "unread": 0 },
  "trash": { "total": 3, "unread": 1 },
  "draft": { "total": 0, "unread": 0 },
  "archive": { "total": 0, "unread": 0 }
}
```

**Purpose**: Provides folder statistics for navigation badges. Called by `useFolderStats` hook to display unread/total counts in sidebar.

### 4.7 Batch Delete Emails

```
POST /api/emails/batch-delete
Content-Type: application/json

{
  "ids": [1, 2, 3]
}
```

**Behavior**:
1. Validate ids array is not empty
2. Fetch all emails with their attachments
3. Delete email records from database (cascade to attachments)
4. Delete attachment files from filesystem

**Response**:
```json
{
  "success": true,
  "deletedCount": 3
}
```

**Purpose**: Enables efficient Trash cleanup when user selects multiple emails for deletion.

---

## 5. Implementation Steps

### Phase 1: Shared Schema Updates

**File**: `packages/shared/src/schemas/email.ts`

**Action**: Add new schema definitions for folder, direction, and contact types.

**Dependencies**: None

**Risk**: Low

**Changes**:

```typescript
// New enums
export const EmailFolderSchema = z.enum(['inbox', 'sent', 'trash', 'draft', 'archive'])
export type EmailFolder = z.infer<typeof EmailFolderSchema>

export const EmailDirectionSchema = z.enum(['incoming', 'outgoing'])
export type EmailDirection = z.infer<typeof EmailDirectionSchema>

// Contact schema
export const EmailContactSchema = z.object({
  name: z.string().nullable(),
  email: z.string()
})

export const EmailContactListSchema = z.array(EmailContactSchema)

// Update EmailSchema
export const EmailSchema = z.object({
  id: z.number().int().positive(),
  subject: z.string().max(500).nullable(),

  // Deprecated but kept for migration
  sender: z.string().max(255).nullable(),

  // New contact fields
  from: EmailContactSchema.nullable(),
  to: EmailContactListSchema.nullable(),
  cc: EmailContactListSchema.nullable(),
  bcc: EmailContactListSchema.nullable(),

  // New classification fields
  folder: EmailFolderSchema,
  direction: EmailDirectionSchema,
  is_read: z.boolean(),
  is_starred: z.boolean(),

  // Trash timestamp - null when not in trash
  trashed_at: z.coerce.date().nullable(),

  // Existing fields
  snippet: z.string().max(200).nullable(),
  bodyText: z.string().nullable(),
  hasAttachments: z.boolean(),
  date: z.coerce.date(),
  isProcessed: z.boolean(),
  classification: EmailClassificationSchema,
  summary: z.string().max(500).nullable()
})
```

---

### Phase 2: Backend Entity Updates

**File**: `packages/backend/src/entities/Email.entity.ts`

**Action**: Add new columns to Email entity.

**Dependencies**: Phase 1

**Risk**: Medium (schema migration)

**Changes**:

1. Add `EmailFolder` and `EmailDirection` type exports
2. Add `EmailContact` interface
3. Add new columns with defaults
4. Add indices for `folder` and `direction`
5. Add `trashed_at` column for auto-vacuum (records when email was moved to trash)

```typescript
@Index(['folder'])
@Index(['direction'])
@Index(['folder', 'trashed_at'])  // For auto-vacuum queries
export class Email {
  // ... existing columns ...

  @Column({
    type: 'varchar',
    length: 20,
    default: 'inbox'
  })
  folder: EmailFolder = 'inbox'

  @Column({
    type: 'varchar',
    length: 10,
    default: 'incoming'
  })
  direction: EmailDirection = 'incoming'

  @Column({ type: 'simple-json', nullable: true })
  from: EmailContact | null = null

  @Column({ type: 'simple-json', nullable: true })
  to: EmailContactList | null = null

  @Column({ type: 'simple-json', nullable: true })
  cc: EmailContactList | null = null

  @Column({ type: 'simple-json', nullable: true })
  bcc: EmailContactList | null = null

  @Column({ type: 'boolean', default: false })
  is_read: boolean = false

  @Column({ type: 'boolean', default: false })
  is_starred: boolean = false

  // Trash timestamp - set when moved to trash, cleared when restored
  @Column({ type: 'datetime', nullable: true })
  trashed_at!: Date | null

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date
}
```

---

### Phase 3: Attachment Entity

**File**: `packages/backend/src/entities/Attachment.entity.ts`

**Action**: Create new Attachment entity with cascade delete.

**Dependencies**: Phase 2

**Risk**: Low

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation
} from 'typeorm'
import { Email } from './Email.entity'

@Entity('attachments')
@Index(['emailId'])
export class Attachment {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'integer' })
  emailId!: number

  @ManyToOne(() => Email, (email) => email.attachments, {
    onDelete: 'CASCADE'  // Auto-delete when email is deleted
  })
  @JoinColumn({ name: 'emailId' })  // Must be explicit for FK constraint
  email!: Relation<Email>

  @Column({ type: 'varchar', length: 255 })
  filename!: string

  @Column({ type: 'varchar', length: 500 })
  originalFilename!: string

  @Column({ type: 'varchar', length: 100 })
  mimeType!: string

  @Column({ type: 'integer' })
  size!: number

  @Column({ type: 'varchar', length: 500 })
  localPath!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  contentId!: string | null

  @Column({ type: 'boolean', default: false })
  isInline!: boolean
}
```

---

### Phase 4: Database Configuration Update

**File**: `packages/backend/src/config/database.ts`

**Action**: Register Attachment entity, update database version, and enable SQLite foreign keys.

**Dependencies**: Phase 3

**Risk**: Low

**Changes**:

1. Enable SQLite foreign key constraints (required for CASCADE delete to work)
2. Register Attachment entity

```typescript
import { Attachment } from '../entities/Attachment.entity'

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.resolve(__dirname, '../../data/database.sqlite'),
  entities: [Settings, Email, Todo, Label, Attachment],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
  // Recommended: Use driver-level pragmas for reliable foreign key enforcement
  // This ensures FK constraints work correctly across connection lifecycle
  // including reconnects and multiple connections
  driver: require('sqlite3'),
  flags: 0,
  pragmas: {
    foreign_keys: 'ON'
  }
})

// Note: The old prepareDatabase approach is deprecated because it only runs once
// at connection time and may not persist across reconnections:
// prepareDatabase: (db: any) => { db.run('PRAGMA foreign_keys = ON') }
```

---

### Phase 5: Email Routes Update

**File**: `packages/backend/src/routes/email.routes.ts`

**Action**: Add folder filtering, PATCH endpoint, and DELETE endpoint.

**Dependencies**: Phase 2

**Risk**: Medium

**Changes**:

1. **Update EmailsQuery interface**:
```typescript
export interface EmailsQuery extends PaginationQuery {
  processed?: boolean
  classification?: EmailClassification
  folder?: EmailFolder  // NEW
}
```

2. **Update GET / endpoint** to filter by folder:
```typescript
router.get('/', async (req, res, next) => {
  const folder = req.query.folder as EmailFolder | undefined

  const where: Record<string, unknown> = {}
  if (folder) {
    where.folder = folder
  }
  // ... rest of logic
})
```

3. **Add PATCH /:id endpoint** (with state machine for `trashed_at` and smart restore):
```typescript
router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const { folder, action } = req.body

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid email ID' })
      return
    }

    const email = await emailRepository.findOne({ where: { id } })
    if (!email) {
      res.status(404).json({ error: 'Email not found' })
      return
    }

    // Handle restore action (smart restore based on direction)
    if (action === 'restore' && email.folder === 'trash') {
      email.folder = email.direction === 'outgoing' ? 'sent' : 'inbox'
      email.trashed_at = null
      await emailRepository.save(email)
      res.json(email)
      return
    }

    // Handle explicit folder change with state machine for trashed_at
    if (folder && ['inbox', 'sent', 'trash', 'draft', 'archive'].includes(folder)) {
      const oldFolder = email.folder

      // State machine: manage trashed_at timestamp
      if (folder === 'trash' && oldFolder !== 'trash') {
        // Moving to trash: set trashed_at
        email.trashed_at = new Date()
      } else if (folder !== 'trash' && oldFolder === 'trash') {
        // Moving out of trash: clear trashed_at
        email.trashed_at = null
      }
      // else: folder change not involving trash, keep trashed_at as is

      email.folder = folder
      await emailRepository.save(email)
    }

    res.json(email)
  } catch (error) {
    next(error)
  }
})
```

5. **Add GET /stats endpoint** (folder statistics for navigation badges):
```typescript
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await emailRepository
      .createQueryBuilder('email')
      .select('email.folder', 'folder')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN email.is_read = 0 THEN 1 ELSE 0 END)', 'unread')
      .groupBy('email.folder')
      .getRawMany()

    // Transform to Record<EmailFolder, { total, unread }>
    const result: Record<EmailFolder, { total: number; unread: number }> = {
      inbox: { total: 0, unread: 0 },
      sent: { total: 0, unread: 0 },
      trash: { total: 0, unread: 0 },
      draft: { total: 0, unread: 0 },
      archive: { total: 0, unread: 0 }
    }

    for (const row of stats) {
      if (row.folder in result) {
        result[row.folder as EmailFolder] = {
          total: parseInt(row.total),
          unread: parseInt(row.unread)
        }
      }
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})
```

6. **Add DELETE /:id endpoint** (secure deletion order: DB first, then files):
```typescript
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid email ID' })
      return
    }

    const email = await emailRepository.findOne({
      where: { id },
      relations: ['attachments']
    })

    if (!email) {
      res.status(404).json({ error: 'Email not found' })
      return
    }

    // Store attachment paths before DB deletion
    const attachmentPaths = email.attachments?.map(a => a.localPath) ?? []

    // Step 1: Delete email from database (cascade deletes attachments via FK)
    await emailRepository.remove(email)

    // Step 2: Delete attachment files from filesystem AFTER successful DB deletion
    // This ensures we don't orphan files if DB deletion fails
    for (const localPath of attachmentPaths) {
      try {
        const filePath = path.resolve(localPath)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (fileError) {
        // Log error but don't fail the request - DB record is already gone
        log.warn({ err: fileError, path: localPath }, 'Failed to delete attachment file')
      }
    }

    res.json({ success: true, deletedId: id })
  } catch (error) {
    next(error)
  }
})

7. **Add POST /batch-delete endpoint** (for batch operations):
```typescript
router.post('/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Invalid or empty ids array' })
      return
    }

    // Fetch emails with their attachments
    const emails = await emailRepository.find({
      where: { id: In(ids) },
      relations: ['attachments']
    })

    if (emails.length === 0) {
      res.json({ success: true, deletedCount: 0 })
      return
    }

    // Store attachment paths before DB deletion
    const attachmentPaths = emails.flatMap(e => e.attachments?.map(a => a.localPath) ?? [])

    // Step 1: Delete emails from database (cascade deletes attachments via FK)
    await emailRepository.remove(emails)

    // Step 2: Delete attachment files from filesystem AFTER successful DB deletion
    for (const localPath of attachmentPaths) {
      try {
        const filePath = path.resolve(localPath)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (fileError) {
        log.warn({ err: fileError, path: localPath }, 'Failed to delete attachment file')
      }
    }

    res.json({ success: true, deletedCount: emails.length })
  } catch (error) {
    next(error)
  }
})
```

---

### Phase 6: Auto-Vacuum Service

**File**: `packages/backend/src/services/AutoVacuumService.ts`

**Action**: Create service for automatic cleanup of old trashed emails.

**Dependencies**: Phase 2

**Risk**: Low

```typescript
import type { DataSource, Repository } from 'typeorm'
import { Email } from '../entities/Email.entity'
import { createLogger, type Logger } from '../config/logger.js'
import * as fs from 'fs'
import * as path from 'path'

export class AutoVacuumService {
  private readonly log: Logger
  private emailRepository: Repository<Email>
  private timer: NodeJS.Timeout | null = null
  private readonly TRASH_RETENTION_DAYS = 30
  private readonly CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000  // 24 hours
  private readonly STARTUP_DELAY_MS = 30 * 1000  // 30 seconds

  constructor(dataSource: DataSource) {
    this.emailRepository = dataSource.getRepository(Email)
    this.log = createLogger('AutoVacuumService')
  }

  /**
   * Start auto-vacuum service
   * - Delay 30 seconds after app start
   * - Run every 24 hours
   *
   * Uses recursive setTimeout instead of setInterval to prevent:
   * - Overlapping executions when cleanup takes longer than interval
   * - Memory leaks from queued callbacks
   * - Potential database deadlocks
   */
  start(): void {
    const scheduleNext = () => {
      this.timer = setTimeout(async () => {
        await this.runCleanup()
        scheduleNext()  // Schedule next run AFTER current completes
      }, this.CLEANUP_INTERVAL_MS)
    }

    // Initial delay, then start the recursive loop
    setTimeout(() => {
      this.runCleanup()
      scheduleNext()
    }, this.STARTUP_DELAY_MS)

    this.log.info('Auto-vacuum service scheduled')
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private async runCleanup(): Promise<void> {
    this.log.info('Starting auto-vacuum cleanup')

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.TRASH_RETENTION_DAYS)

      // Find old trashed emails using trashed_at timestamp
      const oldEmails = await this.emailRepository.find({
        where: {
          folder: 'trash',
          trashed_at: LessThan(cutoffDate)  // Use trashed_at for accurate trash duration
        },
        relations: ['attachments']
      })

      for (const email of oldEmails) {
        // Store attachment paths before DB deletion
        const attachmentPaths = email.attachments?.map(a => a.localPath) ?? []

        // Step 1: Delete email from database (cascade to attachments)
        await this.emailRepository.remove(email)

        // Step 2: Delete attachment files after successful DB deletion
        for (const localPath of attachmentPaths) {
          try {
            if (fs.existsSync(localPath)) {
              fs.unlinkSync(localPath)
            }
          } catch (fileError) {
            this.log.warn({ err: fileError, path: localPath },
              'Failed to delete attachment file')
          }
        }
      }

      this.log.info({ count: oldEmails.length }, 'Auto-vacuum completed')
    } catch (error) {
      this.log.error({ err: error }, 'Auto-vacuum failed')
    }
  }
}
```

---

### Phase 7: Frontend Service Updates

**File**: `packages/frontend/src/services/email.service.ts`

**Action**: Add folder parameter and delete/restore methods.

**Dependencies**: Phase 5

**Risk**: Low

```typescript
import type { EmailFolder } from '@nanomail/shared'

export interface EmailsQuery {
  page?: number
  limit?: number
  processed?: boolean
  classification?: EmailClassification
  folder?: EmailFolder  // NEW
}

export const EmailService = {
  // Modified: Add folder parameter
  async getEmails(query: EmailsQuery = {}): Promise<EmailsResponse> {
    const { page = 1, limit = 10, processed, classification, folder } = query

    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))

    if (processed !== undefined) {
      params.set('processed', String(processed))
    }
    if (classification) {
      params.set('classification', classification)
    }
    if (folder) {
      params.set('folder', folder)
    }

    const response = await fetch(`/api/emails?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch emails')
    }
    return response.json()
  },

  // NEW: Get folder statistics for navigation badges
  async getFolderStats(): Promise<Record<EmailFolder, { total: number; unread: number }>> {
    const response = await fetch('/api/emails/stats')
    if (!response.ok) {
      throw new Error('Failed to fetch folder stats')
    }
    return response.json()
  },

  // NEW: Move email to folder (trash/inbox/sent)
  async moveEmail(id: number, folder: EmailFolder): Promise<EmailDetail> {
    const response = await fetch(`/api/emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder })
    })
    if (!response.ok) {
      throw new Error('Failed to move email')
    }
    return response.json()
  },

  // NEW: Restore email from trash (smart restore based on direction)
  async restoreEmail(id: number): Promise<EmailDetail> {
    const response = await fetch(`/api/emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore' })
    })
    if (!response.ok) {
      throw new Error('Failed to restore email')
    }
    return response.json()
  },

  // NEW: Permanently delete email
  async deleteEmail(id: number): Promise<{ success: boolean; deletedId: number }> {
    const response = await fetch(`/api/emails/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error('Failed to delete email')
    }
    return response.json()
  },

  // NEW: Batch delete multiple emails (for Trash cleanup)
  async batchDeleteEmails(ids: number[]): Promise<{ success: boolean; deletedCount: number }> {
    const response = await fetch('/api/emails/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
    if (!response.ok) {
      throw new Error('Failed to delete emails')
    }
    return response.json()
  }
}
```

---

### Phase 8: Frontend Hooks

**File**: `packages/frontend/src/hooks/useEmailMutations.ts`

**Action**: Create React Query mutations for delete/restore with proper optimistic updates.

**Dependencies**: Phase 7

**Risk**: Low

**Key Design Decisions**:

1. **Pass entity context, not just IDs**: Mutation callers must pass the full `email` object, enabling optimistic updates without fragile cache traversal.

2. **Precise query key matching**: Use exact query key `{ queryKey: ['emails', { folder }] }` for source folder updates instead of broad `['emails']` matching.

3. **Optimistic list removal**: Remove email from source folder list immediately to prevent "ghost" emails appearing.

4. **Folder stats update**: Use passed email object for stats updates, avoiding double-loop cache search.

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { EmailService } from '@/services'
import type { EmailFolder, Email } from '@nanomail/shared'

interface EmailsCache {
  emails: Email[]
  total: number
  page: number
  limit: number
}

interface FolderStats {
  total: number
  unread: number
}

export function useMoveEmailMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    // CRITICAL: Accept full email object, not just ID
    // This enables optimistic updates without fragile cache traversal
    mutationFn: ({ email, folder }: { email: Email; folder: EmailFolder }) =>
      EmailService.moveEmail(email.id, folder),
    onMutate: async ({ email, folder: newFolder }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['emails'] })
      await queryClient.cancelQueries({ queryKey: ['folderStats'] })

      // Snapshot previous values for rollback
      const previousQueries = queryClient.getQueriesData({ queryKey: ['emails'] })
      const previousStats = queryClient.getQueriesData({ queryKey: ['folderStats'] })

      // 1. Optimistic update: Remove email from SOURCE folder list
      // Use precise query key matching to target only the source folder
      queryClient.setQueriesData<EmailsCache>(
        { queryKey: ['emails', { folder: email.folder }] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            emails: old.emails.filter((e) => e.id !== email.id),
            total: old.total - 1
          }
        }
      )

      // 2. Optimistic update: Update folder statistics
      // Use passed email object directly - no cache traversal needed
      queryClient.setQueriesData<Record<EmailFolder, FolderStats>>(
        { queryKey: ['folderStats'] },
        (old) => {
          if (!old) return old
          const updated = { ...old }
          const sourceFolder = email.folder as EmailFolder

          // Decrement source folder
          if (updated[sourceFolder]) {
            updated[sourceFolder] = {
              ...updated[sourceFolder],
              total: Math.max(0, updated[sourceFolder].total - 1),
              unread: email.is_read
                ? updated[sourceFolder].unread
                : Math.max(0, updated[sourceFolder].unread - 1)
            }
          }

          // Increment destination folder
          if (updated[newFolder]) {
            updated[newFolder] = {
              ...updated[newFolder],
              total: updated[newFolder].total + 1,
              unread: email.is_read
                ? updated[newFolder].unread
                : updated[newFolder].unread + 1
            }
          }

          return updated
        }
      )

      return { previousQueries, previousStats }
    },
    onError: (error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousStats) {
        context.previousStats.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error('Failed to move email')
    },
    onSettled: () => {
      // Refetch all email queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      queryClient.invalidateQueries({ queryKey: ['folderStats'] })
    }
  })
}

export function useDeleteEmailMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    // Accept email object for consistent API pattern
    mutationFn: ({ email }: { email: Email }) => EmailService.deleteEmail(email.id),
    onMutate: async ({ email }) => {
      await queryClient.cancelQueries({ queryKey: ['emails'] })
      await queryClient.cancelQueries({ queryKey: ['folderStats'] })

      const previousQueries = queryClient.getQueriesData({ queryKey: ['emails'] })
      const previousStats = queryClient.getQueriesData({ queryKey: ['folderStats'] })

      // Remove from current folder list
      queryClient.setQueriesData<EmailsCache>(
        { queryKey: ['emails', { folder: email.folder }] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            emails: old.emails.filter((e) => e.id !== email.id),
            total: old.total - 1
          }
        }
      )

      // Update folder stats
      queryClient.setQueriesData<Record<EmailFolder, FolderStats>>(
        { queryKey: ['folderStats'] },
        (old) => {
          if (!old) return old
          const sourceFolder = email.folder as EmailFolder
          if (!old[sourceFolder]) return old
          return {
            ...old,
            [sourceFolder]: {
              ...old[sourceFolder],
              total: Math.max(0, old[sourceFolder].total - 1),
              unread: email.is_read
                ? old[sourceFolder].unread
                : Math.max(0, old[sourceFolder].unread - 1)
            }
          }
        }
      )

      return { previousQueries, previousStats }
    },
    onError: (error, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousStats) {
        context.previousStats.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error('Failed to delete email')
    },
    onSuccess: () => {
      toast.success('Email permanently deleted')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      queryClient.invalidateQueries({ queryKey: ['folderStats'] })
    }
  })
}

/**
 * Batch delete mutation for bulk operations
 * Supports selecting multiple emails in Trash for cleanup
 */
export function useBatchDeleteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ emails }: { emails: Email[] }) =>
      Promise.all(emails.map(e => EmailService.deleteEmail(e.id))),
    onMutate: async ({ emails }) => {
      await queryClient.cancelQueries({ queryKey: ['emails'] })
      await queryClient.cancelQueries({ queryKey: ['folderStats'] })

      const previousQueries = queryClient.getQueriesData({ queryKey: ['emails'] })
      const previousStats = queryClient.getQueriesData({ queryKey: ['folderStats'] })

      const idsToDelete = new Set(emails.map(e => e.id))
      const folder = emails[0]?.folder as EmailFolder
      const unreadCount = emails.filter(e => !e.is_read).length

      // Remove all selected emails from list
      queryClient.setQueriesData<EmailsCache>(
        { queryKey: ['emails', { folder }] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            emails: old.emails.filter((e) => !idsToDelete.has(e.id)),
            total: Math.max(0, old.total - emails.length)
          }
        }
      )

      // Update folder stats
      queryClient.setQueriesData<Record<EmailFolder, FolderStats>>(
        { queryKey: ['folderStats'] },
        (old) => {
          if (!old || !folder) return old
          return {
            ...old,
            [folder]: {
              ...old[folder],
              total: Math.max(0, old[folder].total - emails.length),
              unread: Math.max(0, old[folder].unread - unreadCount)
            }
          }
        }
      )

      return { previousQueries, previousStats }
    },
    onError: (error, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousStats) {
        context.previousStats.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error('Failed to delete emails')
    },
    onSuccess: (_, { emails }) => {
      toast.success(`${emails.length} emails permanently deleted`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      queryClient.invalidateQueries({ queryKey: ['folderStats'] })
    }
  })
}
```

---

### Phase 9: Frontend Navigation Update

**File**: `packages/frontend/src/components/layout/MainLayout.tsx`

**Action**: Replace collapsible navigation with flat, high-information-density layout.

**Dependencies**: None

**Risk**: Low

**Design Decision**: For only 3 core folders (Inbox, Sent, Trash), a collapsible navigation adds unnecessary click overhead and reduces information visibility. Use flat navigation with direct badges for better UX.

**Badge Display Rules** (based on information density and cognitive load):

| Folder | Badge Content | Rationale |
|--------|---------------|-----------|
| Inbox | `unread` only (highlighted badge) | Users care about unread count; total is irrelevant noise |
| Sent | `total` only (on hover) | "Unread sent" is nonsensical; creates digital anxiety |
| Trash | `total` only (on hover) | Unread in trash is visual noise; user wants to empty it |

```typescript
import { Inbox, Send, Trash2, CheckSquare, Settings } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

interface FolderNavItemProps {
  icon: React.ReactNode
  label: string
  path: string
  badge?: { count: number; variant: 'primary' | 'muted' }
}

function FolderNavItem({ icon, label, path, badge }: FolderNavItemProps) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-accent text-accent-foreground font-medium'
        )
      }
    >
      {icon}
      <span className="text-sm flex-1">{label}</span>
      {badge && badge.count > 0 && (
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full',
          badge.variant === 'primary'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground'
        )}>
          {badge.count}
        </span>
      )}
    </NavLink>
  )
}

function MailNavigation({ expanded }: { expanded: boolean }) {
  // Fetch folder statistics for badges
  const { data: folderStats } = useQuery({
    queryKey: ['folderStats'],
    queryFn: () => EmailService.getFolderStats()
  })

  // Badge rules based on folder type:
  // - Inbox: Show unread count with primary styling (actionable)
  // - Sent/Trash: Show total count with muted styling (informational only)
  // - Never show unread for Sent/Trash (reduces cognitive noise)
  const folders = [
    {
      icon: <Inbox className="h-4 w-4" />,
      label: 'Inbox',
      path: '/mail/inbox',
      // Inbox: Show UNREAD count (primary) - users care about action items
      badge: folderStats?.inbox?.unread
        ? { count: folderStats.inbox.unread, variant: 'primary' as const }
        : undefined
    },
    {
      icon: <Send className="h-4 w-4" />,
      label: 'Sent',
      path: '/mail/sent',
      // Sent: Show TOTAL count (muted) - unread is meaningless here
      badge: folderStats?.sent?.total
        ? { count: folderStats.sent.total, variant: 'muted' as const }
        : undefined
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: 'Trash',
      path: '/mail/trash',
      // Trash: Show TOTAL count (muted) - helps user know when to empty
      badge: folderStats?.trash?.total
        ? { count: folderStats.trash.total, variant: 'muted' as const }
        : undefined
    }
  ]

  if (!expanded) {
    // Collapsed sidebar: show only icons with badge counts
    return (
      <div className="space-y-1">
        {folders.map((folder) => (
          <NavLink
            key={folder.path}
            to={folder.path}
            className={({ isActive }) =>
              cn(
                'relative flex items-center justify-center p-2 rounded-md transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground'
              )
            }
          >
            {folder.icon}
            {folder.badge && folder.badge.count > 0 && (
              <span className={cn(
                'absolute -top-1 -right-1 text-[10px] min-w-[16px] h-4 flex items-center justify-center rounded-full',
                folder.badge.variant === 'primary'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}>
                {folder.badge.count > 99 ? '99+' : folder.badge.count}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    )
  }

  // Expanded sidebar: flat navigation with badges
  return (
    <div className="space-y-1">
      {folders.map((folder) => (
        <FolderNavItem key={folder.path} {...folder} />
      ))}
    </div>
  )
}
```

---

### Phase 10: Mail Page with Dynamic Folder

**File**: `packages/frontend/src/pages/MailPage.tsx`

**Action**: Create unified mail page with folder routing and Trash-specific auto-vacuum notice.

**Dependencies**: Phase 7, Phase 8, Phase 9

**Risk**: High (major refactor)

```typescript
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { EmailService } from '@/services'
import type { EmailFolder } from '@nanomail/shared'

const FOLDER_TITLES: Record<EmailFolder, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  trash: 'Trash',
  draft: 'Draft',
  archive: 'Archive'
}

function TrashAutoVacuumNotice() {
  return (
    <div className="px-6 py-2 bg-muted/50 border-b border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-3 w-3" />
        <span>Messages that have been in Trash more than 30 days will be automatically deleted.</span>
      </div>
    </div>
  )
}

export function MailPage() {
  const { folder = 'inbox' } = useParams<{ folder?: string }>()
  const validFolder = ['inbox', 'sent', 'trash'].includes(folder) ? folder as EmailFolder : 'inbox'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['emails', 1, 10, validFolder],
    queryFn: () => EmailService.getEmails({ folder: validFolder, page: 1, limit: 10 })
  })

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-4">
        <h1 className="text-2xl font-bold">{FOLDER_TITLES[validFolder]}</h1>
      </div>

      {/* Auto-vacuum notice for Trash folder */}
      {validFolder === 'trash' && <TrashAutoVacuumNotice />}

      {/* Split pane with list and detail */}
      <div className="flex-1 flex min-h-0">
        <div className="w-[350px] border-r border-gray-200 overflow-y-auto">
          {/* MailList component */}
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto bg-white">
          {/* MailDetailPanel component */}
        </div>
      </div>
    </div>
  )
}
```

---

### Phase 11: Delete Confirmation Dialog

**File**: `packages/frontend/src/components/DeleteConfirmDialog.tsx`

**Action**: Create confirmation dialog for permanent delete.

**Dependencies**: None

**Risk**: Low

```typescript
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  emailSubject?: string | null
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  emailSubject
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The email
            {emailSubject && ` "${emailSubject}"`}
            will be permanently deleted from your device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

### Phase 12: Route Configuration

**File**: `packages/frontend/src/App.tsx`

**Action**: Add dynamic mail route.

**Dependencies**: Phase 10

**Risk**: Low

```typescript
<Route path="/" element={<MainLayout />}>
  <Route index element={<Navigate to="/mail/inbox" replace />} />
  <Route path="mail/:folder" element={<MailPage />} />
  <Route path="mail/:folder/:emailId" element={<MailPage />} />
  <Route path="todos" element={<TodosPage />} />
  <Route path="settings" element={<SettingsPage />} />
</Route>
```

---

### Phase 13: Seed Data for Testing

**File**: `packages/backend/src/scripts/seedSentEmails.ts`

**Action**: Create seed script for testing sent emails.

**Dependencies**: Phase 2

**Risk**: Low

```typescript
import { AppDataSource } from '../config/database'
import { Email } from '../entities/Email.entity'

async function seedSentEmails() {
  await AppDataSource.initialize()
  const repo = AppDataSource.getRepository(Email)

  const sentEmails = [
    {
      subject: 'Project Update - Q1 Progress',
      direction: 'outgoing',
      folder: 'sent',
      from: { name: 'Me', email: 'me@example.com' },
      to: [{ name: 'John Doe', email: 'john@example.com' }],
      snippet: 'Here is the quarterly update on our project progress...',
      bodyText: 'Hi John,\n\nHere is the quarterly update on our project progress...',
      date: new Date('2026-03-14'),
      hasAttachments: false,
      is_read: true,
      classification: 'IMPORTANT'
    },
    // ... more test emails
  ]

  for (const email of sentEmails) {
    const entity = repo.create(email)
    await repo.save(entity)
  }

  console.log(`Seeded ${sentEmails.length} sent emails`)
  await AppDataSource.destroy()
}

seedSentEmails()
```

---

## 6. Dependencies Between Phases

```
Phase 1 (Shared Schema) ─────────────────────────────────────────────┐
                                                                      │
Phase 2 (Backend Entity) ◄────────────────────────────────────────────┤
        │                                                             │
        ├──► Phase 3 (Attachment Entity) ──► Phase 4 (Database)      │
        │                                              │               │
        └──► Phase 5 (Email Routes) ◄─────────────────┘               │
                        │                                              │
                        └──► Phase 7 (Frontend Service) ◄─────────────┤
                                      │                               │
                                      ├──► Phase 8 (Hooks)            │
                                      │         │                     │
                                      │         └────┐                │
                                      │              │                │
                        Phase 9 (Navigation) ◄──────┤                │
                                      │              │                │
                                      └──► Phase 10 (Mail Page) ◄────┤
                                                    │                │
                                                    └──► Phase 12 (Routes)
                                                                      │
Phase 6 (Auto-Vacuum) ◄──────────────────────────────────────────────┤
                                                                      │
Phase 11 (Delete Dialog) ◄───────────────────────────────────────────┤
                                                                      │
Phase 13 (Seed Data) ◄───────────────────────────────────────────────┘
```

---

## 7. Risk Assessment

| Risk | Level | Impact | Mitigation |
|------|-------|--------|------------|
| Migration data loss | Medium | Data integrity | Drop/recreate is acceptable for local-first; document backup procedure |
| Cascade delete fails (FK not working) | Medium | Orphaned attachments | Ensure SQLite `PRAGMA foreign_keys = ON`; test cascade behavior |
| File deletion after DB failure | Medium | Disk space leak | Delete DB record first, then files; log file deletion errors |
| Frontend route conflicts | Low | UX | Test all navigation paths; add fallback routes |
| Auto-vacuum performance | Low | Performance | Run during idle time; batch processing |
| Ghost emails in list (optimistic update bug) | Medium | UX | Filter email from source folder list on move; implement rollback |
| Contact field JSON parsing | Low | Data integrity | Validate at API boundary; fallback to sender field |
| `trashed_at` state machine errors | Medium | Data integrity | Test all folder transition scenarios; add validation in PATCH |
| Smart restore confusion | Low | UX | Test outgoing->sent, incoming->inbox paths; clear UI feedback |
| Folder stats cache inconsistency | Low | UX | Invalidate on mutation; use optimistic updates |

---

## 8. Testing Strategy

### Unit Tests

| Component | Test Focus |
|-----------|------------|
| EmailSchema | Folder/direction validation, contact JSON parsing, `trashed_at` nullable |
| EmailService.moveEmail | API call, error handling |
| EmailService.restoreEmail | Smart restore API call with `action: 'restore'` |
| EmailService.deleteEmail | API call, error handling |
| EmailService.batchDeleteEmails | Batch API call, error handling |
| useMoveEmailMutation | Accepts email object, optimistic update with precise query key, updates folder stats, rollback on error |
| useDeleteEmailMutation | Accepts email object, optimistic removal, updates folder stats, rollback on error |
| useBatchDeleteMutation | Handles multiple emails, updates counts correctly |
| getDisplayContact | Direction-based contact derivation, `allRecipients` for tooltip |
| PATCH /:id `trashed_at` logic | State machine: trash->set timestamp, restore->clear timestamp |
| Smart restore logic | `action: 'restore'` routes incoming->inbox, outgoing->sent |

### Integration Tests

| Scenario | Test Focus |
|----------|------------|
| GET /api/emails?folder=sent | Returns only sent emails |
| PATCH /api/emails/:id to trash | Sets `trashed_at` timestamp |
| PATCH /api/emails/:id action=restore | Restores to inbox (incoming) or sent (outgoing), clears `trashed_at` |
| DELETE /api/emails/:id | Removes DB record first, then attachment files |
| DELETE cascade | Attachments deleted via FK when email removed |
| POST /api/emails/batch-delete | Deletes multiple emails and their attachments |
| Auto-vacuum service | Uses `trashed_at` for cutoff, not `updated_at` |
| Mail page navigation | Correct folder display |
| Folder stats API | Returns total/unread counts per folder |

### E2E Tests

| Flow | Steps |
|------|-------|
| Delete email | Click delete -> verify in Trash -> restore -> verify in correct folder (inbox/sent) |
| Smart restore | Delete sent email -> restore -> verify in Sent folder (not Inbox) |
| Ghost email check | Delete email -> verify NOT visible in original folder (no ghost) |
| Permanent delete | Click delete in Trash -> confirm dialog -> verify gone |
| Batch delete | Select multiple emails in Trash -> batch delete -> verify all removed |
| Navigate folders | Inbox -> Sent -> Trash -> verify correct emails |
| `trashed_at` persistence | Move to Trash -> verify `trashed_at` set -> restore -> verify cleared |
| Folder stats update | Delete email -> verify folder badge decrements -> restore -> verify increments |
| Badge display rules | Verify Inbox shows unread only, Sent/Trash show total only |

---

## 9. Work Estimate

| Phase | Content | Complexity | Time |
|-------|---------|------------|------|
| Phase 1 | Shared schema updates | Low | 0.5h |
| Phase 2 | Backend entity updates | Medium | 1h |
| Phase 3 | Attachment entity | Low | 0.5h |
| Phase 4 | Database configuration | Low | 0.25h |
| Phase 5 | Email routes update (including batch-delete) | Medium | 1.5h |
| Phase 6 | Auto-vacuum service | Medium | 1h |
| Phase 7 | Frontend service updates | Low | 0.5h |
| Phase 8 | Frontend hooks (including batch mutations) | Medium | 1h |
| Phase 9 | Navigation update | Medium | 1h |
| Phase 10 | Mail page | High | 2h |
| Phase 11 | Delete dialog | Low | 0.5h |
| Phase 12 | Route configuration | Low | 0.25h |
| Phase 13 | Seed data | Low | 0.5h |
| Phase 14 | Tests | Medium | 2h |
| **Total** | | | **13h** |

---

## 10. Acceptance Criteria

### Backend

- [ ] Email entity has `folder`, `direction`, `from`, `to`, `cc`, `bcc`, `is_read`, `is_starred`, `trashed_at`, `updated_at` fields
- [ ] `trashed_at` is set to current timestamp when email is moved to Trash, cleared when moved out of Trash
- [ ] Attachment entity exists with CASCADE delete and explicit `@JoinColumn({ name: 'emailId' })`
- [ ] SQLite foreign keys enabled via `pragmas: { foreign_keys: 'ON' }` in DataSource config
- [ ] GET /api/emails supports `folder` query parameter
- [ ] PATCH /api/emails/:id supports `action: 'restore'` - restores to inbox/sent based on `direction`
- [ ] PATCH /api/emails/:id updates folder with state machine logic for `trashed_at`
- [ ] DELETE /api/emails/:id removes DB record first, then deletes attachment files (secure order)
- [ ] POST /api/emails/batch-delete handles multiple email deletion
- [ ] GET /api/emails/stats returns folder statistics (total/unread counts)
- [ ] Auto-vacuum uses `trashed_at` for cleanup queries, not `updated_at`
- [ ] Auto-vacuum uses recursive setTimeout pattern (not setInterval) for reliable scheduling

### Frontend

- [ ] Navigation shows flat folder list (Inbox, Sent, Trash) with context-appropriate badges
- [ ] Inbox badge shows unread count only (primary styling)
- [ ] Sent/Trash badges show total count only (muted styling), no unread
- [ ] MailPage displays emails filtered by folder
- [ ] Trash page shows auto-vacuum notice at header
- [ ] Delete from list moves email to Trash (no confirmation)
- [ ] Delete from Trash shows confirmation dialog, then permanently deletes
- [ ] Restore button in Trash uses `action: 'restore'` API, backend determines target folder by `direction`
- [ ] Display contact shows sender for incoming, first recipient (with tooltip for multiple) for outgoing
- [ ] `useMoveEmailMutation` accepts email object, uses precise query key matching, updates folder stats
- [ ] `useDeleteEmailMutation` accepts email object, updates folder stats on deletion
- [ ] `useBatchDeleteMutation` handles multiple email selection and deletion
- [ ] Optimistic updates include rollback on error

### Tests

- [ ] All unit tests pass
- [ ] Integration tests cover delete/restore flows
- [ ] Integration tests cover batch-delete endpoint
- [ ] Test `trashed_at` state machine logic (set on trash, clear on restore)
- [ ] Test smart restore: incoming email restores to inbox, outgoing to sent
- [ ] Test cascade delete of attachments
- [ ] Test folder stats API returns correct counts
- [ ] Test recursive setTimeout pattern in AutoVacuumService
- [ ] Test SQLite foreign key pragmas configuration
- [ ] 80%+ coverage on new code

---

## 11. Future Work (Out of Scope)

1. **Draft functionality**: Compose and save drafts locally
2. **Archive functionality**: Move emails to archive
3. **Email sending**: SMTP integration for outgoing emails
4. **Star/Flag**: Implement is_starred functionality
5. **Custom folders**: User-defined folder creation

### Known Technical Debt

**JSON Contact Fields** (`from`, `to`, `cc`, `bcc`):
- Current implementation uses TypeORM `simple-json` for contact fields
- This provides flexibility for MVP but has limitations:
  - No indexing on email addresses
  - No efficient querying by sender/recipient
  - No referential integrity for contacts
- **Future migration path**: Introduce a `Contacts` table with proper indexing when features like "find all emails from sender X" are required
- Current JSON structure is acceptable for read-only display use cases

---

## 12. Critical Files for Implementation

| File | Description |
|------|-------------|
| `packages/shared/src/schemas/email.ts` | Core schema definitions - add folder, direction, contact schemas |
| `packages/backend/src/entities/Email.entity.ts` | Database entity - add new columns with indices |
| `packages/backend/src/routes/email.routes.ts` | API routes - add folder filter, PATCH, DELETE endpoints |
| `packages/frontend/src/components/layout/MainLayout.tsx` | Navigation - add collapsible Mail menu |
| `packages/frontend/src/pages/InboxPage.tsx` | Reference for MailPage refactor |
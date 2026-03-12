# Phase 2: Mail Ingestion & Sync Routing (Revised)

> **Context:** Connect the system to the outside world by syncing emails and providing the infrastructure to send them.

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 2 of 5 |
| **Focus Area** | IMAP email fetching, SMTP dispatch, REST API, Thread Context |
| **Total Tasks** | 6 subtasks across 4 task groups (includes Refactoring) |
| **Dependencies** | Phase 1 (Data Layer & Security) |
| **Estimated Effort** | 3-4 days (includes refactoring) |

---

## T4: Data Ingestion Engine (IMAP)

### Context

Retrieve raw emails, parse them with full conversation thread context, and store them reliably using UID-based synchronization.

### Dependencies
- **Requires**: T3 (Secure Vault Implementation) for encrypted IMAP credentials

### Tasks

#### T4.1: IMAP Client Integration & Connection Pooling

Integrate `imapflow` (mandatory for modern TLS/Promise support). Fetch IMAP credentials via `SettingsService`.

**Implementation Notes:**
```typescript
// Maintain a cached instance to prevent decrypting/reconnecting on every poll
let imapClientInstance: ImapFlow | null = null;

async function getImapClient() {
  if (imapClientInstance) return imapClientInstance;
  // Fetch and decrypt credentials ONLY when initializing
  // Return new ImapFlow instance
}
```

**Library Choice:**
- `imapflow`: Modern, Promise-based API with TLS support (**required**)

**Deliverables:**
- [x] IMAP client service created with connection pooling
- [x] Connection established using encrypted credentials
- [x] Error handling for connection failures
- [x] Instance caching to avoid repeated decryption

---

#### T4.2: MIME Parsing with Thread Context

Implement MIME parsing (mailparser) to extract text bodies and crucial thread headers.

**Implementation Notes:**
```typescript
import { simpleParser } from 'mailparser'

const parsed = await simpleParser(rawEmailSource)

// Extract relevant fields INCLUDING thread context
const emailData = {
  messageId: parsed.messageId,          // CRITICAL for threading
  inReplyTo: parsed.inReplyTo,          // CRITICAL for threading
  references: parsed.references || [],   // CRITICAL for threading
  subject: parsed.subject,
  from: parsed.from?.value[0]?.address, // Ensure clean email address extraction
  text: parsed.text,
  html: parsed.html,
  date: parsed.date,
  hasAttachments: parsed.attachments?.length > 0
}
```

**Thread Context Requirements:**
- Extract `Message-ID`, `In-Reply-To`, and `References` headers
- Store these fields for email threading/conversation grouping
- Handle missing headers gracefully

**Deliverables:**
- [x] Mailparser integration complete
- [x] Plain text extraction working
- [x] Thread context headers extracted (Message-ID, In-Reply-To, References)
- [x] Attachment detection (without storage)
- [x] Clean email address extraction from `from` field

---

#### T4.3: Robust Email Sync Background Worker

Create a polling job using IMAP UID for robust synchronization and a Mutex Lock to prevent concurrent overlap.

**Implementation Notes:**
```typescript
let isSyncing = false; // Mutex lock

cron.schedule('*/5 * * * *', async () => {
  if (isSyncing) return; // Prevent concurrent overlap
  isSyncing = true;

  try {
    const lastUid = await db.settings.get('LAST_SYNCED_UID') || 1;
    // FETCH via UID: UID SEARCH UID <lastUid + 1>:*
    const newEmails = await imapService.fetchByUid(lastUid + 1);

    for (const email of newEmails) {
      await emailRepository.save(email);
      await db.settings.set('LAST_SYNCED_UID', email.uid);
    }
  } finally {
    isSyncing = false;
  }
})
```

**Sync Strategy:**
1. Check `isSyncing` mutex to prevent concurrent execution
2. Retrieve `LAST_SYNCED_UID` from settings
3. Search for new emails using UID range: `UID SEARCH UID <lastUid + 1>:*`
4. Fetch and parse each message
5. Store in `Email` table with `process_status = 'PENDING'`
6. Update `LAST_SYNCED_UID` after each successful save
7. Release mutex lock in `finally` block

**Important:**
- **DO NOT** use UNSEEN search - it's unreliable for production
- Use UID-based incremental sync for idempotency
- Store UID in database for each email

**Deliverables:**
- [x] Background polling service implemented with mutex lock
- [x] UID-based sync working (not UNSEEN-based)
- [x] `LAST_SYNCED_UID` tracking in database
- [x] New emails stored with UID field
- [x] Error recovery for failed fetches
- [x] Configurable polling interval

---

## T5: SMTP Dispatcher Module

### Context

Create the service responsible for closing the loop, ensuring AI replies are properly threaded into the original conversation.

### Dependencies
- **Requires**: T3 (Secure Vault Implementation) for encrypted SMTP credentials

### Tasks

#### T5.1: SMTP Client Setup & Caching

Set up `nodemailer` with connection caching.

**Implementation Notes:**
```typescript
import nodemailer from 'nodemailer'

// Cache transporter instance
let transporterInstance: Transporter | null = null;

async function getSmtpTransporter() {
  if (transporterInstance) return transporterInstance;

  transporterInstance = nodemailer.createTransport({
    host: await settingsService.get('SMTP_HOST'),
    port: parseInt(await settingsService.get('SMTP_PORT') || '587'),
    secure: false, // Use STARTTLS
    auth: {
      user: await settingsService.get('SMTP_USER'),
      pass: await settingsService.get('SMTP_PASSWORD')
    }
  });

  return transporterInstance;
}
```

**Configuration Keys Required:**
| Key | Description | Example |
|-----|-------------|---------|
| SMTP_HOST | SMTP server hostname | smtp.gmail.com |
| SMTP_PORT | SMTP server port | 587 |
| SMTP_USER | SMTP username | user@gmail.com |
| SMTP_PASSWORD | SMTP password/app password | (encrypted) |

**Deliverables:**
- [x] Nodemailer transporter configured with caching
- [x] Connection verification working
- [x] Credentials fetched from secure vault only once

---

#### T5.2: Thread-Aware Send Email Service

Expose a `sendEmail` method that supports conversation threading.

**Expected API:**
```typescript
interface SendEmailOptions {
  to: string
  subject: string
  body: string
  inReplyTo?: string      // Required for replies
  references?: string[]   // Required for replies
}

class SmtpService {
  async sendEmail(options: SendEmailOptions): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }>
}
```

**Implementation Notes:**
```typescript
// Nodemailer implementation must pass these headers:
await transporter.sendMail({
  from: await settingsService.get('SMTP_USER'),
  to: options.to,
  subject: options.subject,
  text: options.body,
  // Thread headers for replies
  inReplyTo: options.inReplyTo,
  references: options.references?.join(' ')
})
```

**Thread Context Requirements:**
- Pass `In-Reply-To` header for replies (contains the Message-ID of the email being replied to)
- Pass `References` header for conversation threading (contains all parent Message-IDs)
- This ensures replies are properly threaded in email clients

**Deliverables:**
- [x] `sendEmail` method implemented with thread support
- [x] `inReplyTo` parameter passed to nodemailer
- [x] `references` parameter passed to nodemailer
- [x] Error handling for SMTP failures
- [x] Unit tests for email sending with threading

---

## T6: Backend API Core

### Context

Establish the REST API required for the frontend to fetch data and trigger the AI pipeline.

### Dependencies
- **Requires**: T4 (IMAP Integration), T5 (SMTP Dispatcher)

### Tasks

#### T6.1: Email and Todo REST Endpoints

Create GET endpoints for `/api/emails` (with pagination/limits) and `/api/todos`.

**API Design:**
```typescript
// GET /api/emails
// Query params: page, limit, processed, spam
// Response:
interface EmailsResponse {
  emails: Email[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// GET /api/todos
// Query params: status, urgency, email_id
// Response:
interface TodosResponse {
  todos: Todo[]
}
```

**Deliverables:**
- [x] Express (or similar) server setup
- [x] GET `/api/emails` with pagination
- [x] GET `/api/todos` with filtering
- [x] CORS configured for frontend

---

#### T6.2: Process Emails Endpoint (Queue-Based)

Create a POST endpoint `/api/process-emails` to queue emails for AI processing.

**API Design:**
```typescript
// POST /api/process-emails
// Request body:
interface ProcessEmailsRequest {
  emailIds: number[]  // Accept reasonable batches (e.g., up to 50)
}

// Response:
interface ProcessEmailsResponse {
  success: boolean
  queuedCount: number
  message: string
}
```

**Implementation Notes:**
- **DO NOT** hardcode a strict "max 5 emails" limit in the API layer
- Accept reasonable batches (e.g., up to 50 emails)
- Concurrency limits should be handled by the AI Worker (Phase 3), not by rejecting user requests
- Update `process_status` to `'QUEUED'` in the database
- Return immediately after queuing (async processing handled by Phase 3)

**Deliverables:**
- [x] POST `/api/process-emails` endpoint
- [x] Input validation (reasonable batch size)
- [x] Status update to `QUEUED` in database
- [x] Error handling for invalid requests
- [x] Immediate response (no blocking)

---

## T7: Existing Code Refactoring Tasks

> **Important:** Since Phase 2 modules have been implemented based on the original plan, prioritize the following refactoring tasks to fix system deficiencies.

### Refactoring 1: Database Model Upgrade

Add new fields to the `Email` table for thread context support.

**Fields to Add:**
| Field | Type | Description |
|-------|------|-------------|
| `message_id` | String (Unique) | The Message-ID header |
| `in_reply_to` | String (Nullable) | The In-Reply-To header |
| `references` | JSON (String Array) | The References header chain |
| `uid` | Integer | IMAP UID for sync tracking |

**Migration Required:**
```typescript
// Example Prisma migration
model Email {
  // ... existing fields
  message_id  String?   @unique
  in_reply_to String?
  references  Json?     // Array of Message-IDs
  uid         Int?
}
```

**Deliverables:**
- [x] Database schema updated
- [x] Migration file created
- [x] Prisma client regenerated

---

### Refactoring 2: Email Parsing Logic (T4.2)

Update the `mailparser` integration to extract and store thread context headers.

**Changes Required:**
1. Extract `messageId` from parsed email
2. Extract `inReplyTo` from parsed email
3. Extract `references` array from parsed email
4. Fix `from` field extraction to get clean email address:
   ```typescript
   // BEFORE (incorrect)
   from: parsed.from?.text  // Returns "Name <email@example.com>"

   // AFTER (correct)
   from: parsed.from?.value[0]?.address  // Returns "email@example.com"
   ```

**Deliverables:**
- [x] Message-ID extraction implemented
- [x] In-Reply-To extraction implemented
- [x] References extraction implemented
- [x] `from` field extraction fixed

---

### Refactoring 3: Sync Mechanism Upgrade (T4.3)

Replace UNSEEN-based sync with UID-based sync and add mutex lock.

**Changes Required:**
1. **Deprecate UNSEEN search logic**
2. **Add `LAST_SYNCED_UID` setting to database**
3. **Implement UID-based fetch:**
   ```typescript
   // OLD: await imapService.fetchUnseen()
   // NEW: await imapService.fetchByUid(lastUid + 1)
   ```
4. **Add mutex lock to prevent concurrent execution:**
   ```typescript
   let isSyncing = false;

   cron.schedule('*/5 * * * *', async () => {
     if (isSyncing) return;  // Prevent overlap
     isSyncing = true;
     try {
       // ... sync logic
     } finally {
       isSyncing = false;
     }
   });
   ```

**Deliverables:**
- [x] UNSEEN search replaced with UID search
- [x] `LAST_SYNCED_UID` tracking implemented
- [x] Mutex lock added to prevent concurrent sync
- [x] UID stored with each email record

---

### Refactoring 4: Email Sending Upgrade (T5.2)

Update `sendEmail` interface to support thread context.

**Changes Required:**
1. **Add parameters to interface:**
   ```typescript
   interface SendEmailOptions {
     to: string
     subject: string
     body: string
     inReplyTo?: string      // NEW: Required for replies
     references?: string[]   // NEW: Required for replies
   }
   ```

2. **Pass thread headers to Nodemailer:**
   ```typescript
   await transporter.sendMail({
     // ... other options
     inReplyTo: options.inReplyTo,
     references: options.references?.join(' ')
   })
   ```

**Deliverables:**
- [x] `inReplyTo` parameter added to `SendEmailOptions`
- [x] `references` parameter added to `SendEmailOptions`
- [x] Headers passed to Nodemailer `sendMail`
- [x] Replies properly threaded in email clients

---

### Refactoring 5: Connection Pooling/Singleton Pattern (T4.1 & T5.1)

Review existing IMAP and SMTP connection logic to implement instance reuse.

**Changes Required:**
1. **IMAP Client Caching:**
   ```typescript
   let imapClientInstance: ImapFlow | null = null;

   async function getImapClient() {
     if (imapClientInstance) return imapClientInstance;
     // Initialize once and cache
     imapClientInstance = new ImapFlow({ ... });
     return imapClientInstance;
   }
   ```

2. **SMTP Transporter Caching:**
   ```typescript
   let transporterInstance: Transporter | null = null;

   async function getSmtpTransporter() {
     if (transporterInstance) return transporterInstance;
     // Initialize once and cache
     transporterInstance = nodemailer.createTransport({ ... });
     return transporterInstance;
   }
   ```

**Goal:** Avoid decrypting credentials and reinitializing connections on every request/cron trigger.

**Deliverables:**
- [x] IMAP client instance caching implemented
- [x] SMTP transporter instance caching implemented
- [x] Credentials decrypted only once during initialization
- [x] Connections reused across requests

---

### Refactoring 6: API Logic Optimization (T6.2)

Remove hardcoded limit and fix queue-only behavior.

**Changes Required:**
1. **Remove hardcoded "max 5" limit:**
   ```typescript
   // OLD
   if (emailIds.length > 5) {
     throw new Error('Maximum 5 emails allowed');
   }

   // NEW: Accept reasonable batches
   if (emailIds.length > 50) {
     throw new Error('Maximum 50 emails allowed per request');
   }
   ```

2. **Ensure queue-only behavior:**
   ```typescript
   // API should only update status and return
   // DO NOT process synchronously

   async function processEmails(emailIds: number[]) {
     // Update status to QUEUED
     await db.email.updateMany({
       where: { id: { in: emailIds } },
       data: { process_status: 'QUEUED' }
     });

     // Return immediately - AI Worker handles actual processing
     return { success: true, queuedCount: emailIds.length };
   }
   ```

**Deliverables:**
- [x] Hardcoded "max 5" limit removed
- [x] Reasonable batch limit (50) implemented
- [x] API only updates status to `QUEUED`
- [x] Synchronous processing logic removed
- [x] Immediate response after queueing

---

## Phase 2 Completion Checklist

### Refactoring Tasks (T7)
- [x] Database model upgraded with thread context fields
- [x] Email parsing extracts Message-ID, In-Reply-To, References
- [x] `from` field extraction fixed (clean email address)
- [x] UID-based sync implemented (UNSEEN deprecated)
- [x] Mutex lock prevents concurrent sync
- [x] `LAST_SYNCED_UID` tracking working
- [x] `sendEmail` supports `inReplyTo` and `references`
- [x] IMAP/SMTP client instance caching implemented
- [x] API limit updated to reasonable batch size (50)
- [x] Queue-only behavior confirmed (no sync processing)

### Core Functionality
- [x] IMAP client connected with encrypted credentials
- [x] Email parsing extracts plain text bodies
- [x] Background polling fetches new emails
- [x] SMTP client configured for sending
- [x] `sendEmail` service method working
- [x] REST API endpoints for emails and todos
- [x] Process emails endpoint working

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emails` | List emails with pagination |
| GET | `/api/todos` | List todos with filtering |
| POST | `/api/process-emails` | Queue emails for AI processing |

---

## Next Phase

→ [Phase 3: AI Engine & Agent Core](./plan_3.md)
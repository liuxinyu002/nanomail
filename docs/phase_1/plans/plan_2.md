# Phase 2: Mail Ingestion & Sync Routing

> **Context:** Connect the system to the outside world by syncing emails and providing the infrastructure to send them.

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 2 of 5 |
| **Focus Area** | IMAP email fetching, SMTP dispatch, REST API |
| **Total Tasks** | 6 subtasks across 3 task groups |
| **Dependencies** | Phase 1 (Data Layer & Security) |
| **Estimated Effort** | 2-3 days |

---

## T4: Data Ingestion Engine (IMAP)

### Context
Retrieve raw emails, parse them, and store the clean text in the database. This is the primary input mechanism for the system.

### Dependencies
- **Requires**: T3 (Secure Vault Implementation) for encrypted IMAP credentials

### Tasks

#### T4.1: IMAP Client Integration
Integrate `node-imap` (or `imapflow`). Fetch IMAP credentials via `SettingsService`.

**Implementation Notes:**
```typescript
// Expected configuration retrieved from SettingsService
interface ImapConfig {
  host: string      // e.g., 'imap.gmail.com'
  port: number      // e.g., 993
  user: string      // email address
  password: string  // app password or OAuth token
  tls: boolean
}

// Fetch credentials
const config = {
  host: await settingsService.get('IMAP_HOST'),
  port: parseInt(await settingsService.get('IMAP_PORT') || '993'),
  user: await settingsService.get('IMAP_USER'),
  password: await settingsService.get('IMAP_PASSWORD'),
  tls: true
}
```

**Library Choice:**
- `imapflow`: Modern, Promise-based API (recommended)
- `node-imap`: Mature, widely used, callback-based

**Deliverables:**
- [ ] IMAP client service created
- [ ] Connection established using encrypted credentials
- [ ] Error handling for connection failures

---

#### T4.2: MIME Parsing Implementation
Implement MIME parsing (e.g., using `mailparser`) to extract pure text bodies and strip/ignore attachments for the MVP.

**Implementation Notes:**
```typescript
import { simpleParser } from 'mailparser'

// Parse raw email source
const parsed = await simpleParser(rawEmailSource)

// Extract relevant fields
const emailData = {
  subject: parsed.subject,
  from: parsed.from?.text,
  text: parsed.text,           // Plain text body
  html: parsed.html,           // HTML body (fallback)
  date: parsed.date,
  attachments: parsed.attachments?.length > 0
}
```

**MVP Scope Limitations:**
- Store only plain text body (prefer `text` over `html`)
- Skip attachment processing (set `has_attachments` flag only)
- Handle multipart messages gracefully

**Deliverables:**
- [ ] Mailparser integration complete
- [ ] Plain text extraction working
- [ ] Attachment detection (without storage)

---

#### T4.3: Email Sync Background Worker
Create a polling cron job or background worker to quietly fetch new emails and save them to the `Email` table.

**Implementation Notes:**
```typescript
// Using node-cron or similar
import cron from 'node-cron'

// Poll every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const newEmails = await imapService.fetchUnseen()
  for (const email of newEmails) {
    await emailRepository.save(email)
  }
})
```

**Sync Strategy:**
1. Connect to IMAP and select INBOX
2. Search for UNSEEN messages
3. Fetch and parse each message
4. Store in `Email` table with `is_processed = false`
5. Mark as SEEN on IMAP server (optional, configurable)

**Deliverables:**
- [ ] Background polling service implemented
- [ ] New emails stored in database
- [ ] Configurable polling interval
- [ ] Error recovery for failed fetches

---

## T5: SMTP Dispatcher Module

### Context
Create the service responsible for closing the loop—sending the final drafted replies.

### Dependencies
- **Requires**: T3 (Secure Vault Implementation) for encrypted SMTP credentials

### Tasks

#### T5.1: SMTP Client Setup
Set up `nodemailer` configured with SMTP credentials fetched from `SettingsService`.

**Implementation Notes:**
```typescript
import nodemailer from 'nodemailer'

// Create transporter with encrypted credentials
const transporter = nodemailer.createTransport({
  host: await settingsService.get('SMTP_HOST'),
  port: parseInt(await settingsService.get('SMTP_PORT') || '587'),
  secure: false, // Use STARTTLS
  auth: {
    user: await settingsService.get('SMTP_USER'),
    pass: await settingsService.get('SMTP_PASSWORD')
  }
})
```

**Configuration Keys Required:**
| Key | Description | Example |
|-----|-------------|---------|
| SMTP_HOST | SMTP server hostname | smtp.gmail.com |
| SMTP_PORT | SMTP server port | 587 |
| SMTP_USER | SMTP username | user@gmail.com |
| SMTP_PASSWORD | SMTP password/app password | (encrypted) |

**Deliverables:**
- [ ] Nodemailer transporter configured
- [ ] Connection verification working
- [ ] Credentials fetched from secure vault

---

#### T5.2: Send Email Service Method
Expose a generic `sendEmail(to, subject, body)` backend service method.

**Expected API:**
```typescript
interface SendEmailOptions {
  to: string
  subject: string
  body: string
  replyTo?: string
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
- Support both plain text and HTML body
- Include proper error handling and logging
- Return message ID on success for tracking

**Deliverables:**
- [ ] `sendEmail` method implemented
- [ ] Error handling for SMTP failures
- [ ] Unit tests for email sending

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
- [ ] Express (or similar) server setup
- [ ] GET `/api/emails` with pagination
- [ ] GET `/api/todos` with filtering
- [ ] CORS configured for frontend

---

#### T6.2: Process Emails Endpoint
Create a POST endpoint `/api/process-emails` that accepts an array of Email IDs to queue for AI processing.

**API Design:**
```typescript
// POST /api/process-emails
// Request body:
interface ProcessEmailsRequest {
  emailIds: number[] // Max 5 emails
}

// Response:
interface ProcessEmailsResponse {
  success: boolean
  queuedCount: number
  message: string
}
```

**Implementation Notes:**
- Validate max 5 emails per request
- Mark emails as queued for processing
- Return immediately (async processing handled by Phase 3)

**Deliverables:**
- [ ] POST `/api/process-emails` endpoint
- [ ] Input validation (max 5 emails)
- [ ] Error handling for invalid requests

---

## Phase 2 Completion Checklist

- [ ] IMAP client connected with encrypted credentials
- [ ] Email parsing extracts plain text bodies
- [ ] Background polling fetches new emails
- [ ] SMTP client configured for sending
- [ ] `sendEmail` service method working
- [ ] REST API endpoints for emails and todos
- [ ] Process emails endpoint with validation
- [ ] All endpoints documented and tested

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emails` | List emails with pagination |
| GET | `/api/todos` | List todos with filtering |
| POST | `/api/process-emails` | Queue emails for AI processing |

## Next Phase

→ [Phase 3: AI Engine & Agent Core](./plan_3.md)
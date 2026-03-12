# Phase 5: Delivery & Deployment

> **Context:** Finalize the application for self-hosted, private deployment.

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 5 of 5 |
| **Focus Area** | Docker containerization, testing, documentation |
| **Total Tasks** | 4 subtasks across 2 task groups |
| **Dependencies** | Phase 4 (Frontend Interaction & Workspace) |
| **Estimated Effort** | 1-2 days |

---

## T14: Containerization

### Context
Package the app into Docker for easy deployment on NAS, VPS, or local machines. This ensures consistent runtime across environments.

### Dependencies
- **Requires**: T11, T13 (Frontend & Backend feature complete)

### Tasks

#### T14.1: Multi-stage Dockerfile
Write a multi-stage `Dockerfile`. Stage 1: Build React frontend. Stage 2: Build Node TS backend. Stage 3: Serve static frontend files from the Node backend or Nginx.

**Implementation Notes:**
```dockerfile
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

# Install build dependencies for native modules (sqlite3/better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci

# Copy backend source and build
COPY backend/ ./
RUN npm run build

# Stage 3: Production Image
FROM node:20-alpine AS production

WORKDIR /app

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package.json ./

# Copy built frontend (served by backend)
COPY --from=frontend-builder /app/frontend/dist ./public

# Create data directory for SQLite and set proper ownership
RUN mkdir -p /app/data && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/database.sqlite

# Start server with database migration
CMD ["sh", "-c", "npm run db:migrate && node dist/index.js"]
```

**Build Considerations:**
- Use Alpine Linux for smaller image size
- Multi-stage build reduces final image size
- Static frontend files served by Node backend
- Database path configurable via environment
- **Build tools**: Python3, make, g++ required for native modules (sqlite3/better-sqlite3)
- **Security**: Runs as non-root `node` user in production
- **Migrations**: Database migrations run automatically before server start

**Deliverables:**
- [ ] Multi-stage Dockerfile
- [ ] Build succeeds for both frontend and backend
- [ ] Production image size optimized (< 500MB)
- [ ] Environment variables documented

---

#### T14.2: Docker Compose Configuration
Write `docker-compose.yml`. Ensure persistent volume mounts for `data/` (where SQLite and attachments live) and environment variable pass-through for `MASTER_KEY`.

**Implementation Notes:**
```yaml
version: '3.8'

services:
  nanomail:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: nanomail
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      # Persistent data storage
      - nanomail-data:/app/data
    environment:
      # Required: Master encryption key
      - MASTER_KEY=${MASTER_KEY}
      # Optional: LLM configuration
      - LLM_PROVIDER=${LLM_PROVIDER:-openai}
      - LLM_API_KEY=${LLM_API_KEY:-}
      - LLM_MODEL=${LLM_MODEL:-gpt-4}
      - LLM_BASE_URL=${LLM_BASE_URL:-}
      # Timezone for accurate email timestamps
      - TZ=${TZ:-UTC}
    # Enable host.docker.internal on Linux (for local Ollama)
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  nanomail-data:
    driver: local
```

**Environment File Template (`.env.example`):**
```bash
# Required: Generate with `openssl rand -hex 32`
MASTER_KEY=your-64-character-hex-string-here

# LLM Configuration
LLM_PROVIDER=openai  # openai, deepseek, or ollama
LLM_API_KEY=sk-your-api-key
LLM_MODEL=gpt-4
# LLM_BASE_URL=  # Optional, for custom endpoints

# Timezone (important for email timestamps)
TZ=UTC  # e.g., America/New_York, Europe/London, Asia/Shanghai

# IMAP Configuration (set via UI after first run)
# SMTP Configuration (set via UI after first run)
```

**Security Considerations:**
- Never commit `.env` file
- `MASTER_KEY` must be set before first run
- Volume ensures data persistence across container restarts
- Healthcheck enables automatic recovery
- **Linux compatibility**: `extra_hosts` enables `host.docker.internal` for connecting to local Ollama

**Deliverables:**
- [ ] docker-compose.yml with volume mounts
- [ ] Environment variable documentation
- [ ] `.env.example` template
- [ ] Healthcheck configuration

---

## T15: Final Testing & Documentation

### Context
Polish the open-source/delivery assets. Ensure the application is production-ready.

### Dependencies
- **Requires**: T14 (Containerization)

### Tasks

#### T15.1: Integration & E2E Testing
Run Integration tests (API level) and E2E tests (UI level). Ingest test email -> trigger pipeline -> generate To-Do -> ask agent to reply -> catch SMTP output.

**Test Definitions:**
- **Integration Tests**: Test API endpoints directly using `supertest`. Fast, no browser needed.
- **E2E Tests**: Test full UI flows using Playwright/Cypress. Slower, but catches real user issues.

> ⚠️ **Critical**: Do NOT call real LLM APIs in automated tests. LLM responses are non-deterministic, slow, and costly. Always mock the LLM service to return fixed responses.

**Test Scenarios:**
```typescript
// Integration Test Suite (API level, using supertest)

describe('NanoMail Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    // Initialize app with test database
    app = await createTestApp();

    // ⚠️ CRITICAL: Mock LLM Service to avoid flaky tests
    // Real LLM calls are slow, expensive, and non-deterministic
    mockLLMService({
      summary: 'This is a test summary about the project deadline.',
      draft: 'Dear Team, Thank you for your email. I will review the proposal.',
      spamScore: 0
    });

    // Start test SMTP server to capture emails
    await startTestSmtpServer();
  });

  afterAll(async () => {
    // Clean up test database
    await cleanupTestDatabase();

    // Close all connections
    await closeTestApp();

    // Stop test SMTP server
    await stopTestSmtpServer();
  });

  test('Full email processing flow', async () => {
    // 1. Trigger email sync
    await request(app).post('/api/sync-emails')

    // 2. Verify emails are stored
    const emails = await request(app).get('/api/emails')
    expect(emails.body.emails.length).toBeGreaterThan(0)

    // 3. Process emails with AI (mocked)
    const emailIds = emails.body.emails.map(e => e.id).slice(0, 2)
    await request(app).post('/api/process-emails').send({ emailIds })

    // 4. Wait for processing and verify todos
    await waitFor(() => request(app).get('/api/todos'))
    const todos = await request(app).get('/api/todos')
    expect(todos.body.todos.length).toBeGreaterThan(0)

    // 5. Trigger agent draft (mocked LLM returns fixed response)
    const draftResponse = await request(app)
      .post('/api/agent/draft')
      .send({
        emailId: emailIds[0],
        instruction: 'Draft a polite acknowledgment'
      })

    // 6. Verify draft is generated (from mock)
    expect(draftResponse.text).toContain('Dear')

    // 7. Send reply (captured by test SMTP server)
    await request(app).post('/api/send-email').send({
      to: 'test@example.com',
      subject: 'Re: Test',
      body: draftResponse.text
    })

    // 8. Verify email was captured by test SMTP
    expect(testSmtpServer.capturedEmails.length).toBe(1)
  })

  test('Spam detection', async () => {
    // Mock LLM returns high spam score
    mockLLMService({ spamScore: 0.95 })

    // Seed known spam email and verify it's flagged
  })

  test('Summary generation', async () => {
    // Process email with mocked LLM
    // Verify summary matches mock response
  })
})

// E2E Test Suite (UI level, using Playwright)
// Run separately, slower but tests real user flows
describe('NanoMail E2E Tests', () => {
  // Playwright-based tests for UI interactions
  // Also mock LLM service at the backend level
})
```

**Testing Tools:**
- **Integration Tests**: `supertest` for API testing
- **E2E Tests**: Playwright or Cypress for UI testing
- **Unit Tests**: Jest for backend/frontend unit tests
- **Test SMTP**: smtp-sink or mailhog for capturing outgoing emails
- **Mock LLM**: Essential to prevent flaky tests - return fixed responses

**Deliverables:**
- [ ] Integration test suite for API endpoints
- [ ] E2E test suite for critical UI flows
- [ ] Mock LLM service for deterministic testing
- [ ] Test SMTP server integration
- [ ] CI/CD pipeline configuration
- [ ] All tests passing with proper cleanup

---

#### T15.2: Comprehensive README
Write a comprehensive `README.md` focusing on the self-hosted deployment steps, generating a Master Key, and connecting Ollama/DeepSeek.

**README Structure:**
```markdown
# NanoMail

A privacy-first, AI-powered email assistant that runs entirely on your own hardware.

## Features

- 🤖 AI-powered email summarization and action item extraction
- 🔒 End-to-end encryption for all stored credentials
- 🏠 Self-hosted - your data never leaves your server
- 🔧 Multi-LLM support - OpenAI, DeepSeek, or local Ollama
- ✉️ IMAP email sync with SMTP reply sending
- 📋 Smart To-Do dashboard with urgency grouping

## Quick Start

### Prerequisites

- Docker and Docker Compose
- An LLM API key (OpenAI, DeepSeek) OR local Ollama installation

### 1. Generate Master Key

```bash
openssl rand -hex 32
```

Copy the output - this is your `MASTER_KEY`.

### 2. Clone and Configure

```bash
git clone https://github.com/your-org/nanomail.git
cd nanomail
cp .env.example .env
```

Edit `.env`:
```bash
MASTER_KEY=<your-generated-key>
LLM_PROVIDER=openai  # or deepseek, ollama
LLM_API_KEY=sk-your-api-key
```

### 3. Run

```bash
docker-compose up -d
```

Access at http://localhost:3000

### 4. Configure Email

Navigate to Settings and enter your IMAP/SMTP credentials.

## LLM Configuration

### OpenAI

```bash
LLM_PROVIDER=openai
LLM_API_KEY=sk-your-openai-key
LLM_MODEL=gpt-4  # or gpt-3.5-turbo for cost savings
```

### DeepSeek

```bash
LLM_PROVIDER=deepseek
LLM_API_KEY=your-deepseek-key
LLM_MODEL=deepseek-chat
```

### Local Ollama

```bash
# Start Ollama server
ollama serve

# Pull a model
ollama pull llama2

# Configure NanoMail
LLM_PROVIDER=ollama
LLM_BASE_URL=http://host.docker.internal:11434/v1
LLM_MODEL=llama2
```

Note: When running in Docker, use `host.docker.internal` to connect to Ollama on the host machine.

## Security

> ⚠️ **CRITICAL WARNING - Production Deployment**
>
> If deploying on a VPS, public NAS, or any internet-accessible server:
> - **NEVER expose port 3000 directly to the internet**
> - **ALWAYS use a reverse proxy** (Nginx, Caddy, or Traefik) with **HTTPS enabled**
> - Without HTTPS, your Master Key and email credentials are transmitted in plaintext and can be intercepted
> - Example Caddy setup:
>   ```bash
>   # Caddyfile
>   mail.yourdomain.com {
>     reverse_proxy localhost:3000
>   }
>   ```
> - Free SSL certificates are available via Let's Encrypt (automatic with Caddy)

- All credentials are encrypted with AES-256-GCM
- Master key is required at startup
- SQLite database stored in persistent Docker volume
- No external telemetry or tracking

## Backup & Restore

Your email data is stored in the `nanomail-data` Docker volume. Regular backups are essential.

### Backup

```bash
# Create a backup of the nanomail-data volume
docker run --rm \
  -v nanomail-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/nanomail-backup-$(date +%Y%m%d-%H%M%S).tar.gz /data
```

### Restore

```bash
# Restore from a backup file
docker run --rm \
  -v nanomail-data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "cd / && tar xzf /backup/nanomail-backup-TIMESTAMP.tar.gz"
```

### Automated Backups

For production, consider setting up a cron job:

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * cd /path/to/nanomail && docker run --rm -v nanomail-data:/data -v ./backups:/backup alpine tar czf /backup/nanomail-$(date +\%Y\%m\%d).tar.gz /data
```

## Development

```bash
# Install dependencies
npm install

# Run backend in dev mode
npm run dev:backend

# Run frontend in dev mode
npm run dev:frontend

# Run tests
npm test
```

## License

MIT
```

**Deliverables:**
- [ ] README with quick start guide
- [ ] LLM configuration examples
- [ ] Security documentation with HTTPS/reverse proxy warning
- [ ] Backup & restore instructions
- [ ] Development instructions

---

## Phase 5 Completion Checklist

- [ ] Multi-stage Dockerfile builds successfully
- [ ] Native module build tools (python3, make, g++) included
- [ ] Container runs as non-root user
- [ ] Database migration runs on startup
- [ ] Docker Compose with persistent volumes
- [ ] Linux host.docker.internal support via extra_hosts
- [ ] Timezone configuration supported
- [ ] Environment configuration documented
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical UI flows
- [ ] Mock LLM service prevents flaky tests
- [ ] Test cleanup (afterAll) implemented
- [ ] Test SMTP integration working
- [ ] README with HTTPS/reverse proxy security warning
- [ ] Backup & restore documentation
- [ ] `.env.example` provided
- [ ] Healthcheck configured
- [ ] Container runs on NAS/VPS/local machine

## Deployment Checklist

### Pre-deployment
- [ ] Generate `MASTER_KEY` with `openssl rand -hex 32`
- [ ] Set `LLM_PROVIDER` and `LLM_API_KEY`
- [ ] Configure `LLM_BASE_URL` if using Ollama

### First Run
- [ ] Access UI at http://localhost:3000
- [ ] Navigate to Settings
- [ ] Enter IMAP credentials
- [ ] Enter SMTP credentials
- [ ] Test email connection

### Ongoing
- [ ] Monitor container health
- [ ] Backup `nanomail-data` volume regularly
- [ ] Rotate API keys periodically

## Project Complete

All phases completed. NanoMail is ready for deployment.

---

## Full Project Summary

| Phase | Focus | Status |
|-------|-------|--------|
| [Phase 1](./plan_1.md) | Data Layer & Security | ✅ |
| [Phase 2](./plan_2.md) | Mail Ingestion & Sync | ✅ |
| [Phase 3](./plan_3.md) | AI Engine & Agent | ✅ |
| [Phase 4](./plan_4.md) | Frontend & Workspace | ✅ |
| [Phase 5](./plan_5.md) | Delivery & Deployment | ✅ |

**Total Tasks Completed**: 34 subtasks across 15 task groups
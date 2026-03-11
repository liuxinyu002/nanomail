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

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/database.sqlite

# Start server
CMD ["node", "dist/index.js"]
```

**Build Considerations:**
- Use Alpine Linux for smaller image size
- Multi-stage build reduces final image size
- Static frontend files served by Node backend
- Database path configurable via environment

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

# IMAP Configuration (set via UI after first run)
# SMTP Configuration (set via UI after first run)
```

**Security Considerations:**
- Never commit `.env` file
- `MASTER_KEY` must be set before first run
- Volume ensures data persistence across container restarts
- Healthcheck enables automatic recovery

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

#### T15.1: End-to-End Testing
Run End-to-End tests: Ingest test email -> trigger pipeline -> generate To-Do -> ask agent to reply -> catch SMTP output.

**Test Scenarios:**
```typescript
// E2E Test Suite

describe('NanoMail E2E', () => {
  beforeAll(async () => {
    // Start test SMTP server to capture emails
    // Seed test emails in mock IMAP
  })

  test('Full email processing flow', async () => {
    // 1. Trigger email sync
    await request(app).post('/api/sync-emails')

    // 2. Verify emails are stored
    const emails = await request(app).get('/api/emails')
    expect(emails.body.emails.length).toBeGreaterThan(0)

    // 3. Process emails with AI
    const emailIds = emails.body.emails.map(e => e.id).slice(0, 2)
    await request(app).post('/api/process-emails').send({ emailIds })

    // 4. Wait for processing and verify todos
    await waitFor(() => request(app).get('/api/todos'))
    const todos = await request(app).get('/api/todos')
    expect(todos.body.todos.length).toBeGreaterThan(0)

    // 5. Trigger agent draft
    const draftStream = await request(app)
      .post('/api/agent/draft')
      .send({
        emailId: emailIds[0],
        instruction: 'Draft a polite acknowledgment'
      })

    // 6. Verify draft is generated
    expect(draftStream.text).toContain('Dear')

    // 7. Send reply (captured by test SMTP server)
    await request(app).post('/api/send-email').send({
      to: 'test@example.com',
      subject: 'Re: Test',
      body: draftStream.text
    })

    // 8. Verify email was captured by test SMTP
    expect(testSmtpServer.capturedEmails.length).toBe(1)
  })

  test('Spam detection', async () => {
    // Seed known spam email
    // Process and verify it's flagged as spam
  })

  test('Summary generation', async () => {
    // Process email
    // Verify summary is populated
  })
})
```

**Testing Tools:**
- Playwright or Cypress for E2E
- Jest for backend unit tests
- Test SMTP server (smtp-sink or mailhog)

**Deliverables:**
- [ ] E2E test suite for critical flows
- [ ] Test SMTP server integration
- [ ] CI/CD pipeline configuration
- [ ] All tests passing

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

- All credentials are encrypted with AES-256-GCM
- Master key is required at startup
- SQLite database stored in persistent Docker volume
- No external telemetry or tracking

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
- [ ] Security documentation
- [ ] Development instructions

---

## Phase 5 Completion Checklist

- [ ] Multi-stage Dockerfile builds successfully
- [ ] Docker Compose with persistent volumes
- [ ] Environment configuration documented
- [ ] E2E tests for critical flows passing
- [ ] Test SMTP integration working
- [ ] README comprehensive and clear
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
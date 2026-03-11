# NanoMail Implementation Plan Index

## Project Background

NanoMail is a **Smart Email Agent** system designed for single-tenant, self-hosted deployment. The system provides AI-powered email management capabilities including:

- **Intelligent Email Processing**: Automatic spam/newsletter detection, TL;DR summarization, and action item extraction
- **ReAct Agent**: AI-powered reply drafting with human-in-the-loop workflow
- **Privacy-First Architecture**: Local SQLite database with encrypted credential storage
- **Multi-LLM Support**: Compatible with OpenAI, DeepSeek, and local Ollama models

## 技术栈与工作区说明
本项目采用 pnpm Monorepo 架构，包含三个核心 Workspace：
- **`@nanomail/shared`**: 前后端共享的 Zod Schemas 和 TypeScript 类型定义 (单一事实来源)。
- **`@nanomail/backend`**: Node.js + TypeORM + SQLite 提供 REST API、IMAP/SMTP 通信与 SSE Agent 流式输出。
- **`@nanomail/frontend`**: React + Vite + Tailwind + Shadcn UI 构建的极简卡片式前端。

## 全局目录架构设计

```text
smart-email-agent/
├── package.json                  # 根项目配置 (工作区脚本)
├── pnpm-workspace.yaml           # pnpm 工作区声明
├── index.md                      # 项目架构与核心说明文档 (当前文件)
├── docker-compose.yml            # 私有化部署编排文件
├── Dockerfile                    # 多阶段构建镜像脚本
├── .env.example                  # 环境变量配置示例 (包含 MASTER_KEY)
│
└── packages/
    │
    ├── shared/                   # 1. 共享类型库 (Data Contracts)
    │   ├── package.json
    │   └── src/
    │       ├── schemas/          # Zod 校验规则 (如 TodoSchema)
    │       ├── types/            # 派生的 TypeScript DTOs
    │       └── index.ts          # 统一导出入口
    │
    ├── backend/                  # 2. 核心后端服务
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── data/                 # SQLite 落盘区 (.gitignore 忽略)
    │   └── src/
    │       ├── index.ts          # 服务入口
    │       ├── config/           # TypeORM 配置
    │       ├── entities/         # 数据库实体 (Email, Todo, Settings, Label)
    │       ├── services/         # 业务逻辑 (Encryption, Imap, Smtp, Agent Pipeline)
    │       ├── routes/           # RESTful & SSE 路由
    │       └── controllers/      # 请求分发与 Zod 校验
    │
    └── frontend/                 # 3. 前端交互界面
        ├── package.json
        ├── vite.config.ts        # Vite 配置 (包含 API 代理)
        ├── tailwind.config.js    # 样式配置
        └── src/
            ├── App.tsx           # 全局路由与侧边栏布局
            ├── components/       # 基础公共 UI 组件 (Shadcn)
            ├── features/         # 业务切片 (inbox, todo-board, agent-editor)
            ├── services/         # API 客户端封装
            └── store/            # 状态管理
```

## Optimization Goals

| Goal | Description |
|------|-------------|
| **Security** | All credentials encrypted at rest using AES-256-GCM |
| **Simplicity** | Single-tenant architecture eliminates user management complexity |
| **Extensibility** | Modular tool registry for future AI capabilities |
| **Performance** | SSE streaming for responsive real-time drafting experience |
| **Deployability** | Docker-based deployment for NAS/VPS/local environments |

## Implementation Summary

### Phase Overview

| Phase | Focus Area | Tasks | Dependencies |
|-------|-----------|-------|--------------|
| [Phase 1](./plan_1.md) | Data Layer & Security Infrastructure | T1-T3 (8 tasks) | None |
| [Phase 2](./plan_2.md) | Mail Ingestion & Sync Routing | T4-T6 (6 tasks) | Phase 1 |
| [Phase 3](./plan_3.md) | AI Engine & Agent Core | T7-T9 (8 tasks) | Phase 2 |
| [Phase 4](./plan_4.md) | Frontend Interaction & Workspace | T10-T13 (8 tasks) | Phase 3 |
| [Phase 5](./plan_5.md) | Delivery & Deployment | T14-T15 (4 tasks) | Phase 4 |

### Critical Path

```
T1 → T2 → T3 → T4/T5 → T6 → T7 → T8 → T9 → T10 → T11/T12 → T13 → T14 → T15
```

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + TypeScript |
| Database | SQLite + TypeORM |
| Frontend | React + Vite + Tailwind + Shadcn UI |
| AI/LLM | OpenAI SDK (compatible with DeepSeek/Ollama) |
| Email | node-imap/imapflow + nodemailer + mailparser |
| Deployment | Docker + docker-compose |

## Important Notes

### Security Considerations

1. **Master Key Management**: The `MASTER_KEY` environment variable is critical for credential encryption. Generate using: `openssl rand -hex 32`
2. **No User Authentication**: Single-tenant design assumes trusted local network
3. **Credential Isolation**: All sensitive data stored in encrypted `Settings` table

### Architecture Decisions

1. **Monorepo Structure**: Separate backend and frontend workspaces for clear separation of concerns
2. **SQLite over PostgreSQL**: Simplicity for single-tenant, no external database dependency
3. **SSE over WebSocket**: Unidirectional streaming sufficient for drafting use case
4. **ReAct Loop**: Enables transparent reasoning process and tool usage

### Known Limitations (MVP Scope)

- Attachments are ignored during parsing (future enhancement)
- Maximum 5 emails processed per AI batch request
- No built-in email threading support
- No multi-language support for UI

## References

- [OpenAI Tool Calling](https://platform.openai.com/docs/guides/function-calling)
- [ReAct Agent Pattern](https://arxiv.org/abs/2210.03629)
- [node-imap Documentation](https://github.com/mscdex/node-imap)
- [Shadcn UI Components](https://ui.shadcn.com/)

## Quick Navigation

- [Phase 1: Data Layer & Security](./plan_1.md)
- [Phase 2: Mail Ingestion & Sync](./plan_2.md)
- [Phase 3: AI Engine & Agent Core](./plan_3.md)
- [Phase 4: Frontend Interaction](./plan_4.md)
- [Phase 5: Delivery & Deployment](./plan_5.md)
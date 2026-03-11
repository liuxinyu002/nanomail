# 产品需求文档 (PRD)：智能邮件处理与执行 Agent (MVP版)

## 1. Project overview (项目概述)

本项目是一个基于 TypeScript 技术栈、支持私有化部署的**单用户智能邮件管理工作台**。系统旨在解决重度邮件用户的收件箱过载问题，通过底层 IMAP/SMTP 协议接管邮件收发。其核心大脑是一个基于 `nanobot` 架构改造的 AI Agent，采用“Human-in-the-loop（人工介入）”模式，实现邮件的精准打标、长文摘要和待办提取。与传统邮箱不同，本产品提供了一个具备“主动执行能力”的独立待办看板，允许用户通过短指令驱动 Agent 结合本地上下文起草回复，打造极致的效率闭环。

## 2. Core requirements (核心需求)

* **极致隐私与数据安全**：单用户架构 (Single-Tenant)，用户的 IMAP/SMTP 凭证及 LLM API Key 必须通过 AES 算法加密（依赖环境变量 Master Key）后存入本地 SQLite。
* **AI 资源精细化控制**：废弃全自动静默处理，强制要求用户在收件箱手动圈选邮件后，才触发大模型处理管道，防止 Token 滥用和无价值邮件的干扰。
* **混合大模型支持 (Hybrid LLM)**：系统必须提供 LLM 适配层，既支持云端兼容 OpenAI 协议的 API（优先适配 DeepSeek, Qwen, GLM, Kimi），也支持配置本地 Ollama 服务地址。
* **原生 Tool Calling 标准**：大模型必须支持标准的 OpenAI Tools API 格式，系统基于 `nanobot` 逻辑实现标准的 Function Calling 分发，不依赖脆弱的正则字符串解析。

## 3. Core features (核心功能)

* **人工介入的调度机制**：系统后台无限制拉取新邮件，但在前端呈现为未处理列表。用户手动勾选目标邮件（单次最多 5 封）后，投递至 AI 处理管道。
* **AI 三步处理管道 (Pipeline)**：
1. **垃圾拦截**：判定垃圾邮件，打上标签并立即终止该邮件的后续 AI 处理。
2. **核心摘要**：为工作邮件生成高度浓缩的 TL;DR 摘要。
3. **待办提取**：精准提取 Action Items，并标记紧急程度（高/中/低）。


* **Vibe 风极简收件箱**：邮件以无边框卡片展示（标题、发件人、前 15 字符）。带待办的邮件会有轻量徽章提示。支持下拉折叠面板 (Collapsible)，展开后仅供预览“摘要”和“轻量待办列表”（支持打钩同步，不支持在此直接 AI 回复）。
* **智能待办工作台 (Smart To-Do Dashboard)**：独立的任务看板，支持按紧急程度/时间排序。
* **Agent 意图驱动回复**：在待办看板中，用户点击“协助回复”并输入极简指令（如“同意报价”）。Agent 实时呈现 ReAct 思考流 (`Think -> Tool (search_local_emails) -> Act`)，并通过 Server-Sent Events (SSE) 将草稿流式打印在富文本编辑器中。
* **系统内闭环发信**：草稿确认无误后，直接通过系统内置的 SMTP 模块发信，无需跳转第三方客户端。

## 4. Core components (核心组件)

* **Data Ingestion Engine (数据摄入引擎)**：负责 IMAP 协议轮询、MIME 解析。剥离并静态存储附件，提取纯文本供大模型使用。
* **Agentic Pipeline (AI 代理管道)**：参考 `nanobot` 源码构建的 AI 调度核心。包含多步 Prompt 链路控制器、Token 截断器（防止上下文爆炸）以及 Tools 注册中心（如本地 SQLite 检索工具）。
* **Secure Vault (安全凭证库)**：负责拦截所有涉及密码、API Key 的读写请求，执行加解密操作，确保 SQLite 落盘数据的绝对安全。
* **SSE Streaming Service (流式推送服务)**：处理大模型流式响应，将其转换为标准 SSE 格式推送到前端富文本编辑器。

## 5. App/user flow (应用与用户流程)

1. **系统轮询**：后端静默拉取新邮件，前端 Inbox 列表更新。
2. **分发与触发**：用户浏览 Inbox，勾选 1-5 封高价值邮件，点击“AI 处理”。
3. **轻量查阅**：处理完成后，用户在 Inbox 展开卡片的下拉折叠框，快速阅读摘要，或勾选掉简单的待办事项。
4. **深度执行**：对于需要写邮件回复的复杂待办，用户切换至“独立待办看板”。
5. **Agent 协作**：
* 用户点击待办卡片的“协助回复”。
* 输入短指令（如“拒绝该推销”）。
* 界面渲染 Agent 的思考与本地检索过程。
* 草稿在编辑器中像打字机一样流式生成。


6. **闭环发送**：用户微调编辑器内容，点击发送，任务标记完成。

## 6. Techstack (技术栈)

* **前端 (Frontend)**：React, Vite, TypeScript。
* **UI/样式**：Tailwind CSS, Shadcn UI（严格遵循现代简约、卡片式、无边框、阴影区隔的设计规范）。
* **后端 (Backend)**：Node.js, TypeScript。
* **数据库与 ORM**：SQLite, TypeORM。
* **AI 通信**：OpenAI Node SDK (适配 DeepSeek/Qwen/Kimi/Ollama)。
* **部署交付**：Docker, Docker Compose（私有化部署）。

## 7. Implementation plan (实施计划)

为确保项目稳步推进，建议分为以下五个阶段进行研发：

* **Phase 1: 数据层与安全基建 (Data & Security)**
* 配置 TypeORM 与 SQLite 连接。
* 设计实体表结构 (`Email`, `Todo`, `Label`, `Settings`)。摒弃用户外键。
* 实现 Master Key 环境变量注入与 AES 加密工具类，跑通凭证的安全存取。


* **Phase 2: 通信与调度层 (Mail & Sync)**
* 集成 `node-imap` 或类似库，跑通邮件轮询与 MIME 解析逻辑。
* 集成 SMTP 发信模块。
* 实现前端手动勾选触发后端的处理队列机制。


* **Phase 3: AI 引擎与 Agent 核心 (AI & Agent - 结合 `nanobot` 源码)**
* 搭建 LLM 适配层，跑通 DeepSeek/Ollama 的标准 API 连通性。
* 实现 3 步处理管道（垃圾拦截 -> 摘要 -> 待办提取）。
* 注册 `search_local_emails` 工具，实现后端的 ReAct 逻辑解析与 SSE 流式接口封装。


* **Phase 4: 前端交互与工作台构建 (Frontend UI)**
* 使用 Shadcn UI 搭建 Inbox 列表页，实现卡片下拉折叠面板（Badge 与摘要透出）。
* 搭建独立的 To-Do Dashboard 看板。
* 对接 SSE 接口，实现富文本编辑器的流式打字机效果及 Agent 状态外显。


* **Phase 5: 联调、测试与部署 (Integration & Deployment)**
* 全链路联调测试。
* 编写 Dockerfile 与 `docker-compose.yml`。
* 撰写私有化部署指南 (README)。
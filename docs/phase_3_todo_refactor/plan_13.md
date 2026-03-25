# Todo 归档箱实现方案

## Context
当前 Todo 页面会一次性拉取全部任务，勾选完成只会把 `status` 改为 `completed`，不会把已完成任务从主视图数据层彻底分流。目标是把 `completed` 视为“已归档”，通过后端查询分流让主视图默认排除已完成项，并在 Inbox 面板右上角 `...` 菜单中提供“查看归档的卡片”入口，用弹出框按需加载全局归档列表。

归档列表需要支持基于 `(completedAt, id)` 稳定排序的游标分页、滚动到底自动加载、只读卡片展示，以及“恢复到 Inbox”操作；恢复后卡片需通过**与现有 position 体系兼容的顶部插入算法**回到 Inbox 顶部，并在前端短暂高亮，方便定位。恢复逻辑严禁采用批量顺移其它任务 position 的做法。

## 推荐方案
采用“`completed` 即归档”的单一语义，不新增独立 archive 状态：
- 主视图：`GET /api/todos?excludeStatus=completed`
- 归档弹框：`GET /api/todos/archive?limit=20&cursor=<opaque_base64_cursor>`，后端按 `status=completed` + `completedAt DESC, id DESC` 查询
- 完成任务：由后端统一写入 `completedAt`
- 恢复任务：通过专用 restore 接口一次性完成 `status=pending`、`completedAt=null`、`boardColumnId=Inbox`，并基于 Inbox 当前最小 position 计算新的顶部 position（O(1) 单行更新）
- 通用更新接口禁止直接把已完成任务改回未完成，强制通过 restore 语义执行解归档

这样可以最小化对现有业务语义的扰动，同时把排序、回填、恢复位置、并发一致性都收敛到后端。

## 关键文件
- `packages/shared/src/schemas/todo.ts`
- `packages/shared/src/schemas/index.ts`
- `packages/shared/src/schemas/boardColumn.ts`
- `packages/backend/src/entities/Todo.entity.ts`
- `packages/backend/src/routes/todo.routes.ts`
- `packages/backend/src/routes/todo.routes.test.ts`
- `packages/backend/src/entities/Todo.entity.test.ts`
- `packages/shared/src/schemas/todo.test.ts`
- `packages/frontend/src/services/todo.service.ts`
- `packages/frontend/src/services/todo.service.test.ts`
- `packages/frontend/src/hooks/useTodos.ts`
- `packages/frontend/src/hooks/useTodos.test.tsx`
- `packages/frontend/src/hooks/useArchivedTodos.ts`
- `packages/frontend/src/hooks/useTodoMutations.ts`
- `packages/frontend/src/hooks/useTodoMutations.test.tsx`
- `packages/frontend/src/pages/TodosPage.tsx`
- `packages/frontend/src/pages/TodosPage.test.tsx`
- `packages/frontend/src/features/todos/InboxPanel.tsx`
- `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx`
- `packages/frontend/src/features/todos/EmptyState.tsx`
- `packages/frontend/src/components/ui/dropdown-menu.tsx`
- `packages/frontend/src/components/ui/dialog.tsx`

## 现有实现中应复用的模式
- `packages/shared/src/schemas/boardColumn.ts`
  - 复用 `BoardColumnIds.INBOX`，避免硬编码 Inbox 列 id
- `packages/backend/src/routes/todo.routes.ts`
  - 在现有 `GET /api/todos` 过滤逻辑基础上扩展 `excludeStatus`
  - 复用现有 `formatTodo()` 统一响应格式
- `packages/frontend/src/services/todo.service.ts`
  - 在现有 `getTodos()` / `updateTodo()` 体系上扩展归档读取与恢复操作
- `packages/frontend/src/hooks/useTodoMutations.ts`
  - 保留“先乐观更新，再统一失效刷新”的总体模式，但要把 active/archive 缓存语义拆开
- `packages/frontend/src/features/todos/EmptyState.tsx`
  - 复用已有 `archive` empty-state 视觉
- `packages/frontend/src/components/ui/dropdown-menu.tsx` + `packages/frontend/src/components/ui/dialog.tsx`
  - 复用菜单与弹框原语，避免新造 UI 基础组件

## 实施步骤

### Phase 1 — Shared 契约扩展
1. 在 `packages/shared/src/schemas/todo.ts` 为 `TodoSchema` 增加：
   - `completedAt: z.string().datetime().nullable()`
2. 保持 `completedAt` 为服务端托管字段：
   - 不放入 `CreateTodoSchema`
   - 不允许前端通过通用 `UpdateTodoSchema` 直接任意写入
3. 为 Todo 查询新增 shared 类型/Schema，建议直接放在 `todo.ts` 中统一管理：
   - `TodosQuerySchema`：支持 `status?`、`excludeStatus?`、`boardColumnId?`、`emailId?`
   - `ArchivedTodosQuerySchema`：支持 `limit`、`cursor?`
   - `ArchiveCursorSchema`：定义前后端透传的 opaque Base64 cursor 字符串
   - `ArchiveCursorPayloadSchema`：定义后端编码/解码用的内部结构 `{ completedAt, id }`
   - `ArchivedTodosResponseSchema`
4. `ArchivedTodosResponseSchema.nextCursor` 使用单一字符串字段，不再暴露 `cursorCompletedAt` / `cursorId` 多参数契约
5. 在 `packages/shared/src/schemas/index.ts` 中导出新增类型
6. 同步修正前后端本地重复定义的 Todo query/response 类型，尽量改为从 `@nanomail/shared` 导入

### Phase 2 — 后端数据模型与迁移
1. 在 `packages/backend/src/entities/Todo.entity.ts` 新增 nullable `completedAt` 字段
2. 为 archive 查询增加数据库索引，优先考虑：
   - `(status, completedAt DESC, id DESC)`
3. 增加正式 migration（生产环境不能依赖 `synchronize`）：
   - 新增 `completedAt` 列
   - 回填历史数据：`UPDATE todo SET completedAt = updatedAt WHERE status = 'completed' AND completedAt IS NULL`
4. 在 entity / schema 测试中覆盖 `completedAt` 的 nullability 与响应序列化

### Phase 3 — 后端 API 改造
#### 3.1 扩展主 Todo 列表接口
1. 修改 `GET /api/todos` 支持 `excludeStatus=completed`
2. 主视图请求统一携带该参数
3. 处理参数冲突：若 `status=completed` 且 `excludeStatus=completed` 同时出现，应返回 400，避免语义冲突
4. 保持已有 `boardColumnId`、`emailId`、日期范围查询能力
5. 修正当前 date-range query 的组合方式，确保新增过滤条件作用于整个 deadline 条件组，而不是被 `OR` 优先级绕开

#### 3.2 新增归档列表接口
建议新增独立接口而不是继续复用 `/api/todos` 的响应形态：
- `GET /api/todos/archive?limit=20&cursor=<base64_string>`

行为要求：
1. 只返回 `status = completed` 的记录
2. 排序：`completedAt DESC, id DESC`
3. 游标条件：
   - `completedAt < cursor.completedAt`
   - 或 `completedAt = cursor.completedAt AND id < cursor.id`
4. 后端生成 `nextCursor`：将 `{ completedAt: lastItem.completedAt, id: lastItem.id }` 序列化为 JSON 后再 Base64 编码
5. 响应包含：
   - `todos`
   - `nextCursor`
   - `hasMore`
6. 返回体中的 todo 继续使用 `formatTodo()`，确保前端字段一致

#### 3.3 完成与恢复语义统一
1. 更新完成逻辑（至少包含 `PATCH /api/todos/:id/status`，并检查通用 `PATCH /api/todos/:id` 路径）
   - 当状态从非 completed 变为 completed：写入 `completedAt = now`
   - 当状态保持 completed：不重复覆盖已有 `completedAt`
2. 在通用 `PATCH /api/todos/:id` 中增加防御性校验：
   - 若数据库中当前记录 `status = completed`，且请求 payload 试图将其修改为 `pending` 或其他非 completed 状态，直接返回 `400 Bad Request`
   - 错误信息固定为：`Please use the /restore endpoint to unarchive a completed todo`
3. 新增恢复接口，建议：
   - `POST /api/todos/:id/restore`
4. restore 在事务里完成：
   - 目标 Todo：`status='pending'`
   - `completedAt=null`
   - `boardColumnId=BoardColumnIds.INBOX`
   - 基于 Inbox 当前最小 `position` 计算新的顶部 `position`
   - 严禁通过批量 `UPDATE ... SET position = position + 1` 顺移其余 Inbox 项
5. 顶部插入算法要求：
   - 与现有 position 体系兼容
   - 若 position 为整数/大步长整数，可使用 `minPosition - 1024` 一类策略
   - 若现有实现采用其他可比较排序值，则按该体系取“当前最小值之前”的新值
   - 整体目标是 O(1) 单行更新，而非 O(n) 批量改写
6. 返回完整更新后的 todo，供前端刷新和高亮定位

### Phase 4 — 前端服务与查询层
#### 4.1 主视图查询
1. 修改 `packages/frontend/src/services/todo.service.ts` 的 query 类型与 URL 拼装，支持 `excludeStatus`
2. 修改 `packages/frontend/src/hooks/useTodos.ts`：
   - 默认请求 active 数据，即 `excludeStatus=completed`
   - 不再拉取 completed 数据
3. 如有其它依赖 `useTodos()` 的页面/测试，统一更新期望

#### 4.2 归档查询
1. 在 `todo.service.ts` 增加 `getArchivedTodos()`
2. 新增归档 hook（建议新文件，如 `useArchivedTodos.ts`）：
   - 使用 `useInfiniteQuery`
   - queryKey 明确区分 active 与 archive，例如：
     - active：`['todos', 'list', filters]`
     - archive：`['todos', 'archive', { limit }]`
   - 仅在弹框打开后启用，满足懒加载要求
   - 关闭弹框时不主动清缓存，保留本次会话内的 query cache
3. `getNextPageParam` 仅透传后端返回的 `nextCursor` 字符串，不在前端拼装多字段游标
4. 在弹框滚动容器底部用 `IntersectionObserver` 或 sentinel 方案触发 `fetchNextPage()`，实现“滚动到底自动加载”

#### 4.3 恢复服务
1. 在 `todo.service.ts` 增加 `restoreTodo(id)`
2. 新增 restore mutation hook，专门处理 archive -> inbox 恢复场景

### Phase 5 — 前端 UI 集成
#### 5.1 Inbox 面板入口
1. 在 `packages/frontend/src/features/todos/InboxPanel.tsx` 的右上角计数区域旁新增 `...` 菜单入口
2. 菜单项固定文案：`查看归档的卡片`
3. 点击后通知 `TodosPage` 打开归档弹框

#### 5.2 弹框容器与数据装配
1. 在 `packages/frontend/src/pages/TodosPage.tsx` 持有：
   - 归档弹框开关状态
   - 恢复后高亮的 todo id / 当前高亮 id
2. 弹框只在打开时挂载归档查询
3. 再次打开时复用已缓存的归档页数据，并可按 React Query 既有 stale 策略后台刷新

#### 5.3 归档卡片展示
1. 采用“卡片式只读详情”
2. 不使用外层 wrapper / 遮罩 / `pointer-events: none` 方式屏蔽交互，避免 a11y 与键盘操作隐患
3. 直接改造 `TodoCard` 组件 Props 契约：
   - 新增 `isArchived?: boolean` 或 `readonly?: boolean`
   - 当归档态为 true 时，在组件内部卸载原有 checkbox，或改为不可交互的禁用 icon
   - 在组件内部直接渲染“恢复到 Inbox”按钮
4. 卡片展示信息至少包括：
   - 标题
   - 原列信息（可选但建议展示，便于理解历史位置）
   - 完成时间 `completedAt`
   - 只读详情展开/展示
   - 恢复按钮
5. 空态直接复用 `EmptyState` 的 `archive` variant

#### 5.4 恢复后的 Inbox 高亮
1. restore 成功后，在 `TodosPage` 记录该 todo id 为“临时高亮”
2. Inbox 列表渲染时，如果命中高亮 id，则为对应卡片增加 `isHighlighted` 属性
3. 高亮效果优先用 CSS Animation 实现，而不是依赖复杂 JS 定时器逻辑：
   - 由 React State 保存短期 `highlightedTodoId`
   - 样式层通过类似 `flash-macaron` 的 keyframes 完成淡出动画
4. 如需清理高亮状态，仅保留最小化的一次性移除逻辑，不写数据库
5. 高亮样式只作用于当前会话与当前页面

## 缓存与乐观更新策略

### Active 主视图
- 当用户在主视图勾选完成：
  1. 乐观更新时不要只把 `status` 改成 `completed`
  2. 必须将该条目从 active 查询缓存中直接移除，让其从 Inbox / Board / Planner 平滑消失
  3. mutation settle 后失效 active 查询，确保顺序与服务端状态一致
  4. **不要求立即失效 archive 查询**；归档弹框通常未打开，可依赖下次打开或重新 focus 时的 stale 刷新，避免额外网络请求

### Archive 归档弹框
- 当用户点击恢复：
  1. 乐观更新时先把该条目从 archive cache 中移除
  2. 不强行把它乐观插入所有 active 缓存，避免不同 active 过滤条件下的位置与排序不一致
  3. restore 成功后失效 active list 查询，让 Inbox 以服务端最终 position 重新拉取
  4. 再设置前端临时高亮态，确保刷新后的 Inbox 中能定位该卡片

### Query Key 约束
当前 `useTodoMutations.ts` 是按 `['todos']` 前缀批量处理缓存，归档上线后必须显式区分：
- active list
- archive infinite pages
- date-range list
否则 archive/active 会互相污染，乐观更新很难正确工作。

## 测试与验证

### Shared
- `packages/shared/src/schemas/todo.test.ts`
  - `completedAt` 的可空性
  - `excludeStatus` query 校验
  - Base64 archive cursor / payload / response schema 校验

### Backend
- `packages/backend/src/routes/todo.routes.test.ts`
  - `GET /api/todos?excludeStatus=completed`
  - `GET /api/todos/archive` 的排序、limit、cursor、nextCursor、hasMore
  - `PATCH /api/todos/:id/status` 写入 `completedAt`
  - `PATCH /api/todos/:id` 拦截 completed -> pending 并返回指定 400 错误
  - restore 接口按顶部 position 算法把 todo 恢复到 Inbox 并清空 `completedAt`
  - 冲突 query 参数返回 400
  - 日期范围查询叠加 `excludeStatus` 不泄漏 completed 数据
- `packages/backend/src/entities/Todo.entity.test.ts`
  - `completedAt` 字段映射
  - archive 索引定义与排序字段一致

### Frontend service / hooks
- `packages/frontend/src/services/todo.service.test.ts`
  - `excludeStatus` 拼接
  - archive 接口调用与 opaque cursor 透传
  - restore 接口调用
- `packages/frontend/src/hooks/useTodos.test.tsx`
  - 主视图默认只取 active 数据
- `packages/frontend/src/hooks/useTodoMutations.test.tsx`
  - 完成任务时从 active cache 移除
  - 完成任务后不强制立刻刷新 archive query
  - restore 时从 archive cache 移除并触发 active 失效
- 若新增 `useArchivedTodos.ts`
  - 覆盖懒加载、`getNextPageParam`、多页拼接、关闭重开复用缓存

### Frontend UI
- `packages/frontend/src/pages/TodosPage.test.tsx`
  - Inbox 菜单打开归档弹框
  - 弹框首次打开才请求 archive 数据
  - 关闭再打开复用缓存
  - restore 后 Inbox 出现高亮卡片
- 归档弹框/归档卡片组件测试
  - 滚动到底自动加载下一页
  - 空态显示
  - `TodoCard` 在归档态下不暴露可交互 checkbox
  - 只读展示 + 恢复按钮

### 手动验证
1. 打开 Todo 页面，确认主视图不展示任何 `completed` 任务
2. 在 Inbox / Board 勾选完成，卡片应立即从当前视图消失
3. 从 Inbox `...` -> `查看归档的卡片` 打开弹框，确认新完成卡片按最新完成时间靠前显示
4. 向下滚动，确认自动加载下一页且无重复项
5. 点击“恢复到 Inbox”，确认：
   - 卡片立即从归档弹框消失
   - Inbox 重新出现该卡片
   - 位置在顶部
   - 有临时马卡龙高亮
6. 刷新页面后确认：
   - restored 高亮消失（前端临时态）
   - 归档数据仍由服务端真实状态驱动

## 风险与注意点
1. `completedAt` 是新增的服务端语义字段，必须保证所有“完成/取消完成”入口不会绕过它
2. 当前 `GET /api/todos` 的 date-range SQL 组合已有潜在优先级问题；新增 `excludeStatus` 时应一并修正
3. restore 到 Inbox 顶部必须使用与现有 position 体系兼容的 O(1) 顶部插入算法，严禁批量顺移现有记录
4. 归档分页必须使用稳定排序键 `(completedAt, id)`，且对前端暴露单一 opaque cursor，避免多参数契约扩散
5. 归档弹框应在 `TodoCard` 内部切换归档态交互，不要依赖外层遮罩或 wrapper 阻断事件
6. 用户要求最终方案文档落到 `docs/phase_3_todo_refactor/plan_13.md`

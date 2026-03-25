     Context

     聊天页当前把 todo 工具结果和其他工具统一展示，导致 create / update / delete
     三类操作不易快速区分；同时 assistant 消息里的 toolCalls.input/output 在写入 sessionStorage
     前被统一裁剪，刷新后虽然仍保留隐藏的 role='tool' 消息，但由于 MessageList
     继续隐藏这类消息，MessageItem 也无法再从 toolCalls.output 恢复结构化 Todo
     UI。此次变更的目标是：在不改变非 todo 工具、隐藏 role='tool'
     消息、以及白/灰中性界面外壳的前提下，让 todo
     工具结果支持刷新恢复，并把聊天消息展示顺序调整为“正文 → 工具状态 → 合并后的只读 Todo 卡片”。

     Recommended approach

     采用最小改动、按职责拆分的方案：
     - useChat.ts 仅对 todo 白名单工具保留足够的 payload 用于刷新恢复，其余工具继续裁剪。
     - MessageItem.tsx 从“泛化提取任意 todo-shaped 输出”改为“只处理成功的 create_todo /
     update_todo”，并将 delete_todo 明确排除出 Todo 卡片数据源。
     - ToolStatusBadge.tsx 负责 create / update / delete 的中文标签、马卡龙色 chip 与轻量文本兜底。
     - ToolCallAccordion.tsx 保留现有单条直出 / 多条折叠、pending
     自动展开和完成后延迟折叠逻辑，仅改摘要聚合文案。
     - TodoCardWidget.tsx 增加 readonly 模式，聊天态只做回顾展示，不保留勾选 / 编辑 / 删除交互。

     Implementation steps

     1. 更新 sessionStorage 裁剪策略
       - 文件：packages/frontend/src/hooks/useChat.ts
       - 复用现有 TODO_TOOL_STORAGE_WHITELIST，把 pruneToolCalls() 改为按工具名分支：
           - create_todo / update_todo / delete_todo：保留 id、toolName、status、message，以及恢复
     UI 所需的 input / output；
         - 其他工具：继续只保留 id、toolName、status、message。
       - 保持 restore 流程不变：继续 JSON.parse 后直接 setMessages(parsed)，不新增 rehydrate 流程。
       - 保持 role='tool' 消息追加逻辑不变；它们继续只承担对话上下文作用，不作为可视 UI 数据源。
     2. 重构 assistant 消息中的 todo 数据派生
       - 文件：packages/frontend/src/features/chat/MessageItem.tsx
       - 将现有 extractTodosFromToolCalls() 拆成更明确的派生逻辑：
           - Todo 卡片数据源：仅从 status === 'success' 的 create_todo / update_todo 的
     output.todo、output.todos 提取；
         - 轻量文本兜底数据：留给 badge 区读取 output.message 或字符串型 output.result；
         - delete_todo：无论输出里是否含有 todo/todos，都不得进入卡片提取逻辑。
       - 继续复用现有 TodoSchema.safeParse() 校验模式。
       - 对同一条 assistant 回复内的多个 create/update 结果按 todo.id
     去重，采用“后写覆盖前写”的合并策略，避免重复卡片。
       - 继续从合并后的 todos 构造 todoIds 并传给 MarkdownRenderer，复用现有 markdown
     任务项去重逻辑。
     3. 调整 assistant 消息渲染顺序
       - 文件：packages/frontend/src/features/chat/MessageItem.tsx
       - 将渲染顺序从当前的“正文 → Todo 卡片 → Tool accordion”改为：
           i. MarkdownRenderer
         ii. ToolCallAccordion
         iii. 合并后的 TodoCardWidget
       - packages/frontend/src/features/chat/MessageList.tsx 中 .filter(msg => msg.role !== 'tool')
     保持不变。
     4. 让 TodoCardWidget 支持聊天态只读展示
       - 文件：packages/frontend/src/features/chat/TodoCardWidget.tsx
       - 新增 readonly?: boolean 属性。
       - 在 readonly 模式下：
           - 不渲染 checkbox；
         - 不渲染 edit / delete 快捷操作；
         - 不触发 todoService.update()；
         - 保留标题、描述、deadline、完成态划线/灰色文案展示。
       - 保持卡片结构继续遵循设计规范：白色卡片、灰色边框、灰色
     header，不把马卡龙色扩散到卡片容器层。
       - 聊天态在 MessageItem 中传入 readonly。
     5. 区分 create / update / delete 的 badge 文案与视觉
       - 文件：packages/frontend/src/features/chat/ToolStatusBadge.tsx
       - 建立 todo 工具名到中文标签的映射：
           - create_todo → 创建待办
         - update_todo → 修改待办
         - delete_todo → 删除待办
       - badge 主文案规则：
           - pending：创建待办中... / 修改待办中... / 删除待办中...
         - success：仅显示 创建待办 / 修改待办 / 删除待办
         - error：同样仅显示操作名，详细错误继续放在 badge 下方的展开区
       - 颜色规则：
           - 仅 todo 工具使用浅色 chip；
         - create：#B8E6C1
         - update：#FFD8A8
         - delete：#FFB5BA
         - 非 todo 工具继续保持当前灰色通用样式
       - 轻量文本兜底：
           - 若没有可渲染的 todo/todos，但 output.message 存在，则显示该文本；
         - 否则若 output.result 为字符串，则显示该字符串；
         - 二者都没有则只显示 badge；
         - error 状态避免与展开区重复展示同一条错误文案。
     6. 更新 accordion 摘要为按操作类型聚合
       - 文件：packages/frontend/src/features/chat/ToolCallAccordion.tsx
       - 保留现有：
           - 单个 tool call 直接渲染 badge；
         - 多个 tool call 使用 accordion；
         - pending 自动展开；
         - 全部完成后延迟折叠。
       - 将 summary 从通用英文计数改为按 toolName 分类聚合：
           - 例如：创建 1 项 · 修改 2 项 · 删除 1 项
       - 仅显示数量大于 0 的项。
       - 未知工具处理：
           - 若与 todo 工具混合出现，追加 其他 X 项；
         - 若全部为未知工具，则回退为 其他 X 项。
       - summary 与 accordion 外壳继续保持灰色中性风格。
     7. 补充最小必要测试
       - packages/frontend/src/hooks/useChat.test.tsx
           - todo 白名单工具在存储后仍保留 input/output；
         - 非 todo 工具仍被裁剪；
         - 从 sessionStorage 恢复后，todo payload 可继续驱动 UI。
       - packages/frontend/src/features/chat/MessageItem.test.tsx
           - assistant 渲染顺序为“正文 → tool accordion → todo card”；
         - 多个 create/update 结果会合并为单个只读卡片区；
         - 同 id todo 去重且后写覆盖前写；
         - delete_todo 不生成 TodoCardWidget；
         - 聊天态向 TodoCardWidget 传入 readonly。
       - packages/frontend/src/features/chat/TodoCardWidget.test.tsx
           - readonly 下隐藏 checkbox / edit / delete；
         - readonly 下不会触发更新请求；
         - 非只读模式现有交互保持可用。
       - packages/frontend/src/features/chat/ToolStatusBadge.test.tsx
           - 中文标签映射；
         - pending 文案；
         - todo 工具马卡龙色与非 todo 灰色样式；
         - output.message / output.result 轻量文本兜底；
         - error 详情展开逻辑与去重展示。
       - packages/frontend/src/features/chat/ToolCallAccordion.test.tsx
           - 分类摘要文本；
         - 未知工具 fallback；
         - 原有自动展开/折叠行为不回归。

     Critical files

     - packages/frontend/src/hooks/useChat.ts
     - packages/frontend/src/features/chat/MessageItem.tsx
     - packages/frontend/src/features/chat/MessageList.tsx
     - packages/frontend/src/features/chat/TodoCardWidget.tsx
     - packages/frontend/src/features/chat/ToolStatusBadge.tsx
     - packages/frontend/src/features/chat/ToolCallAccordion.tsx
     - packages/frontend/src/hooks/useChat.test.tsx
     - packages/frontend/src/features/chat/MessageItem.test.tsx
     - packages/frontend/src/features/chat/TodoCardWidget.test.tsx
     - packages/frontend/src/features/chat/ToolStatusBadge.test.tsx
     - packages/frontend/src/features/chat/ToolCallAccordion.test.tsx

     Existing code and utilities to reuse

     - packages/frontend/src/hooks/useChat.ts
       - TODO_TOOL_STORAGE_WHITELIST
       - inferToolStatus()
     - packages/frontend/src/features/chat/MessageItem.tsx
       - 当前 TodoSchema.safeParse() 校验方式
       - todoIds 传给 MarkdownRenderer 的去重入口
     - packages/frontend/src/features/chat/ToolCallAccordion.tsx
       - 单 tool 直出 / 多 tool 折叠结构
       - pending 自动展开、完成后延迟折叠逻辑
     - packages/frontend/src/constants/colors.ts
       - 现有马卡龙色：#B8E6C1、#FFD8A8、#FFB5BA
     - docs/SPEC/design-system.md
       - 主界面白/灰中性结构
       - 主色蓝仅用于强引导交互
       - 完成态 Todo 使用灰色 + 划线

     Risks and edge cases

     - 旧的 sessionStorage 数据不含 todo 工具完整 payload；刷新后应退化为仅 badge 展示，不能报错。
     - 一次 assistant 回复里多次修改同一 todo 时，若不按 id 去重会出现重复卡片。
     - delete_todo 后端输出即使意外混入 todo/todos，前端也必须强制禁止卡片渲染。
     - 保留 todo 工具完整 payload 会增加 sessionStorage 占用，因此必须严格限制在白名单工具内。
     - message、output.message、output.result 在 error 场景下可能重复，需要去重展示。
     - 非 todo 工具必须维持当前样式与存储裁剪策略，避免扩大回归范围。

     Verification

     Automated

     运行以下前端测试：
     - packages/frontend/src/hooks/useChat.test.tsx
     - packages/frontend/src/features/chat/MessageItem.test.tsx
     - packages/frontend/src/features/chat/TodoCardWidget.test.tsx
     - packages/frontend/src/features/chat/ToolStatusBadge.test.tsx
     - packages/frontend/src/features/chat/ToolCallAccordion.test.tsx

     Manual end-to-end checks

     1. 触发一次 create_todo
       - 确认展示顺序为“正文 → badge/accordion → 只读 Todo 卡片”。
     2. 刷新页面
       - 确认 create/update 生成的 Todo 卡片仍能恢复展示。
     3. 在同一条 assistant 回复中触发多个 create_todo / update_todo
       - 确认摘要为“创建 X 项 · 修改 Y 项”；
       - 确认只出现一个合并后的只读 Todo 卡片区。
     4. 触发 delete_todo
       - 确认只显示删除 badge 与轻量文本；
       - 不出现 Todo 卡片。
     5. 触发一个非 todo 工具
       - 确认仍是灰色通用 badge；
       - 刷新后其大 payload 不会被保留。
     6. 触发一个 todo 工具失败场景
       - 确认只显示错误 badge / 错误详情，不渲染误导性的 Todo 卡片。
  ⎿  Interrupted · What should Claude do instead?
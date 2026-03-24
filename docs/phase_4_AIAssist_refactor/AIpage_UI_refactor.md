# NanoMail 对话页面 UI 优化计划

## Context

当前对话页面存在色彩未对齐设计系统、业务数据展示过于简陋、视觉层次扁平等问题。本次优化基于"现代极简"与"轻量卡片化"的设计规范，重构对话区的视觉体验。

**目标**：
- 统一色彩系统，对齐设计规范
- 增强视觉层次感
- 提升 Todo 卡片的专业感
- 优化交互反馈细节

---

## Files to Modify

| 文件 | 改动类型 |
|------|----------|
| `packages/frontend/src/components/icons/CoffeeIcon.tsx` | 新建 |
| `packages/frontend/src/components/icons/index.ts` | 新建 |
| `packages/frontend/src/features/chat/ChatPage.tsx` | 修改 |
| `packages/frontend/src/features/chat/ChatInput.tsx` | 修改 |
| `packages/frontend/src/features/chat/MessageList.tsx` | 修改 |
| `packages/frontend/src/features/chat/MessageItem.tsx` | 修改 |
| `packages/frontend/src/features/chat/TodoCardWidget.tsx` | 修改 |

---

## Implementation Steps

### Step 1: 创建 CoffeeIcon 组件

**文件**: `packages/frontend/src/components/icons/CoffeeIcon.tsx`

创建可复用的咖啡杯图标组件，支持 className 透传：

```typescript
import { cn } from '@/lib/utils'

interface CoffeeIconProps {
  className?: string
}

export function CoffeeIcon({ className }: CoffeeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
      <path d="M6 2v2"/>
      <path d="M10 2v2"/>
      <path d="M14 2v2"/>
      <circle cx="8" cy="13" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="13" r="1.2" fill="currentColor" stroke="none"/>
      <path d="M8 16c1 1.5 3 1.5 4 0"/>
    </svg>
  )
}
```

**文件**: `packages/frontend/src/components/icons/index.ts`
```typescript
export { CoffeeIcon } from './CoffeeIcon'
```

---

### Step 2: 优化 ChatPage 背景层次

**文件**: `packages/frontend/src/features/chat/ChatPage.tsx`

**改动**：
- 移除 ChatPage 的 `bg-white`（改为透明）
- Header 保持纯白背景
- MessageList 容器添加 `bg-gray-50`
- ChatInput 容器添加向上弥散阴影

```diff
- <div className="flex flex-col h-full bg-white">
+ <div className="flex flex-col h-full">

  {/* Header - 保持纯白 */}
  <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">

  {/* Message List - 添加浅灰背景 */}
- <div className="flex-1 overflow-y-auto">
+ <div className="flex-1 overflow-y-auto bg-gray-50">
    <MessageList ... />
  </div>

  {/* Chat Input - 添加顶部弥散阴影 */}
- <div className="border-t border-gray-200">
+ <div className="border-t border-gray-200 bg-white shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.05)]">
    <ChatInput ... />
  </div>
</div>
```

---

### Step 3: 优化 Header 区域

**文件**: `packages/frontend/src/features/chat/ChatPage.tsx`

**改动**：
1. 图标替换：Sparkles → CoffeeIcon，外层增加圆角容器
2. Clear 按钮补充 hover 背景和文字加深

```diff
- import { Sparkles, Trash2 } from 'lucide-react'
+ import { Trash2 } from 'lucide-react'
+ import { CoffeeIcon } from '@/components/icons'

  {/* Header icon */}
  <div className="flex items-center gap-3">
-   <Sparkles className="h-5 w-5 text-blue-600" />
+   <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-600/10">
+     <CoffeeIcon className="h-[18px] w-[18px]" />
+   </div>
    <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
  </div>

  {/* Clear button */}
  <Button
    variant="ghost"
    size="sm"
    onClick={clearSession}
-   className="text-gray-500 hover:text-gray-700"
+   className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
  >
```

---

### Step 4: 优化 AI 头像样式

**文件**: `packages/frontend/src/features/chat/MessageItem.tsx`

**改动**：
1. AI 头像背景：`bg-purple-100` → `bg-blue-50 border border-blue-600/10`
2. 图标：Sparkles → CoffeeIcon
3. 角色名称：`font-semibold text-gray-900`（AI 消息）

```diff
- import { User, Sparkles } from 'lucide-react'
+ import { User } from 'lucide-react'
+ import { CoffeeIcon } from '@/components/icons'

  {/* Avatar container */}
  <div className={cn(
    "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
-   isUser ? "bg-blue-600" : "bg-purple-100"
+   isUser
+     ? "bg-blue-600"
+     : "bg-blue-50 border border-blue-600/10"
  )}>
    {isUser ? (
      <User className="h-4 w-4 text-white" />
    ) : (
-     <Sparkles className="h-4 w-4 text-purple-600" />
+     <CoffeeIcon className="h-4 w-4 text-blue-600" />
    )}
  </div>

  {/* Role label */}
  <span className="text-sm font-semibold text-gray-900">
    {isUser ? 'You' : 'AI Assistant'}
  </span>
```

---

### Step 5: 优化 MessageList 留白

**文件**: `packages/frontend/src/features/chat/MessageList.tsx`

**改动**：
- 移除消息间分割线
- 增加垂直间距（py-8 + gap-8）

```diff
- <div ref={contentRef} className="max-w-3xl mx-auto px-4 divide-y divide-gray-100">
+ <div ref={contentRef} className="max-w-3xl mx-auto px-4 py-8">
+   <div className="flex flex-col gap-8">
      {messages.map(msg => (
        <MessageItem ... />
      ))}
+   </div>
    <div ref={bottomRef} />
  </div>
```

---

### Step 6: 优化 TodoCardWidget

**文件**: `packages/frontend/src/features/chat/TodoCardWidget.tsx`

**改动**：
1. 时间标签主色化：`bg-blue-50 text-blue-600`
2. 悬浮阴影加深：`hover:shadow-md`
3. 快捷操作图标渐显：编辑、删除（group-hover）
4. 新增 onEdit、onDelete 可选回调

```diff
+ import { Pencil, Trash2 } from 'lucide-react'

  interface TodoCardWidgetProps {
    todos: Todo[]
    onUpdate?: () => void
+   onEdit?: (todoId: string) => void
+   onDelete?: (todoId: string) => void
  }

  {/* Todo item */}
- <li key={todo.id} className="px-3 py-2 flex items-center gap-3 hover:bg-gray-50">
+ <li className="group px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 rounded-md transition-shadow hover:shadow-md">

    {/* Checkbox - unchanged */}

    {/* Description */}
    <span className={cn(...)}>{todo.description}</span>

    {/* Deadline - 主色化 */}
    {todo.deadline && (
-     <span className="text-xs text-gray-500">
+     <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
        {formatDeadline(todo.deadline)}
      </span>
    )}

+   {/* Quick actions - 悬浮渐显 */}
+   <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
+     {onEdit && (
+       <button
+         type="button"
+         onClick={() => onEdit(String(todo.id))}
+         className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
+         aria-label="Edit todo"
+       >
+         <Pencil className="h-3.5 w-3.5" />
+       </button>
+     )}
+     {onDelete && (
+       <button
+         type="button"
+         onClick={() => onDelete(String(todo.id))}
+         className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
+         aria-label="Delete todo"
+       >
+         <Trash2 className="h-3.5 w-3.5" />
+       </button>
+     )}
+   </div>
  </li>
```

---

### Step 7: 优化 ChatInput

**文件**: `packages/frontend/src/features/chat/ChatInput.tsx`

**改动**：
1. 输入框 focus 状态：默认 `border-gray-200`，focus 时变主色
2. 发送按钮禁用/激活态样式区分
3. 快捷键提示弱化：`text-[11px] text-gray-500`

```diff
  {/* Textarea */}
  <textarea
    className={cn(
      'flex-1 resize-none rounded-lg border px-3 py-2',
      'min-h-[40px] max-h-[120px] overflow-y-auto',
-     'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
+     'border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600',
      'disabled:bg-gray-100 disabled:cursor-not-allowed',
      'text-sm leading-relaxed'
    )}
  />

  {/* Send button - 禁用态 */}
  <Button
    type="button"
    size="icon"
    onClick={handleSubmit}
    disabled={isSendDisabled}
    aria-label="Send message"
-   className="shrink-0"
+   className={cn(
+     "shrink-0 transition-colors",
+     isSendDisabled
+       ? "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100"
+       : "bg-blue-600 text-white hover:bg-blue-700"
+   )}
  >
    <Send className="h-4 w-4" />
  </Button>

  {/* Keyboard hint - 弱化 */}
- <p className="text-xs text-gray-400 mt-2 text-center">
+ <p className="text-[11px] text-gray-500 mt-2 text-center">
    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Enter</kbd>
```

---

## Verification

1. **启动开发服务器**：`pnpm --filter @nanomail/frontend dev`
2. **视觉检查**：
   - 聊天区域背景为 `bg-gray-50`，Header 和 Input 为纯白
   - 输入区顶部有轻微向上阴影
   - 咖啡杯图标正确显示（Header 和 AI 头像）
   - Clear 按钮 hover 有背景和文字加深
   - AI 头像为 `bg-blue-50`，不再是紫色
3. **交互检查**：
   - 输入框 focus 时边框变蓝
   - 发送按钮空输入时为灰色禁用态
   - 有输入时发送按钮为蓝色激活态
   - Todo 卡片悬浮时阴影加深、操作图标渐显
4. **运行测试**：`pnpm --filter @nanomail/frontend test`

---

## Risk Assessment

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| CoffeeIcon SVG 尺寸不适配 | 低 | 使用 className 透传，默认 h-4 w-4 |
| 发送按钮样式覆盖 Button 组件默认 | 低 | 使用 cn() 条件合并，避免 !important |
| TodoCardWidget 新增 props 不影响现有调用 | 低 | onEdit/onDelete 为可选参数 |
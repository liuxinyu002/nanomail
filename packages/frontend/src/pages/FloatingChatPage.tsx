import { useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { Button } from '@/components/ui/button'
import { Minus, Send, StopCircle } from 'lucide-react'
import type { FloatingWindowAPI } from '@nanomail/shared'
import { MessageItem } from '@/features/chat/MessageItem'

/**
 * 悬浮窗聊天页面
 *
 * 规格:
 * - 固定高度 600px
 * - 顶部 32px 拖拽热区
 * - 失焦自动隐藏（由主进程控制）
 * - 复用 useChat hook 实现聊天功能
 * - 复用 MessageItem 组件渲染消息（隐藏头像）
 */
export default function FloatingChatPage() {
  const {
    messages,
    isStreaming,
    isInputDisabled,
    error,
    sendMessage,
    stopGeneration,
  } = useChat()

  // 本地输入状态
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input)
      setInput('')
    }
  }

  // 类型守卫：检查是否为悬浮窗 API
  const isFloatingAPI = (api: unknown): api is FloatingWindowAPI => {
    return typeof api === 'object' && api !== null && 'hideWindow' in api
  }

  return (
    <div className="h-screen flex flex-col bg-white/95 rounded-xl overflow-hidden border border-gray-200/50">
      {/* 拖拽区域 */}
      <div
        className="h-8 flex items-center justify-end px-3 bg-gray-50/80 border-b border-gray-100 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/*
          隐藏按钮 - 必须设置 no-drag 以响应点击
          注意：确保按钮 z-index 和 position 不被父级 drag 属性屏蔽
        */}
        <button
          className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors duration-150 relative z-10"
          onClick={() => {
            if (isFloatingAPI(window.electronAPI)) {
              window.electronAPI.hideWindow()
            }
          }}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="Hide"
        >
          <Minus className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="px-3 py-1.5 bg-red-50 border-b border-red-200 shrink-0">
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            Send a message to start chatting
          </div>
        )}
        {messages
          .filter(msg => msg.role !== 'tool')
          .map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && msg.role === 'assistant' && !msg.content}
              isCompact
            />
          ))}
      </div>

      {/* 输入区域 */}
      <div className="p-3 border-t border-gray-100 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && input.trim() && !isInputDisabled) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={isInputDisabled ? "AI is responding in another window..." : "Type a message..."}
            disabled={isInputDisabled}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
          />
          {isStreaming ? (
            <Button size="sm" variant="destructive" onClick={stopGeneration}>
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || isInputDisabled}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
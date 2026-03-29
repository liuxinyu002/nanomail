import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { MainLayout } from '@/components/layout/MainLayout'
import { InboxPage } from '@/pages/InboxPage'
import { TodosPage } from '@/pages/TodosPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ChatPage } from '@/pages/ChatPage'
import FloatingChatPage from '@/pages/FloatingChatPage'

/**
 * 主应用组件
 *
 * 重要：使用 HashRouter 而非 BrowserRouter
 * 原因：Electron 生产环境加载 file:// 协议的本地文件时，
 * 无法进行服务端 URL rewrite，只有 HashRouter 能正常工作。
 */
function App() {
  return (
    <HashRouter>
      <Toaster position="bottom-right" />
      <Routes>
        {/* 悬浮窗专用路由 */}
        <Route path="/floating" element={<FloatingChatPage />} />

        {/* 主窗口路由 */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/inbox" replace />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="inbox/:emailId" element={<InboxPage />} />
          <Route path="todos" element={<TodosPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="chat" element={<ChatPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
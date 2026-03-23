import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock BrowserRouter to use MemoryRouter for testing
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

// Mock page components to avoid complex rendering
vi.mock('@/pages/InboxPage', () => ({
  InboxPage: () => <div data-testid="inbox-page">Inbox Page</div>,
}))

vi.mock('@/pages/TodosPage', () => ({
  TodosPage: () => <div data-testid="todos-page">Todos Page</div>,
}))

vi.mock('@/pages/SettingsPage', () => ({
  SettingsPage: () => <div data-testid="settings-page">Settings Page</div>,
}))

vi.mock('@/pages/ChatPage', () => ({
  ChatPage: () => <div data-testid="chat-page">Chat Page</div>,
}))

// Import App after mocks are set up
import App from './App'

const renderWithRouter = (initialRoute: string) => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  )
}

describe('App Routing', () => {
  describe('Chat Route', () => {
    it('should render ChatPage when navigating to /chat', () => {
      renderWithRouter('/chat')

      expect(screen.getByTestId('chat-page')).toBeInTheDocument()
    })

    it('should render ChatPage within MainLayout', () => {
      renderWithRouter('/chat')

      // MainLayout has a sidebar with "NanoMail" branding
      expect(screen.getByText('NanoMail')).toBeInTheDocument()
      expect(screen.getByTestId('chat-page')).toBeInTheDocument()
    })
  })

  describe('Default Route', () => {
    it('should redirect to /inbox by default', () => {
      renderWithRouter('/')

      expect(screen.getByTestId('inbox-page')).toBeInTheDocument()
    })
  })

  describe('Existing Routes', () => {
    it('should render InboxPage when navigating to /inbox', () => {
      renderWithRouter('/inbox')

      expect(screen.getByTestId('inbox-page')).toBeInTheDocument()
    })

    it('should render TodosPage when navigating to /todos', () => {
      renderWithRouter('/todos')

      expect(screen.getByTestId('todos-page')).toBeInTheDocument()
    })

    it('should render SettingsPage when navigating to /settings', () => {
      renderWithRouter('/settings')

      expect(screen.getByTestId('settings-page')).toBeInTheDocument()
    })
  })
})

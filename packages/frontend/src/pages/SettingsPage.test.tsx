import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from './SettingsPage'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

const defaultMockSettings = {
  IMAP_HOST: '',
  IMAP_PORT: '',
  IMAP_USER: '',
  IMAP_PASS: '',
  SMTP_HOST: '',
  SMTP_PORT: '',
  SMTP_USER: '',
  SMTP_PASS: '',
  LLM_API_KEY: '',
  LLM_MODEL: '',
  LLM_BASE_URL: '',
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Default mock for loading settings
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => defaultMockSettings,
    })
  })

  describe('Layout and Structure', () => {
    it('should render the page title', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
    })

    it('should render two tabs: Email Servers and AI Engine', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      expect(screen.getByRole('tab', { name: /email servers/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /ai engine/i })).toBeInTheDocument()
    })

    it('should show Email Servers tab as default', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      const emailServersTab = screen.getByRole('tab', { name: /email servers/i })
      expect(emailServersTab).toHaveAttribute('data-state', 'active')
    })
  })

  describe('Email Servers Tab', () => {
    it('should render IMAP configuration card', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      // Use text content since CardTitle is a div, not a heading
      expect(screen.getByText(/imap configuration/i)).toBeInTheDocument()
    })

    it('should render SMTP configuration card', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      expect(screen.getByText(/smtp configuration/i)).toBeInTheDocument()
    })

    it('should render all IMAP fields', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      expect(screen.getByPlaceholderText(/imap.example.com/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('993')).toBeInTheDocument()
    })

    it('should render all SMTP fields', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      expect(screen.getByPlaceholderText(/smtp.example.com/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('587')).toBeInTheDocument()
    })

    it('should mask password fields', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      // Find password inputs by their type
      const passwordInputs = screen.getAllByPlaceholderText('••••••••')
      expect(passwordInputs.length).toBe(2) // IMAP and SMTP passwords
      passwordInputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'password')
      })
    })
  })

  describe('AI Engine Tab', () => {
    it('should render LLM configuration card when AI tab is clicked', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<SettingsPage />)
      })

      await user.click(screen.getByRole('tab', { name: /ai engine/i }))

      expect(screen.getByText(/llm configuration/i)).toBeInTheDocument()
    })

    it('should render LLM provider field', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<SettingsPage />)
      })

      await user.click(screen.getByRole('tab', { name: /ai engine/i }))

      expect(screen.getByPlaceholderText('openai')).toBeInTheDocument()
    })

    it('should render API key field', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<SettingsPage />)
      })

      await user.click(screen.getByRole('tab', { name: /ai engine/i }))

      expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument()
    })

    it('should render model field', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<SettingsPage />)
      })

      await user.click(screen.getByRole('tab', { name: /ai engine/i }))

      expect(screen.getByPlaceholderText('gpt-4')).toBeInTheDocument()
    })

    it('should render base URL field (optional)', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<SettingsPage />)
      })

      await user.click(screen.getByRole('tab', { name: /ai engine/i }))

      expect(screen.getByPlaceholderText(/api.openai.com/i)).toBeInTheDocument()
    })
  })

  describe('Save Functionality', () => {
    it('should render Save Settings button', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument()
    })

    it('should call API when Save is clicked', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => defaultMockSettings,
      })
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })

      await act(async () => {
        render(<SettingsPage />)
      })

      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/settings')
      })

      // Click save
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/settings',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        )
      })
    })

    it('should show loading state while saving', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => defaultMockSettings,
      })
      // Make save request hang
      let resolveSave: (value: unknown) => void
      mockFetch.mockImplementationOnce(
        () => new Promise(resolve => {
          resolveSave = resolve
        })
      )

      await act(async () => {
        render(<SettingsPage />)
      })

      await user.click(screen.getByRole('button', { name: /save settings/i }))

      // Button should show loading state
      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()

      // Resolve the save
      await act(async () => {
        resolveSave!({ ok: true, json: async () => ({ success: true }) })
      })
    })
  })

  describe('Data Loading', () => {
    it('should load existing settings on mount', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/settings')
      })
    })

    it('should populate form fields with loaded settings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...defaultMockSettings,
          IMAP_HOST: 'imap.example.com',
          IMAP_PORT: '993',
        }),
      })

      await act(async () => {
        render(<SettingsPage />)
      })

      await waitFor(() => {
        const imapHostInput = screen.getByPlaceholderText(/imap.example.com/i) as HTMLInputElement
        expect(imapHostInput.value).toBe('imap.example.com')
      })

      await waitFor(() => {
        const imapPortInput = screen.getByPlaceholderText('993') as HTMLInputElement
        expect(imapPortInput.value).toBe('993')
      })
    })
  })
})
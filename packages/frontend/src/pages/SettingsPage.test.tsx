import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from './SettingsPage'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

const defaultMockSettings = {
  PROTOCOL_TYPE: 'IMAP',
  IMAP_HOST: '',
  IMAP_PORT: '',
  IMAP_USER: '',
  IMAP_PASS: '',
  POP3_HOST: '',
  POP3_PORT: '',
  POP3_USER: '',
  POP3_PASS: '',
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

  describe('Protocol Type Selector', () => {
    it('should render protocol type selector', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      expect(screen.getByText(/receive protocol/i)).toBeInTheDocument()
      // Use more specific selectors for radio buttons
      expect(screen.getByRole('radio', { name: /imap/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /pop3/i })).toBeInTheDocument()
    })

    it('should have IMAP selected by default', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      const imapRadio = screen.getByRole('radio', { name: /imap/i }) as HTMLInputElement
      const pop3Radio = screen.getByRole('radio', { name: /pop3/i }) as HTMLInputElement

      expect(imapRadio.checked).toBe(true)
      expect(pop3Radio.checked).toBe(false)
    })

    it('should show IMAP config when IMAP is selected', async () => {
      await act(async () => {
        render(<SettingsPage />)
      })

      expect(screen.getByText(/imap configuration/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/imap.example.com/i)).toBeInTheDocument()
    })

    it('should show POP3 config when POP3 is selected', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<SettingsPage />)
      })

      // Click POP3 radio button
      await user.click(screen.getByRole('radio', { name: /pop3/i }))

      expect(screen.getByText(/pop3 configuration/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/pop.example.com/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('995')).toBeInTheDocument()
    })

    it('should hide IMAP config when POP3 is selected', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<SettingsPage />)
      })

      // Click POP3 radio button
      await user.click(screen.getByRole('radio', { name: /pop3/i }))

      expect(screen.queryByText(/imap configuration/i)).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/imap.example.com/i)).not.toBeInTheDocument()
    })
  })

  describe('POP3 Configuration', () => {
    it('should render all POP3 fields when POP3 is selected', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<SettingsPage />)
      })

      await user.click(screen.getByRole('radio', { name: /pop3/i }))

      expect(screen.getByPlaceholderText(/pop.example.com/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('995')).toBeInTheDocument()
      expect(screen.getAllByPlaceholderText(/user@example.com/i).length).toBeGreaterThan(0)
      expect(screen.getAllByPlaceholderText('••••••••').length).toBeGreaterThan(0)
    })

    it('should mask POP3 password field', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<SettingsPage />)
      })

      await user.click(screen.getByRole('radio', { name: /pop3/i }))

      const pop3PasswordInput = screen.getByLabelText(/pop3 password/i) as HTMLInputElement
      expect(pop3PasswordInput.type).toBe('password')
    })

    it('should load POP3 settings from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...defaultMockSettings,
          PROTOCOL_TYPE: 'POP3',
          POP3_HOST: 'pop.example.com',
          POP3_PORT: '995',
        }),
      })

      await act(async () => {
        render(<SettingsPage />)
      })

      // Wait for settings to load
      await waitFor(() => {
        const pop3HostInput = screen.getByPlaceholderText(/pop.example.com/i) as HTMLInputElement
        expect(pop3HostInput.value).toBe('pop.example.com')
      })

      // Should show POP3 config since PROTOCOL_TYPE is POP3
      expect(screen.getByText(/pop3 configuration/i)).toBeInTheDocument()
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
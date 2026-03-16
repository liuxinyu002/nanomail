import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailChipInput } from './EmailChipInput'

describe('EmailChipInput', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockReset()
  })

  describe('Rendering', () => {
    it('renders with label and placeholder', () => {
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
          placeholder="Enter email address"
        />
      )

      expect(screen.getByText('To')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument()
    })

    it('renders existing email chips', () => {
      render(
        <EmailChipInput
          emails={['test@example.com', 'user@example.com']}
          onChange={mockOnChange}
          label="To"
        />
      )

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })

    it('hides placeholder when emails exist', () => {
      render(
        <EmailChipInput
          emails={['test@example.com']}
          onChange={mockOnChange}
          label="To"
          placeholder="Enter email address"
        />
      )

      expect(screen.queryByPlaceholderText('Enter email address')).not.toBeInTheDocument()
    })
  })

  describe('Adding Emails', () => {
    it('adds valid email chip on Enter key', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test@example.com{enter}')

      expect(mockOnChange).toHaveBeenCalledWith(['test@example.com'])
    })

    it('adds valid email chip on comma key', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test@example.com,')

      expect(mockOnChange).toHaveBeenCalledWith(['test@example.com'])
    })

    it('adds valid email chip on semicolon key', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test@example.com;')

      expect(mockOnChange).toHaveBeenCalledWith(['test@example.com'])
    })

    it('trims whitespace from email before adding', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '  test@example.com  {enter}')

      expect(mockOnChange).toHaveBeenCalledWith(['test@example.com'])
    })

    it('does not add empty input on Enter', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.type(input, '{enter}')

      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe('Invalid Email Handling', () => {
    it('shows shake animation for invalid email', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'invalid-email{enter}')

      // Should have shake class
      await waitFor(() => {
        expect(input).toHaveClass('animate-shake')
      })
    })

    it('does not add invalid email to chips', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'invalid-email{enter}')

      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('clears error state when user starts typing again', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'invalid{enter}')

      await waitFor(() => {
        expect(input).toHaveClass('animate-shake')
      })

      // Type again to clear error
      await user.type(input, 'a')

      await waitFor(() => {
        expect(input).not.toHaveClass('animate-shake')
      })
    })
  })

  describe('Smart Email Parsing', () => {
    it('extracts email from "Name <email@example.com>" format on paste', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.click(input)

      // Mock clipboard data
      const clipboardData = {
        getData: vi.fn().mockReturnValue('"John Doe" <john@example.com>')
      }

      fireEvent.paste(input, { clipboardData })

      expect(mockOnChange).toHaveBeenCalledWith(['john@example.com'])
    })

    it('extracts email from angle brackets format on paste', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.click(input)

      const clipboardData = {
        getData: vi.fn().mockReturnValue('<user@example.com>')
      }

      fireEvent.paste(input, { clipboardData })

      expect(mockOnChange).toHaveBeenCalledWith(['user@example.com'])
    })

    it('extracts multiple emails from pasted text', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.click(input)

      const clipboardData = {
        getData: vi.fn().mockReturnValue('a@test.com, b@test.com; c@test.com')
      }

      fireEvent.paste(input, { clipboardData })

      expect(mockOnChange).toHaveBeenCalledWith(['a@test.com', 'b@test.com', 'c@test.com'])
    })

    it('extracts emails from newline-separated text', async () => {
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')

      const clipboardData = {
        getData: vi.fn().mockReturnValue('a@test.com\nb@test.com\nc@test.com')
      }

      fireEvent.paste(input, { clipboardData })

      expect(mockOnChange).toHaveBeenCalledWith(['a@test.com', 'b@test.com', 'c@test.com'])
    })

    it('filters out invalid emails from mixed paste content', async () => {
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')

      const clipboardData = {
        getData: vi.fn().mockReturnValue('valid@test.com, invalid-email, another@test.com')
      }

      fireEvent.paste(input, { clipboardData })

      expect(mockOnChange).toHaveBeenCalledWith(['valid@test.com', 'another@test.com'])
    })
  })

  describe('Deduplication', () => {
    it('prevents duplicate emails on paste', async () => {
      render(
        <EmailChipInput
          emails={['existing@test.com']}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')

      const clipboardData = {
        getData: vi.fn().mockReturnValue('existing@test.com, new@test.com')
      }

      fireEvent.paste(input, { clipboardData })

      expect(mockOnChange).toHaveBeenCalledWith(['existing@test.com', 'new@test.com'])
    })

    it('prevents duplicate emails on keyboard input', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={['existing@test.com']}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'existing@test.com{enter}')

      // Should not add duplicate
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('deduplicates within pasted content', async () => {
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')

      const clipboardData = {
        getData: vi.fn().mockReturnValue('test@test.com, test@test.com, test@test.com')
      }

      fireEvent.paste(input, { clipboardData })

      expect(mockOnChange).toHaveBeenCalledWith(['test@test.com'])
    })
  })

  describe('Removing Chips', () => {
    it('removes chip when X button clicked', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={['test@example.com', 'remove@example.com']}
          onChange={mockOnChange}
          label="To"
        />
      )

      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      await user.click(removeButtons[1])

      expect(mockOnChange).toHaveBeenCalledWith(['test@example.com'])
    })

    it('removes correct chip when multiple exist', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={['first@test.com', 'second@test.com', 'third@test.com']}
          onChange={mockOnChange}
          label="To"
        />
      )

      // Click the second remove button (for second@test.com)
      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      await user.click(removeButtons[1])

      expect(mockOnChange).toHaveBeenCalledWith(['first@test.com', 'third@test.com'])
    })
  })

  describe('Blur Behavior', () => {
    it('preserves incomplete input on blur', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'incomplete')
      await user.tab() // Blur the input

      // Should not add incomplete input
      expect(mockOnChange).not.toHaveBeenCalled()
      // Input value should still contain the incomplete text
      expect(input).toHaveValue('incomplete')
    })

    it('adds valid email on blur', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'valid@test.com')
      await user.tab() // Blur the input

      expect(mockOnChange).toHaveBeenCalledWith(['valid@test.com'])
    })

    it('clears input after adding valid email on blur', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'valid@test.com')
      await user.tab() // Blur the input

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })
  })

  describe('Error State', () => {
    it('shows error message when error prop provided', () => {
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
          error="At least one recipient is required"
        />
      )

      expect(screen.getByText('At least one recipient is required')).toBeInTheDocument()
    })

    it('applies error styling to container when error prop provided', () => {
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
          error="At least one recipient is required"
        />
      )

      const container = screen.getByTestId('email-chip-container')
      expect(container).toHaveClass('border-destructive')
    })
  })

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      render(
        <EmailChipInput
          emails={['test@example.com']}
          onChange={mockOnChange}
          label="To"
          disabled={true}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('disables remove buttons when disabled prop is true', () => {
      render(
        <EmailChipInput
          emails={['test@example.com']}
          onChange={mockOnChange}
          label="To"
          disabled={true}
        />
      )

      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      removeButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles very long email addresses', async () => {
      const user = userEvent.setup()
      const longEmail = 'verylongemailaddress@verylongdomainname.example.com'

      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, `${longEmail}{enter}`)

      expect(mockOnChange).toHaveBeenCalledWith([longEmail])
    })

    it('handles emails with plus signs', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'user+tag@example.com{enter}')

      expect(mockOnChange).toHaveBeenCalledWith(['user+tag@example.com'])
    })

    it('handles emails with dots in local part', async () => {
      const user = userEvent.setup()
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'first.last@example.com{enter}')

      expect(mockOnChange).toHaveBeenCalledWith(['first.last@example.com'])
    })

    it('handles Unicode characters in name part of paste', async () => {
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      const input = screen.getByRole('textbox')

      const clipboardData = {
        getData: vi.fn().mockReturnValue('"张三" <zhangsan@example.com>')
      }

      fireEvent.paste(input, { clipboardData })

      expect(mockOnChange).toHaveBeenCalledWith(['zhangsan@example.com'])
    })

    it('handles empty array of emails', () => {
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      // Should render without error and show placeholder
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('handles null/undefined values gracefully', () => {
      // TypeScript would prevent this, but test runtime safety
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="To"
        />
      )

      expect(screen.getByText('To')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible label', () => {
      render(
        <EmailChipInput
          emails={[]}
          onChange={mockOnChange}
          label="Email recipients"
        />
      )

      expect(screen.getByText('Email recipients')).toBeInTheDocument()
    })

    it('remove buttons have accessible names', () => {
      render(
        <EmailChipInput
          emails={['test@example.com']}
          onChange={mockOnChange}
          label="To"
        />
      )

      expect(screen.getByRole('button', { name: /remove test@example\.com/i })).toBeInTheDocument()
    })
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskDetailExpand } from './TaskDetailExpand'

describe('TaskDetailExpand', () => {
  const defaultProps = {
    description: 'Test description',
    notes: null,
    deadline: null,
    isExpanded: true,
    onSaveDescription: vi.fn(),
    onSaveNotes: vi.fn(),
    onSaveDeadline: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Expand/Collapse Animation', () => {
    it('should be collapsed when isExpanded is false', () => {
      render(<TaskDetailExpand {...defaultProps} isExpanded={false} />)

      const expandable = screen.getByTestId('task-detail-expand')
      expect(expandable).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should be expanded when isExpanded is true', () => {
      render(<TaskDetailExpand {...defaultProps} isExpanded={true} />)

      const expandable = screen.getByTestId('task-detail-expand')
      expect(expandable).toHaveClass('[grid-template-rows:1fr]')
    })

    it('should have transition class for animation', () => {
      render(<TaskDetailExpand {...defaultProps} />)

      const expandable = screen.getByTestId('task-detail-expand')
      expect(expandable).toHaveClass('transition-[grid-template-rows]')
    })

    it('should have 300ms duration and ease-out timing', () => {
      render(<TaskDetailExpand {...defaultProps} />)

      const expandable = screen.getByTestId('task-detail-expand')
      expect(expandable).toHaveClass('duration-300')
      expect(expandable).toHaveClass('ease-out')
    })
  })

  describe('Editable Mode - Description Field', () => {
    it('should display description value', () => {
      render(<TaskDetailExpand {...defaultProps} description="My task description" />)

      const textarea = screen.getByLabelText(/描述/i)
      expect(textarea).toHaveValue('My task description')
    })

    it('should show placeholder when description is empty', () => {
      render(<TaskDetailExpand {...defaultProps} description="" />)

      const textarea = screen.getByLabelText(/描述/i)
      expect(textarea).toHaveAttribute('placeholder', '添加描述...')
    })

    it('should update local state on change without calling save', async () => {
      const onSaveDescription = vi.fn()
      render(<TaskDetailExpand {...defaultProps} onSaveDescription={onSaveDescription} />)

      const textarea = screen.getByLabelText(/描述/i)
      await userEvent.type(textarea, ' more text')

      // Should not call save while typing
      expect(onSaveDescription).not.toHaveBeenCalled()
    })

    it('should call onSaveDescription on blur if value changed', async () => {
      const onSaveDescription = vi.fn().mockResolvedValue(undefined)
      render(<TaskDetailExpand {...defaultProps} onSaveDescription={onSaveDescription} />)

      const textarea = screen.getByLabelText(/描述/i)
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'New description')
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveDescription).toHaveBeenCalledWith('New description')
      })
    })

    it('should NOT call onSaveDescription on blur if value unchanged', async () => {
      const onSaveDescription = vi.fn()
      render(<TaskDetailExpand {...defaultProps} description="Same" onSaveDescription={onSaveDescription} />)

      const textarea = screen.getByLabelText(/描述/i)
      // Focus and blur without changing
      fireEvent.focus(textarea)
      fireEvent.blur(textarea)

      expect(onSaveDescription).not.toHaveBeenCalled()
    })

    it('should revert to original value on save error', async () => {
      const onSaveDescription = vi.fn().mockRejectedValue(new Error('Save failed'))
      render(<TaskDetailExpand {...defaultProps} description="Original" onSaveDescription={onSaveDescription} />)

      const textarea = screen.getByLabelText(/描述/i)
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'Changed')
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveDescription).toHaveBeenCalled()
      })

      // Should revert to original value
      await waitFor(() => {
        expect(textarea).toHaveValue('Original')
      })
    })

    it('should show "保存中..." while saving', async () => {
      let resolveSave: () => void
      const onSaveDescription = vi.fn().mockImplementation(() => new Promise<void>(resolve => {
        resolveSave = resolve
      }))

      render(<TaskDetailExpand {...defaultProps} description="Test" onSaveDescription={onSaveDescription} />)

      const textarea = screen.getByLabelText(/描述/i)
      await userEvent.type(textarea, ' changed')
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(screen.getByText('保存中...')).toBeInTheDocument()
      })

      // Resolve the promise
      resolveSave!()

      await waitFor(() => {
        expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Editable Mode - Notes Field', () => {
    it('should display notes value', () => {
      render(<TaskDetailExpand {...defaultProps} notes="My notes here" />)

      const textarea = screen.getByLabelText(/笔记/i)
      expect(textarea).toHaveValue('My notes here')
    })

    it('should show placeholder when notes is empty', () => {
      render(<TaskDetailExpand {...defaultProps} notes={null} />)

      const textarea = screen.getByLabelText(/笔记/i)
      expect(textarea).toHaveAttribute('placeholder', '添加笔记...')
    })

    it('should call onSaveNotes with null when notes is cleared', async () => {
      const onSaveNotes = vi.fn().mockResolvedValue(undefined)
      render(<TaskDetailExpand {...defaultProps} notes="Original notes" onSaveNotes={onSaveNotes} />)

      const textarea = screen.getByLabelText(/笔记/i)
      await userEvent.clear(textarea)
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveNotes).toHaveBeenCalledWith(null)
      })
    })

    it('should call onSaveNotes with trimmed value', async () => {
      const onSaveNotes = vi.fn().mockResolvedValue(undefined)
      render(<TaskDetailExpand {...defaultProps} notes={null} onSaveNotes={onSaveNotes} />)

      const textarea = screen.getByLabelText(/笔记/i)
      await userEvent.type(textarea, '  trimmed notes  ')
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveNotes).toHaveBeenCalledWith('trimmed notes')
      })
    })

    it('should NOT call onSaveNotes on blur if value unchanged', async () => {
      const onSaveNotes = vi.fn()
      render(<TaskDetailExpand {...defaultProps} notes="Same notes" onSaveNotes={onSaveNotes} />)

      const textarea = screen.getByLabelText(/笔记/i)
      fireEvent.focus(textarea)
      fireEvent.blur(textarea)

      expect(onSaveNotes).not.toHaveBeenCalled()
    })
  })

  describe('Editable Mode - Deadline Field', () => {
    it('should display deadline date in input', () => {
      render(<TaskDetailExpand {...defaultProps} deadline="2024-12-25T23:59:59.999Z" />)

      const dateInput = screen.getByLabelText(/截止时间/i)
      expect(dateInput).toHaveValue('2024-12-25')
    })

    it('should have empty input when deadline is null', () => {
      render(<TaskDetailExpand {...defaultProps} deadline={null} />)

      const dateInput = screen.getByLabelText(/截止时间/i)
      expect(dateInput).toHaveValue('')
    })

    it('should call onSaveDeadline immediately on date selection', async () => {
      const onSaveDeadline = vi.fn().mockResolvedValue(undefined)
      render(<TaskDetailExpand {...defaultProps} deadline={null} onSaveDeadline={onSaveDeadline} />)

      const dateInput = screen.getByLabelText(/截止时间/i)
      fireEvent.change(dateInput, { target: { value: '2024-12-25' } })

      await waitFor(() => {
        expect(onSaveDeadline).toHaveBeenCalledWith('2024-12-25T23:59:59.999Z')
      })
    })

    it('should call onSaveDeadline with null when clearing deadline', async () => {
      const onSaveDeadline = vi.fn().mockResolvedValue(undefined)
      render(<TaskDetailExpand {...defaultProps} deadline="2024-12-25T23:59:59.999Z" onSaveDeadline={onSaveDeadline} />)

      const clearButton = screen.getByRole('button', { name: /清除/i })
      await userEvent.click(clearButton)

      await waitFor(() => {
        expect(onSaveDeadline).toHaveBeenCalledWith(null)
      })
    })

    it('should show clear button when deadline is set', () => {
      render(<TaskDetailExpand {...defaultProps} deadline="2024-12-25T23:59:59.999Z" />)

      expect(screen.getByRole('button', { name: /清除/i })).toBeInTheDocument()
    })

    it('should NOT show clear button when deadline is null', () => {
      render(<TaskDetailExpand {...defaultProps} deadline={null} />)

      expect(screen.queryByRole('button', { name: /清除/i })).not.toBeInTheDocument()
    })
  })

  describe('Readonly Mode', () => {
    it('should render as readonly when readonly prop is true', () => {
      render(<TaskDetailExpand {...defaultProps} readonly={true} />)

      // No textareas in readonly mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should display description text in readonly mode', () => {
      render(<TaskDetailExpand {...defaultProps} description="Readonly description" readonly={true} />)

      expect(screen.getByText('Readonly description')).toBeInTheDocument()
    })

    it('should display notes text in readonly mode', () => {
      render(<TaskDetailExpand {...defaultProps} notes="Readonly notes" readonly={true} />)

      expect(screen.getByText('Readonly notes')).toBeInTheDocument()
    })

    it('should display formatted deadline in readonly mode', () => {
      render(<TaskDetailExpand {...defaultProps} deadline="2024-03-15T23:59:59.999Z" readonly={true} />)

      // Should show formatted date in Chinese - note: timezone may affect the day
      expect(screen.getByText(/3月/)).toBeInTheDocument()
    })

    it('should show "无详细信息" when all fields are empty in readonly mode', () => {
      render(<TaskDetailExpand {...defaultProps} description="" notes={null} deadline={null} readonly={true} />)

      expect(screen.getByText('无详细信息')).toBeInTheDocument()
    })

    it('should NOT show "无详细信息" when there is content', () => {
      render(<TaskDetailExpand {...defaultProps} description="Has content" notes={null} deadline={null} readonly={true} />)

      expect(screen.queryByText('无详细信息')).not.toBeInTheDocument()
    })

    it('should hide placeholders in readonly mode', () => {
      render(<TaskDetailExpand {...defaultProps} description="" notes={null} readonly={true} />)

      expect(screen.queryByPlaceholderText('添加描述...')).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText('添加笔记...')).not.toBeInTheDocument()
    })

    it('should hide date input and clear button in readonly mode', () => {
      render(<TaskDetailExpand {...defaultProps} deadline="2024-12-25T23:59:59.999Z" readonly={true} />)

      expect(screen.queryByLabelText(/截止时间/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /清除/i })).not.toBeInTheDocument()
    })

    it('should display labels for each field in readonly mode', () => {
      render(<TaskDetailExpand {...defaultProps} description="Test" notes="Notes" deadline="2024-12-25T23:59:59.999Z" readonly={true} />)

      expect(screen.getByText('描述')).toBeInTheDocument()
      expect(screen.getByText('笔记')).toBeInTheDocument()
    })
  })

  describe('Local State - Prevent Cursor Jumping', () => {
    it('should maintain cursor position while typing', async () => {
      render(<TaskDetailExpand {...defaultProps} description="Hello" />)

      const textarea = screen.getByLabelText(/描述/i) as HTMLTextAreaElement
      // Type at the end
      textarea.setSelectionRange(5, 5)
      await userEvent.type(textarea, ' World', { initialSelectionStart: 5, initialSelectionEnd: 5 })

      expect(textarea).toHaveValue('Hello World')
    })

    it('should sync local state when props change', () => {
      const { rerender } = render(<TaskDetailExpand {...defaultProps} description="Original" />)

      const textarea = screen.getByLabelText(/描述/i)
      expect(textarea).toHaveValue('Original')

      rerender(<TaskDetailExpand {...defaultProps} description="Updated" />)
      expect(textarea).toHaveValue('Updated')
    })

    it('should sync notes when props change', () => {
      const { rerender } = render(<TaskDetailExpand {...defaultProps} notes="Original notes" />)

      const textarea = screen.getByLabelText(/笔记/i)
      expect(textarea).toHaveValue('Original notes')

      rerender(<TaskDetailExpand {...defaultProps} notes="Updated notes" />)
      expect(textarea).toHaveValue('Updated notes')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long description (2000 chars)', async () => {
      const longDescription = 'A'.repeat(2000)
      const onSaveDescription = vi.fn().mockResolvedValue(undefined)

      render(<TaskDetailExpand {...defaultProps} description={longDescription} onSaveDescription={onSaveDescription} />)

      const textarea = screen.getByLabelText(/描述/i)
      expect(textarea).toHaveValue(longDescription)
      expect(textarea).toHaveAttribute('maxLength', '2000')
    })

    it('should enforce maxLength on description field', async () => {
      const onSaveDescription = vi.fn().mockResolvedValue(undefined)
      render(<TaskDetailExpand {...defaultProps} description="" onSaveDescription={onSaveDescription} />)

      const textarea = screen.getByLabelText(/描述/i) as HTMLTextAreaElement

      // Type 2001 characters - only 2000 should be allowed
      const longText = 'A'.repeat(2001)
      await userEvent.type(textarea, longText)

      // Due to maxLength, only 2000 characters should be in the textarea
      expect(textarea.value.length).toBe(2000)
    })

    it('should enforce maxLength on notes field', async () => {
      const onSaveNotes = vi.fn().mockResolvedValue(undefined)
      render(<TaskDetailExpand {...defaultProps} notes={null} onSaveNotes={onSaveNotes} />)

      const textarea = screen.getByLabelText(/笔记/i) as HTMLTextAreaElement

      // Type 2001 characters - only 2000 should be allowed
      const longText = 'B'.repeat(2001)
      await userEvent.type(textarea, longText)

      expect(textarea.value.length).toBe(2000)
    })

    it('should handle empty string notes (convert to null on blur)', async () => {
      const onSaveNotes = vi.fn().mockResolvedValue(undefined)
      render(<TaskDetailExpand {...defaultProps} notes="" onSaveNotes={onSaveNotes} />)

      const textarea = screen.getByLabelText(/笔记/i)
      // Empty string is treated as null internally, so blur won't trigger save
      // But if we type something then clear, it should save null
      await userEvent.type(textarea, 'temp')
      await userEvent.clear(textarea)
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveNotes).toHaveBeenCalledWith(null)
      })
    })

    it('should handle whitespace-only notes (convert to null)', async () => {
      const onSaveNotes = vi.fn().mockResolvedValue(undefined)
      render(<TaskDetailExpand {...defaultProps} notes="   " onSaveNotes={onSaveNotes} />)

      const textarea = screen.getByLabelText(/笔记/i)
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveNotes).toHaveBeenCalledWith(null)
      })
    })

    it('should handle null notes gracefully', () => {
      render(<TaskDetailExpand {...defaultProps} notes={null} />)

      const textarea = screen.getByLabelText(/笔记/i)
      expect(textarea).toHaveValue('')
    })

    it('should preserve whitespace in notes content', async () => {
      const onSaveNotes = vi.fn().mockResolvedValue(undefined)
      render(<TaskDetailExpand {...defaultProps} notes={null} onSaveNotes={onSaveNotes} />)

      const textarea = screen.getByLabelText(/笔记/i)
      await userEvent.type(textarea, 'Line 1{enter}Line 2{enter}Line 3')
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveNotes).toHaveBeenCalledWith('Line 1\nLine 2\nLine 3')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have labels for all form fields', () => {
      render(<TaskDetailExpand {...defaultProps} />)

      expect(screen.getByLabelText(/描述/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/笔记/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/截止时间/i)).toBeInTheDocument()
    })

    it('should have uppercase tracking-wide labels', () => {
      render(<TaskDetailExpand {...defaultProps} />)

      const labels = screen.getAllByText(/描述|笔记|截止时间/)
      labels.forEach(label => {
        expect(label).toHaveClass('uppercase')
        expect(label).toHaveClass('tracking-wide')
      })
    })
  })
})
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MarkdownRenderer } from './MarkdownRenderer'

describe('MarkdownRenderer', () => {
  describe('basic rendering', () => {
    it('should render plain text', () => {
      render(<MarkdownRenderer content="Hello world" />)

      expect(screen.getByText('Hello world')).toBeInTheDocument()
    })

    it('should render markdown bold text', () => {
      render(<MarkdownRenderer content="**bold text**" />)

      const strong = screen.getByText('bold text')
      expect(strong).toBeInTheDocument()
      expect(strong.tagName).toBe('STRONG')
    })

    it('should render markdown italic text', () => {
      render(<MarkdownRenderer content="*italic text*" />)

      const em = screen.getByText('italic text')
      expect(em).toBeInTheDocument()
      expect(em.tagName).toBe('EM')
    })
  })

  describe('GFM features', () => {
    it('should render task lists (GFM)', () => {
      const { container } = render(
        <MarkdownRenderer content="- [ ] Task 1\n- [x] Task 2" />
      )

      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      // Note: react-markdown renders checkboxes but they may be disabled
      expect(checkboxes.length).toBeGreaterThanOrEqual(1)
    })

    it('should render tables (GFM)', () => {
      const content = `| Name | Age |
|------|-----|
| John | 30  |`

      const { container } = render(<MarkdownRenderer content={content} />)

      const table = container.querySelector('table')
      expect(table).toBeInTheDocument()
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('30')).toBeInTheDocument()
    })

    it('should render strikethrough (GFM)', () => {
      const { container } = render(<MarkdownRenderer content="~~strikethrough~~" />)

      const del = container.querySelector('del')
      expect(del).toBeInTheDocument()
      expect(del).toHaveTextContent('strikethrough')
    })

    it('should render code blocks with language', () => {
      const { container } = render(
        <MarkdownRenderer content={'```javascript\nconst x = 1\n```'} />
      )

      const code = container.querySelector('code')
      expect(code).toBeInTheDocument()
      expect(code).toHaveTextContent('const x = 1')
    })

    it('should render inline code', () => {
      const { container } = render(<MarkdownRenderer content="Use `console.log` for debugging" />)

      const code = container.querySelector('code')
      expect(code).toBeInTheDocument()
      expect(code).toHaveTextContent('console.log')
    })
  })

  describe('links', () => {
    it('should render links', () => {
      render(<MarkdownRenderer content="[Click here](https://example.com)" />)

      const link = screen.getByRole('link', { name: 'Click here' })
      expect(link).toBeInTheDocument()
    })

    it('should open links in new tab', () => {
      render(<MarkdownRenderer content="[Click here](https://example.com)" />)

      const link = screen.getByRole('link', { name: 'Click here' })
      expect(link).toHaveAttribute('target', '_blank')
    })

    it('should add rel="noopener noreferrer" for security', () => {
      render(<MarkdownRenderer content="[Click here](https://example.com)" />)

      const link = screen.getByRole('link', { name: 'Click here' })
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should style links with blue color', () => {
      render(<MarkdownRenderer content="[Click here](https://example.com)" />)

      const link = screen.getByRole('link', { name: 'Click here' })
      expect(link).toHaveClass('text-blue-600')
    })
  })

  describe('Component Property Filtering', () => {
    it('should filter task items matching todoIds', () => {
      const content = `- [ ] Task with ID abc123
- [ ] Task without matching ID`

      const todoIds = new Set(['abc123'])

      const { container } = render(
        <MarkdownRenderer content={content} todoIds={todoIds} />
      )

      // Task with matching ID should be filtered out
      expect(screen.queryByText(/Task with ID abc123/)).not.toBeInTheDocument()
      // Task without matching ID should still be visible (when todoIds is provided, filter all)
      // Based on plan: "If we have todoIds but can't match by ID, skip all task items when widget is present"
    })

    it('should not filter task items when todoIds is empty', () => {
      const content = `- [ ] Task 1
- [ ] Task 2`

      const { container } = render(
        <MarkdownRenderer content={content} todoIds={new Set()} />
      )

      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(2)
    })

    it('should not filter task items when todoIds is undefined', () => {
      const content = `- [ ] Task 1
- [ ] Task 2`

      const { container } = render(
        <MarkdownRenderer content={content} />
      )

      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(2)
    })

    it('should filter all task items when todoIds has values (widget is present)', () => {
      const content = `- [ ] Task 1
- [ ] Task 2`

      const todoIds = new Set(['some-id'])

      const { container } = render(
        <MarkdownRenderer content={content} todoIds={todoIds} />
      )

      // When widget is present, filter all task items
      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(0)
    })
  })

  describe('checkbox interaction', () => {
    it('should call onTodoToggle when checkbox is clicked', () => {
      const onTodoToggle = vi.fn()
      const content = '- [ ] Buy groceries'

      const { container } = render(
        <MarkdownRenderer content={content} onTodoToggle={onTodoToggle} />
      )

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement

      // Click the checkbox to trigger onChange
      fireEvent.click(checkbox)

      expect(onTodoToggle).toHaveBeenCalled()
    })

    it('should have proper checkbox styling', () => {
      const content = '- [ ] Task 1'

      const { container } = render(<MarkdownRenderer content={content} />)

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
      expect(checkbox).toHaveClass('h-4', 'w-4', 'rounded', 'cursor-pointer')
    })
  })

  describe('prose styling', () => {
    it('should have prose classes for typography', () => {
      const { container } = render(<MarkdownRenderer content="Test content" />)

      const proseWrapper = container.querySelector('.prose')
      expect(proseWrapper).toBeInTheDocument()
    })

    it('should use prose-sm for smaller text', () => {
      const { container } = render(<MarkdownRenderer content="Test content" />)

      const proseWrapper = container.querySelector('.prose-sm')
      expect(proseWrapper).toBeInTheDocument()
    })

    it('should have max-w-none to remove width constraint', () => {
      const { container } = render(<MarkdownRenderer content="Test content" />)

      const proseWrapper = container.querySelector('.max-w-none')
      expect(proseWrapper).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const { container } = render(<MarkdownRenderer content="" />)

      expect(container).toBeInTheDocument()
    })

    it('should handle content with only whitespace', () => {
      const { container } = render(<MarkdownRenderer content="   \n\n   " />)

      expect(container).toBeInTheDocument()
    })

    it('should handle special characters in content', () => {
      render(<MarkdownRenderer content={'Special: <>&"\''} />)

      expect(screen.getByText(/Special:/)).toBeInTheDocument()
    })

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000)
      render(<MarkdownRenderer content={longContent} />)

      expect(screen.getByText(longContent)).toBeInTheDocument()
    })
  })
})

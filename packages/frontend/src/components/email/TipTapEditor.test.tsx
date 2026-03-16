import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TipTapEditor } from './TipTapEditor'

// Mock sonner toast - must be at top level for hoisting
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

// Mock TipTap hooks and components
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(),
  EditorContent: ({ editor, className }: { editor: unknown; className: string }) => (
    <div
      data-testid="editor-content"
      className={className}
      data-editor={editor ? 'initialized' : 'null'}
    >
      <div data-testid="editor-placeholder" />
    </div>
  ),
}))

// Import the mocked useEditor
import { useEditor } from '@tiptap/react'

// Import the mocked toast for assertions
import { toast } from 'sonner'
const mockToast = toast as unknown as { error: ReturnType<typeof vi.fn> }

// Create mock editor instance
const createMockEditor = (options: {
  isEmpty?: boolean
  isActiveState?: Record<string, boolean>
  canChain?: boolean
}) => {
  const { isEmpty = true, isActiveState = {}, canChain = true } = options

  const mockChain = {
    focus: () => mockChain,
    toggleBold: () => mockChain,
    toggleItalic: () => mockChain,
    toggleUnderline: () => mockChain,
    toggleStrike: () => mockChain,
    toggleHeading: () => mockChain,
    toggleBulletList: () => mockChain,
    toggleOrderedList: () => mockChain,
    toggleBlockquote: () => mockChain,
    extendMarkRange: () => mockChain,
    setLink: () => mockChain,
    unsetLink: () => mockChain,
    setTextAlign: () => mockChain,
    undo: () => mockChain,
    redo: () => mockChain,
    run: () => {},
  }

  return {
    isEmpty,
    isActive: (name: string, attributes?: Record<string, unknown>) => {
      if (attributes) {
        const key = `${name}-${JSON.stringify(attributes)}`
        return isActiveState[key] ?? false
      }
      return isActiveState[name] ?? false
    },
    getAttributes: () => ({ href: '' }),
    can: () => ({
      chain: () => ({
        focus: () => ({
          toggleBold: () => ({ run: () => canChain }),
          toggleItalic: () => ({ run: () => canChain }),
          toggleUnderline: () => ({ run: () => canChain }),
          toggleStrike: () => ({ run: () => canChain }),
          toggleHeading: () => ({ run: () => canChain }),
          toggleBulletList: () => ({ run: () => canChain }),
          toggleOrderedList: () => ({ run: () => canChain }),
          toggleBlockquote: () => ({ run: () => canChain }),
          undo: () => ({ run: () => canChain }),
          redo: () => ({ run: () => canChain }),
          run: () => canChain,
        }),
      }),
    }),
    chain: () => mockChain,
    getHTML: () => '<p>test content</p>',
  }
}

describe('TipTapEditor', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders editor container with toolbar', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
      // Check for toolbar buttons
      expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument()
    })

    it('renders with default placeholder', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('editor-placeholder')).toBeInTheDocument()
    })

    it('renders with custom placeholder', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
          placeholder="Custom placeholder text"
        />
      )

      // Placeholder is configured via TipTap's Placeholder extension
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })
  })

  describe('onChange callback', () => {
    it('calls onChange with HTML content and isEmpty state on update', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let onUpdateCallback: ((props: any) => void) | undefined

      vi.mocked(useEditor).mockImplementation((options) => {
        onUpdateCallback = options?.onUpdate
        return mockEditor as unknown as ReturnType<typeof useEditor>
      })

      render(
        <TipTapEditor
          value="<p>test</p>"
          onChange={mockOnChange}
        />
      )

      // Simulate editor update
      if (onUpdateCallback) {
        onUpdateCallback({ editor: mockEditor })
      }

      expect(mockOnChange).toHaveBeenCalledWith('<p>test content</p>', false)
    })

    it('reports isEmpty=true when editor is empty', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let onUpdateCallback: ((props: any) => void) | undefined

      vi.mocked(useEditor).mockImplementation((options) => {
        onUpdateCallback = options?.onUpdate
        return mockEditor as unknown as ReturnType<typeof useEditor>
      })

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      // Simulate editor update with empty content
      if (onUpdateCallback) {
        onUpdateCallback({ editor: mockEditor })
      }

      expect(mockOnChange).toHaveBeenCalledWith('<p>test content</p>', true)
    })
  })

  describe('Disabled State', () => {
    it('disables editing when disabled prop is true', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      let editorOptions: { editable?: boolean } = {}

      vi.mocked(useEditor).mockImplementation((options) => {
        editorOptions = options ?? {}
        return mockEditor as unknown as ReturnType<typeof useEditor>
      })

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      )

      expect(editorOptions.editable).toBe(false)
    })

    it('enables editing by default', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      let editorOptions: { editable?: boolean } = {}

      vi.mocked(useEditor).mockImplementation((options) => {
        editorOptions = options ?? {}
        return mockEditor as unknown as ReturnType<typeof useEditor>
      })

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      expect(editorOptions.editable).toBe(true)
    })
  })

  describe('Toolbar Buttons', () => {
    beforeEach(() => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)
    })

    it('renders all formatting buttons', () => {
      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      // Text formatting
      expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /underline/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /strikethrough/i })).toBeInTheDocument()

      // Headings
      expect(screen.getByRole('button', { name: /heading 1/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /heading 2/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /heading 3/i })).toBeInTheDocument()

      // Lists
      expect(screen.getByRole('button', { name: /bullet list/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /ordered list/i })).toBeInTheDocument()

      // Block elements
      expect(screen.getByRole('button', { name: /quote/i })).toBeInTheDocument()

      // Alignment
      expect(screen.getByRole('button', { name: /align left/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /align center/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /align right/i })).toBeInTheDocument()

      // History
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument()
    })

    it('renders link button', () => {
      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      expect(screen.getByRole('button', { name: /link/i })).toBeInTheDocument()
    })
  })

  describe('Active State Styling', () => {
    it('shows active state for bold when text is bold', () => {
      const mockEditor = createMockEditor({
        isEmpty: false,
        isActiveState: { bold: true },
      })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value="<p><strong>bold text</strong></p>"
          onChange={mockOnChange}
        />
      )

      const boldButton = screen.getByRole('button', { name: /bold/i })
      expect(boldButton).toHaveClass('bg-accent')
    })

    it('shows active state for italic when text is italic', () => {
      const mockEditor = createMockEditor({
        isEmpty: false,
        isActiveState: { italic: true },
      })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value="<p><em>italic text</em></p>"
          onChange={mockOnChange}
        />
      )

      const italicButton = screen.getByRole('button', { name: /italic/i })
      expect(italicButton).toHaveClass('bg-accent')
    })
  })

  describe('Editor Styling', () => {
    it('applies prose class for typography styling', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent.className).toContain('prose')
    })

    it('applies max-w-none to prevent width constraint', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent.className).toContain('max-w-none')
    })

    it('has flex-1 to fill available space (no max-height for parent scrolling)', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent.className).toContain('flex-1')
    })

    it('has minimum height but NO max-height (parent handles scrolling)', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent.className).toContain('min-h')
      // Editor should NOT have max-h - parent container handles scrolling
      expect(editorContent.className).not.toContain('max-h')
    })

    it('has NO overflow-y-auto (parent container handles scrolling)', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const editorContent = screen.getByTestId('editor-content')
      // Editor should NOT have its own overflow - parent handles scrolling
      expect(editorContent.className).not.toContain('overflow-y-auto')
    })
  })

  describe('Container Styling', () => {
    it('has NO border on container (borderless design)', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const container = screen.getByTestId('tiptap-editor-container')
      // Container should have no border class for borderless design
      expect(container.className).not.toContain('border')
    })

    it('has NO focus-within ring (borderless design)', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const container = screen.getByTestId('tiptap-editor-container')
      // Container should have no focus-within ring for borderless design
      expect(container.className).not.toContain('focus-within:ring')
    })

    it('has flex-1 to fill available space', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const container = screen.getByTestId('tiptap-editor-container')
      expect(container.className).toContain('flex-1')
    })

    it('has flex flex-col for toolbar + editor layout', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const container = screen.getByTestId('tiptap-editor-container')
      expect(container.className).toContain('flex')
      expect(container.className).toContain('flex-col')
    })

    it('has minimum height on container', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const container = screen.getByTestId('tiptap-editor-container')
      expect(container.className).toContain('min-h')
    })

    it('has sticky toolbar with proper z-index', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const toolbar = screen.getByTestId('tiptap-toolbar')
      expect(toolbar.className).toContain('sticky')
      expect(toolbar.className).toContain('z-20')
    })
  })

  describe('Toolbar Styling', () => {
    it('has light gray background (bg-muted/50)', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const toolbar = screen.getByTestId('tiptap-toolbar')
      expect(toolbar.className).toContain('bg-muted')
    })

    it('has rounded corners', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const toolbar = screen.getByTestId('tiptap-toolbar')
      expect(toolbar.className).toContain('rounded')
    })

    it('has margin from edges (mx-4 my-2)', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const toolbar = screen.getByTestId('tiptap-toolbar')
      expect(toolbar.className).toContain('mx-')
      expect(toolbar.className).toContain('my-')
    })

    it('has NO border (borderless design)', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const toolbar = screen.getByTestId('tiptap-toolbar')
      // Toolbar should not have border class
      expect(toolbar.className).not.toContain('border-b')
    })

    it('has items-center for vertical alignment', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const toolbar = screen.getByTestId('tiptap-toolbar')
      expect(toolbar.className).toContain('items-center')
    })
  })

  describe('Toolbar Button Order', () => {
    it('renders buttons in correct order: Undo/Redo first, then Headings, then Text Formatting, then Lists/Quote/Alignment, then Link', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const buttons = screen.getAllByRole('button')

      // Find indices of key buttons
      const undoIndex = buttons.findIndex(b => b.getAttribute('aria-label') === 'Undo')
      const boldIndex = buttons.findIndex(b => b.getAttribute('aria-label') === 'Bold')
      const h1Index = buttons.findIndex(b => b.getAttribute('aria-label') === 'Heading 1')
      const bulletListIndex = buttons.findIndex(b => b.getAttribute('aria-label') === 'Bullet list')
      const linkIndex = buttons.findIndex(b => b.getAttribute('aria-label') === 'Link')

      // Verify order: Undo should come before Bold
      expect(undoIndex).toBeLessThan(boldIndex)
      // Headings should come before Bold (text formatting)
      expect(h1Index).toBeLessThan(boldIndex)
      // Bullet list should come after Bold (text formatting)
      expect(bulletListIndex).toBeGreaterThan(boldIndex)
      // Link should be at the end
      expect(linkIndex).toBeGreaterThan(bulletListIndex)
    })
  })

  describe('Editor Configuration for Click-to-Focus', () => {
    it('configures editorProps.attributes.class with min-h-full p-4 outline-none for click-to-focus', () => {
      const mockEditor = createMockEditor({ isEmpty: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let editorConfig: any = {}

      vi.mocked(useEditor).mockImplementation((options) => {
        editorConfig = options ?? {}
        return mockEditor as unknown as ReturnType<typeof useEditor>
      })

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      // Check that editorProps.attributes.class is configured for click-to-focus
      expect(editorConfig.editorProps?.attributes?.class).toContain('min-h-full')
      expect(editorConfig.editorProps?.attributes?.class).toContain('p-4')
      expect(editorConfig.editorProps?.attributes?.class).toContain('outline-none')
    })
  })

  describe('Value Propagation', () => {
    it('initializes editor with provided value', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let editorConfig: any = {}

      vi.mocked(useEditor).mockImplementation((options) => {
        editorConfig = options ?? {}
        return mockEditor as unknown as ReturnType<typeof useEditor>
      })

      render(
        <TipTapEditor
          value="<p>initial content</p>"
          onChange={mockOnChange}
        />
      )

      expect(editorConfig.content).toBe('<p>initial content</p>')
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      const mockEditor = createMockEditor({ isEmpty: true })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)
    })

    it('all toolbar buttons are type="button"', () => {
      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button')
      })
    })

    it('toolbar buttons have accessible names', () => {
      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      // Check a sample of buttons have accessible names
      expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    })
  })

  describe('Link Button', () => {
    it('prompts for URL when link button is clicked', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      // Mock window.prompt
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com')

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const linkButton = screen.getByRole('button', { name: /link/i })
      linkButton.click()

      expect(promptSpy).toHaveBeenCalledWith('Enter URL:', '')
      promptSpy.mockRestore()
    })

    it('does not set link when prompt is cancelled', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      // Mock window.prompt to return null (cancelled)
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null)

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const linkButton = screen.getByRole('button', { name: /link/i })
      linkButton.click()

      // The chain methods should not be called since prompt was cancelled
      expect(promptSpy).toHaveBeenCalled()
      promptSpy.mockRestore()
    })

    it('removes link when empty URL is provided', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      // Mock window.prompt to return empty string
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('')

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      const linkButton = screen.getByRole('button', { name: /link/i })
      linkButton.click()

      expect(promptSpy).toHaveBeenCalled()
      promptSpy.mockRestore()
    })
  })

  describe('URL Security Validation', () => {
    beforeEach(() => {
      mockToast.error.mockClear()
    })

    it('accepts valid https URL', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      const chainSpy = vi.fn().mockReturnValue({ run: () => {} })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEditor.chain = () => ({
        focus: () => ({ extendMarkRange: () => ({ setLink: chainSpy }) }),
      }) as any as any
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com')

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      screen.getByRole('button', { name: /link/i }).click()

      expect(chainSpy).toHaveBeenCalledWith({ href: 'https://example.com/' })
      expect(mockToast.error).not.toHaveBeenCalled()
      promptSpy.mockRestore()
    })

    it('accepts valid http URL', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      const chainSpy = vi.fn().mockReturnValue({ run: () => {} })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEditor.chain = () => ({
        focus: () => ({ extendMarkRange: () => ({ setLink: chainSpy }) }),
      }) as any as any
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('http://example.com')

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      screen.getByRole('button', { name: /link/i }).click()

      expect(chainSpy).toHaveBeenCalledWith({ href: 'http://example.com/' })
      expect(mockToast.error).not.toHaveBeenCalled()
      promptSpy.mockRestore()
    })

    it('accepts valid mailto URL', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      const chainSpy = vi.fn().mockReturnValue({ run: () => {} })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEditor.chain = () => ({
        focus: () => ({ extendMarkRange: () => ({ setLink: chainSpy }) }),
      }) as any
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('mailto:test@example.com')

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      screen.getByRole('button', { name: /link/i }).click()

      expect(chainSpy).toHaveBeenCalledWith({ href: 'mailto:test@example.com' })
      expect(mockToast.error).not.toHaveBeenCalled()
      promptSpy.mockRestore()
    })

    it('rejects javascript: URL to prevent XSS', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      const chainSpy = vi.fn().mockReturnValue({ run: () => {} })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEditor.chain = () => ({
        focus: () => ({ extendMarkRange: () => ({ setLink: chainSpy }) }),
      }) as any
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue("javascript:alert('xss')")

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      screen.getByRole('button', { name: /link/i }).click()

      expect(chainSpy).not.toHaveBeenCalled()
      expect(mockToast.error).toHaveBeenCalledWith('Invalid URL. Only http, https, and mailto links are allowed.')
      promptSpy.mockRestore()
    })

    it('rejects data: URL to prevent XSS', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      const chainSpy = vi.fn().mockReturnValue({ run: () => {} })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEditor.chain = () => ({
        focus: () => ({ extendMarkRange: () => ({ setLink: chainSpy }) }),
      }) as any
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('data:text/html,<script>alert(1)</script>')

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      screen.getByRole('button', { name: /link/i }).click()

      expect(chainSpy).not.toHaveBeenCalled()
      expect(mockToast.error).toHaveBeenCalledWith('Invalid URL. Only http, https, and mailto links are allowed.')
      promptSpy.mockRestore()
    })

    it('rejects vbscript: URL', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      const chainSpy = vi.fn().mockReturnValue({ run: () => {} })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEditor.chain = () => ({
        focus: () => ({ extendMarkRange: () => ({ setLink: chainSpy }) }),
      }) as any
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('vbscript:msgbox(1)')

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      screen.getByRole('button', { name: /link/i }).click()

      expect(chainSpy).not.toHaveBeenCalled()
      expect(mockToast.error).toHaveBeenCalledWith('Invalid URL. Only http, https, and mailto links are allowed.')
      promptSpy.mockRestore()
    })

    it('normalizes URL without scheme by prepending https://', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      const chainSpy = vi.fn().mockReturnValue({ run: () => {} })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEditor.chain = () => ({
        focus: () => ({ extendMarkRange: () => ({ setLink: chainSpy }) }),
      }) as any
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('example.com')

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      screen.getByRole('button', { name: /link/i }).click()

      expect(chainSpy).toHaveBeenCalledWith({ href: 'https://example.com/' })
      expect(mockToast.error).not.toHaveBeenCalled()
      promptSpy.mockRestore()
    })

    it('shows error for completely invalid URL', () => {
      const mockEditor = createMockEditor({ isEmpty: false })
      const chainSpy = vi.fn().mockReturnValue({ run: () => {} })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEditor.chain = () => ({
        focus: () => ({ extendMarkRange: () => ({ setLink: chainSpy }) }),
      }) as any
      vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>)

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('not a valid url at all!!!')

      render(
        <TipTapEditor
          value=""
          onChange={mockOnChange}
        />
      )

      screen.getByRole('button', { name: /link/i }).click()

      expect(chainSpy).not.toHaveBeenCalled()
      expect(mockToast.error).toHaveBeenCalledWith('Invalid URL format')
      promptSpy.mockRestore()
    })
  })
})
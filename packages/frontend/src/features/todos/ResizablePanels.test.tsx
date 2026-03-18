import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { ResizablePanels, type ResizablePanelsProps, type PanelConfig } from './ResizablePanels'

// Store for capturing onLayoutChanged callback
let capturedOnLayoutChanged: ((layout: Record<string, number>) => void) | null = null

// Mock react-resizable-panels
const mockGroup = vi.fn()
const mockPanel = vi.fn()
const mockSeparator = vi.fn()

vi.mock('react-resizable-panels', () => ({
  Group: (props: object) => {
    mockGroup(props)
    const groupProps = props as {
      orientation?: string
      className?: string
      children?: React.ReactNode
      defaultLayout?: Record<string, number>
      onLayoutChanged?: (layout: Record<string, number>) => void
    }
    // Capture the callback for testing
    capturedOnLayoutChanged = groupProps.onLayoutChanged || null
    return (
      <div
        data-testid="panel-group"
        data-orientation={groupProps.orientation}
        className={groupProps.className}
      >
        {groupProps.children}
      </div>
    )
  },
  Panel: (props: object) => {
    mockPanel(props)
    const panelProps = props as {
      children?: React.ReactNode
      defaultSize?: number
      minSize?: number
      id?: string
      className?: string
    }
    return (
      <div
        data-testid="panel"
        data-id={panelProps.id}
        data-default-size={panelProps.defaultSize}
        data-min-size={panelProps.minSize}
        className={panelProps.className}
      >
        {panelProps.children}
      </div>
    )
  },
  Separator: (props: object) => {
    mockSeparator(props)
    const handleProps = props as {
      className?: string
    }
    return (
      <div
        data-testid="panel-resize-handle"
        className={handleProps.className}
        role="separator"
        aria-orientation="vertical"
      />
    )
  },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('ResizablePanels', () => {
  const defaultPanelConfigs: PanelConfig[] = [
    { id: 'inbox', defaultSize: 25, minSize: 15 },
    { id: 'planner', defaultSize: 35, minSize: 20 },
    { id: 'board', defaultSize: 40, minSize: 20 },
  ]

  const defaultProps: ResizablePanelsProps = {
    panelConfigs: defaultPanelConfigs,
    children: [
      <div key="inbox" data-testid="inbox-content">Inbox Content</div>,
      <div key="planner" data-testid="planner-content">Planner Content</div>,
      <div key="board" data-testid="board-content">Board Content</div>,
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render Group with horizontal orientation', () => {
      render(<ResizablePanels {...defaultProps} />)

      const panelGroup = screen.getByTestId('panel-group')
      expect(panelGroup).toBeInTheDocument()
      expect(panelGroup).toHaveAttribute('data-orientation', 'horizontal')
    })

    it('should render all panels with correct size configurations', () => {
      render(<ResizablePanels {...defaultProps} />)

      const panels = screen.getAllByTestId('panel')
      expect(panels).toHaveLength(3)

      // First panel (Inbox)
      expect(panels[0]).toHaveAttribute('data-id', 'inbox')
      expect(panels[0]).toHaveAttribute('data-default-size', '25')
      expect(panels[0]).toHaveAttribute('data-min-size', '15')

      // Second panel (Planner)
      expect(panels[1]).toHaveAttribute('data-id', 'planner')
      expect(panels[1]).toHaveAttribute('data-default-size', '35')
      expect(panels[1]).toHaveAttribute('data-min-size', '20')

      // Third panel (Board)
      expect(panels[2]).toHaveAttribute('data-id', 'board')
      expect(panels[2]).toHaveAttribute('data-default-size', '40')
      expect(panels[2]).toHaveAttribute('data-min-size', '20')
    })

    it('should render children inside panels', () => {
      render(<ResizablePanels {...defaultProps} />)

      expect(screen.getByTestId('inbox-content')).toBeInTheDocument()
      expect(screen.getByTestId('planner-content')).toBeInTheDocument()
      expect(screen.getByTestId('board-content')).toBeInTheDocument()
    })

    it('should render resize handles between panels', () => {
      render(<ResizablePanels {...defaultProps} />)

      // Should have 2 resize handles for 3 panels
      const resizeHandles = screen.getAllByTestId('panel-resize-handle')
      expect(resizeHandles).toHaveLength(2)
    })
  })

  describe('Handle Styles', () => {
    it('should have transparent hitbox with correct width', () => {
      render(<ResizablePanels {...defaultProps} />)

      const resizeHandles = screen.getAllByTestId('panel-resize-handle')

      resizeHandles.forEach(handle => {
        // Should have w-2 class (8px hitbox)
        expect(handle.className).toContain('w-2')
      })
    })

    it('should have col-resize cursor', () => {
      render(<ResizablePanels {...defaultProps} />)

      const resizeHandles = screen.getAllByTestId('panel-resize-handle')

      resizeHandles.forEach(handle => {
        expect(handle.className).toContain('cursor-col-resize')
      })
    })

    it('should have transparent background by default with hover highlight', () => {
      render(<ResizablePanels {...defaultProps} />)

      const resizeHandles = screen.getAllByTestId('panel-resize-handle')

      resizeHandles.forEach(handle => {
        // Should have transparent background by default
        expect(handle.className).toContain('before:bg-transparent')
        // Should show highlight on hover
        expect(handle.className).toContain('hover:before:bg-border')
      })
    })

    it('should have transition effect on hover', () => {
      render(<ResizablePanels {...defaultProps} />)

      const resizeHandles = screen.getAllByTestId('panel-resize-handle')

      resizeHandles.forEach(handle => {
        expect(handle.className).toContain('before:transition-colors')
      })
    })
  })

  describe('Panel Configuration', () => {
    it('should accept custom panel configs', () => {
      const customConfigs: PanelConfig[] = [
        { id: 'custom1', defaultSize: 30, minSize: 10 },
        { id: 'custom2', defaultSize: 70, minSize: 30 },
      ]

      const customChildren = [
        <div key="custom1" data-testid="custom1-content">Custom 1</div>,
        <div key="custom2" data-testid="custom2-content">Custom 2</div>,
      ]

      render(
        <ResizablePanels panelConfigs={customConfigs}>
          {customChildren}
        </ResizablePanels>
      )

      const panels = screen.getAllByTestId('panel')
      expect(panels).toHaveLength(2)

      expect(panels[0]).toHaveAttribute('data-id', 'custom1')
      expect(panels[0]).toHaveAttribute('data-default-size', '30')
      expect(panels[0]).toHaveAttribute('data-min-size', '10')
      expect(panels[1]).toHaveAttribute('data-id', 'custom2')
      expect(panels[1]).toHaveAttribute('data-default-size', '70')
      expect(panels[1]).toHaveAttribute('data-min-size', '30')
    })

    it('should throw error if children count does not match panel configs', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      const mismatchedChildren = [
        <div key="only-one" data-testid="only-one">Only one child</div>,
      ]

      // Should throw or warn about mismatch
      expect(() => {
        render(
          <ResizablePanels panelConfigs={defaultPanelConfigs}>
            {mismatchedChildren}
          </ResizablePanels>
        )
      }).toThrow()

      consoleError.mockRestore()
    })

    it('should apply custom className to Group', () => {
      render(<ResizablePanels {...defaultProps} className="h-full custom-class" />)

      const panelGroup = screen.getByTestId('panel-group')
      expect(panelGroup).toHaveClass('h-full')
      expect(panelGroup).toHaveClass('custom-class')
    })
  })

  describe('Accessibility', () => {
    it('should have separator role on resize handles', () => {
      render(<ResizablePanels {...defaultProps} />)

      const resizeHandles = screen.getAllByRole('separator')
      expect(resizeHandles).toHaveLength(2)
    })

    it('should have vertical aria-orientation on resize handles', () => {
      render(<ResizablePanels {...defaultProps} />)

      const resizeHandles = screen.getAllByRole('separator')
      resizeHandles.forEach(handle => {
        expect(handle).toHaveAttribute('aria-orientation', 'vertical')
      })
    })
  })

  describe('Dynamic Panel Visibility', () => {
    it('should render correct number of panels when some are hidden', () => {
      const twoPanelConfigs: PanelConfig[] = [
        { id: 'inbox', defaultSize: 40, minSize: 15 },
        { id: 'board', defaultSize: 60, minSize: 20 },
      ]

      const twoChildren = [
        <div key="inbox" data-testid="inbox-content">Inbox</div>,
        <div key="board" data-testid="board-content">Board</div>,
      ]

      render(
        <ResizablePanels panelConfigs={twoPanelConfigs}>
          {twoChildren}
        </ResizablePanels>
      )

      const panels = screen.getAllByTestId('panel')
      expect(panels).toHaveLength(2)

      // Only one resize handle for 2 panels
      const resizeHandles = screen.getAllByTestId('panel-resize-handle')
      expect(resizeHandles).toHaveLength(1)
    })

    it('should render single panel without resize handle', () => {
      const singlePanelConfig: PanelConfig[] = [
        { id: 'board', defaultSize: 100, minSize: 20 },
      ]

      const singleChild = [
        <div key="board" data-testid="board-content">Board Only</div>,
      ]

      render(
        <ResizablePanels panelConfigs={singlePanelConfig}>
          {singleChild}
        </ResizablePanels>
      )

      const panels = screen.getAllByTestId('panel')
      expect(panels).toHaveLength(1)

      // No resize handles for single panel
      expect(screen.queryByTestId('panel-resize-handle')).not.toBeInTheDocument()
    })
  })

  describe('Panel Sizing Constraints', () => {
    it('should enforce minimum size constraints', () => {
      const constrainedConfig: PanelConfig[] = [
        { id: 'panel1', defaultSize: 25, minSize: 20 },
        { id: 'panel2', defaultSize: 75, minSize: 50 },
      ]

      const children = [
        <div key="panel1" data-testid="panel1">Panel 1</div>,
        <div key="panel2" data-testid="panel2">Panel 2</div>,
      ]

      render(
        <ResizablePanels panelConfigs={constrainedConfig}>
          {children}
        </ResizablePanels>
      )

      const panels = screen.getAllByTestId('panel')

      expect(panels[0]).toHaveAttribute('data-min-size', '20')
      expect(panels[1]).toHaveAttribute('data-min-size', '50')
    })

    it('should use percentage-based sizing', () => {
      render(<ResizablePanels {...defaultProps} />)

      const panels = screen.getAllByTestId('panel')

      // All sizes should be percentages (sum to 100)
      const sizes = panels.map(p => parseInt(p.getAttribute('data-default-size') || '0', 10))
      const totalSize = sizes.reduce((sum, size) => sum + size, 0)

      // Total should be 100% (25 + 35 + 40)
      expect(totalSize).toBe(100)
    })
  })

  describe('localStorage Persistence', () => {
    it('should load saved layout from localStorage on mount', () => {
      // Pre-populate localStorage with saved layout
      const savedLayout = { inbox: 30, planner: 30, board: 40 }
      localStorageMock.setItem('nanomail-todo-panels', JSON.stringify(savedLayout))

      render(<ResizablePanels {...defaultProps} />)

      // Verify layout was loaded (check that Group received the saved layout)
      expect(mockGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultLayout: savedLayout,
        })
      )
    })

    it('should use default layout when no saved layout exists', () => {
      render(<ResizablePanels {...defaultProps} />)

      // Verify default layout is used
      expect(mockGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultLayout: {
            inbox: 25,
            planner: 35,
            board: 40,
          },
        })
      )
    })

    it('should handle invalid localStorage data gracefully', () => {
      // Store invalid JSON
      localStorageMock.setItem('nanomail-todo-panels', 'invalid-json')

      // Should not throw and should use defaults
      expect(() => {
        render(<ResizablePanels {...defaultProps} />)
      }).not.toThrow()

      // Should use default layout
      expect(mockGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultLayout: {
            inbox: 25,
            planner: 35,
            board: 40,
          },
        })
      )
    })

    it('should save layout to localStorage when layout changes', async () => {
      render(<ResizablePanels {...defaultProps} />)

      // Simulate layout change by calling the captured callback
      expect(capturedOnLayoutChanged).not.toBeNull()

      const newLayout = { inbox: 20, planner: 40, board: 40 }
      act(() => {
        capturedOnLayoutChanged!(newLayout)
      })

      // Verify layout was saved to localStorage
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'nanomail-todo-panels',
          JSON.stringify(newLayout)
        )
      })
    })
  })
})
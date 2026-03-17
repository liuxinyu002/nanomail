import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useSensors } from '@dnd-kit/core'
import {
  DndProvider,
  useDndContext,
} from './DndContext'

// Mock the dnd-kit hooks and components
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core')
  return {
    ...actual,
    useSensors: vi.fn(() => []),
    PointerSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
  }
})

describe('DndContext', () => {
  const mockOnDragEnd = vi.fn()
  const mockOnDragStart = vi.fn()
  const mockOnDragOver = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DndProvider', () => {
    it('should render children', () => {
      render(
        <DndProvider>
          <div data-testid="child">Child Content</div>
        </DndProvider>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
      expect(screen.getByText('Child Content')).toBeInTheDocument()
    })

    it('should accept onDragEnd callback', () => {
      render(
        <DndProvider onDragEnd={mockOnDragEnd}>
          <div>Child</div>
        </DndProvider>
      )

      // Provider should render without errors
      expect(screen.getByText('Child')).toBeInTheDocument()
    })

    it('should accept onDragStart callback', () => {
      render(
        <DndProvider onDragStart={mockOnDragStart}>
          <div>Child</div>
        </DndProvider>
      )

      expect(screen.getByText('Child')).toBeInTheDocument()
    })

    it('should accept onDragOver callback', () => {
      render(
        <DndProvider onDragOver={mockOnDragOver}>
          <div>Child</div>
        </DndProvider>
      )

      expect(screen.getByText('Child')).toBeInTheDocument()
    })

    it('should initialize sensors for pointer and keyboard', () => {
      render(
        <DndProvider>
          <div>Child</div>
        </DndProvider>
      )

      expect(useSensors).toHaveBeenCalled()
    })
  })

  describe('useDndContext hook', () => {
    it('should throw error when used outside DndProvider', () => {
      // Test that error is thrown when useDndContext is called outside provider
      // We need to catch the error in a component
      const TestComponent = () => {
        try {
          useDndContext()
          return <span>No error</span>
        } catch (e) {
          return <span data-testid="error">{(e as Error).message}</span>
        }
      }

      render(<TestComponent />)

      expect(screen.getByTestId('error')).toHaveTextContent('useDndContext must be used within a DndProvider')
    })

    it('should provide drag state via context', () => {
      const TestComponent = () => {
        const { activeItem, isDragging } = useDndContext()
        return (
          <div>
            <span data-testid="is-dragging">{isDragging.toString()}</span>
            <span data-testid="active-item">{activeItem?.id?.toString() ?? 'null'}</span>
          </div>
        )
      }

      render(
        <DndProvider>
          <TestComponent />
        </DndProvider>
      )

      expect(screen.getByTestId('is-dragging')).toHaveTextContent('false')
      expect(screen.getByTestId('active-item')).toHaveTextContent('null')
    })

    it('should expose overZone via context', () => {
      const TestComponent = () => {
        const { overZone } = useDndContext()
        return <span data-testid="over-zone">{overZone?.id?.toString() ?? 'null'}</span>
      }

      render(
        <DndProvider>
          <TestComponent />
        </DndProvider>
      )

      expect(screen.getByTestId('over-zone')).toHaveTextContent('null')
    })
  })

  describe('Drag Events', () => {
    // Note: These tests would require more complex setup with actual dnd-kit
    // For now, we test that the callbacks are properly wired

    it('should have proper context structure for drag handling', () => {
      const TestComponent = () => {
        const context = useDndContext()
        return (
          <div data-testid="context-keys">
            {Object.keys(context).join(',')}
          </div>
        )
      }

      render(
        <DndProvider>
          <TestComponent />
        </DndProvider>
      )

      const keys = screen.getByTestId('context-keys').textContent
      expect(keys).toContain('isDragging')
      expect(keys).toContain('activeItem')
      expect(keys).toContain('overZone')
    })
  })
})
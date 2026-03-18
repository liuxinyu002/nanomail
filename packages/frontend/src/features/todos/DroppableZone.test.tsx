import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DndProvider } from '@/contexts/DndContext'
import { DroppableZone, type DroppableZoneProps } from './DroppableZone'

// Store for captured useDroppable arguments and return values
let capturedDroppableArgs: unknown = null
let mockDroppableReturnValue: {
  isOver: boolean
  setNodeRef: (node: HTMLElement | null) => void
  active: { id: string | number } | null
  over: { id: string | number } | null
} = {
  isOver: false,
  setNodeRef: vi.fn(),
  active: null,
  over: null,
}

// Mock useDroppable from dnd-kit
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core')
  return {
    ...actual,
    useDroppable: (args: unknown) => {
      capturedDroppableArgs = args
      return mockDroppableReturnValue
    },
  }
})

describe('DroppableZone', () => {
  const defaultProps: DroppableZoneProps = {
    id: 'test-zone',
    type: 'board',
    children: <div data-testid="child-content">Content</div>,
  }

  beforeEach(() => {
    capturedDroppableArgs = null
    mockDroppableReturnValue = {
      isOver: false,
      setNodeRef: vi.fn(),
      active: null,
      over: null,
    }
  })

  describe('Rendering', () => {
    it('should render children', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('should render a container with data-testid', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByTestId('droppable-zone')).toBeInTheDocument()
    })
  })

  describe('useDroppable Configuration', () => {
    it('should pass id to useDroppable', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} />
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          id: 'test-zone',
        })
      )
    })

    it('should pass type in data to useDroppable', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} type="inbox" />
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'inbox',
          }),
        })
      )
    })

    it('should pass columnId in data when provided', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} type="board" columnId={3} />
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'board',
            columnId: 3,
          }),
        })
      )
    })

    it('should pass date in data when provided', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} type="planner" date="2024-12-25" />
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'planner',
            date: '2024-12-25',
          }),
        })
      )
    })

    it('should accept numeric id', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} id={123} />
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          id: 123,
        })
      )
    })
  })

  describe('Visual Feedback', () => {
    it('should not have highlight styles when not over', () => {
      mockDroppableReturnValue = {
        ...mockDroppableReturnValue,
        isOver: false,
      }

      render(
        <DndProvider>
          <DroppableZone {...defaultProps} />
        </DndProvider>
      )

      const zone = screen.getByTestId('droppable-zone')
      expect(zone).not.toHaveClass('bg-blue-50')
      expect(zone).not.toHaveClass('ring-2')
    })

    it('should have highlight styles when isOver is true', () => {
      mockDroppableReturnValue = {
        ...mockDroppableReturnValue,
        isOver: true,
      }

      render(
        <DndProvider>
          <DroppableZone {...defaultProps} />
        </DndProvider>
      )

      const zone = screen.getByTestId('droppable-zone')
      expect(zone).toHaveClass('bg-blue-50')
      expect(zone).toHaveClass('ring-2')
      expect(zone).toHaveClass('ring-blue-300')
    })

    it('should have transition styles for smooth visual changes', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} />
        </DndProvider>
      )

      const zone = screen.getByTestId('droppable-zone')
      expect(zone).toHaveClass('transition-colors')
      expect(zone).toHaveClass('duration-200')
    })
  })

  describe('Zone Types', () => {
    it('should render inbox zone type', () => {
      render(
        <DndProvider>
          <DroppableZone id="inbox-zone" type="inbox">
            <div>Inbox Zone</div>
          </DroppableZone>
        </DndProvider>
      )

      expect(screen.getByText('Inbox Zone')).toBeInTheDocument()
      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'inbox',
          }),
        })
      )
    })

    it('should render planner zone type with date', () => {
      render(
        <DndProvider>
          <DroppableZone id="planner-2024-12-25" type="planner" date="2024-12-25">
            <div>Planner Zone</div>
          </DroppableZone>
        </DndProvider>
      )

      expect(screen.getByText('Planner Zone')).toBeInTheDocument()
      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'planner',
            date: '2024-12-25',
          }),
        })
      )
    })

    it('should render board zone type with columnId', () => {
      render(
        <DndProvider>
          <DroppableZone id="board-column-1" type="board" columnId={1}>
            <div>Board Column 1</div>
          </DroppableZone>
        </DndProvider>
      )

      expect(screen.getByText('Board Column 1')).toBeInTheDocument()
      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'board',
            columnId: 1,
          }),
        })
      )
    })
  })

  describe('Custom Styling', () => {
    it('should accept custom className', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} className="custom-class p-4" />
        </DndProvider>
      )

      const zone = screen.getByTestId('droppable-zone')
      expect(zone).toHaveClass('custom-class')
      expect(zone).toHaveClass('p-4')
    })

    it('should merge custom className with default styles', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} className="min-h-[200px] border" />
        </DndProvider>
      )

      const zone = screen.getByTestId('droppable-zone')
      expect(zone).toHaveClass('min-h-[200px]')
      expect(zone).toHaveClass('border')
      expect(zone).toHaveClass('transition-colors')
    })
  })

  describe('Hour Field Support (Phase 5)', () => {
    it('should pass hour in data when provided', () => {
      render(
        <DndProvider>
          <DroppableZone
            id="planner-hour-2024-12-25-14"
            type="planner"
            date="2024-12-25"
            hour={14}
          >
            <div>Hour 14 Slot</div>
          </DroppableZone>
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'planner',
            date: '2024-12-25',
            hour: 14,
          }),
        })
      )
    })

    it('should pass hour as 0 for midnight', () => {
      render(
        <DndProvider>
          <DroppableZone
            id="planner-hour-2024-12-25-0"
            type="planner"
            date="2024-12-25"
            hour={0}
          >
            <div>Midnight Slot</div>
          </DroppableZone>
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            hour: 0,
          }),
        })
      )
    })

    it('should pass hour as 23 for late night', () => {
      render(
        <DndProvider>
          <DroppableZone
            id="planner-hour-2024-12-25-23"
            type="planner"
            date="2024-12-25"
            hour={23}
          >
            <div>Late Night Slot</div>
          </DroppableZone>
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            hour: 23,
          }),
        })
      )
    })

    it('should not require hour for non-planner zones', () => {
      render(
        <DndProvider>
          <DroppableZone id="board-column-1" type="board" columnId={1}>
            <div>Board Column 1</div>
          </DroppableZone>
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'board',
            columnId: 1,
          }),
        })
      )
      // hour should be undefined for board zones
      expect((capturedDroppableArgs as { data: { hour?: number } }).data.hour).toBeUndefined()
    })

    it('should reject invalid hour values below 0 (use undefined)', () => {
      render(
        <DndProvider>
          <DroppableZone
            id="planner-hour-invalid"
            type="planner"
            date="2024-12-25"
            hour={-1}
          >
            <div>Invalid Hour</div>
          </DroppableZone>
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'planner',
            date: '2024-12-25',
          }),
        })
      )
      // Invalid hour should result in undefined
      expect((capturedDroppableArgs as { data: { hour?: number } }).data.hour).toBeUndefined()
    })

    it('should reject invalid hour values above 23 (use undefined)', () => {
      render(
        <DndProvider>
          <DroppableZone
            id="planner-hour-invalid"
            type="planner"
            date="2024-12-25"
            hour={25}
          >
            <div>Invalid Hour</div>
          </DroppableZone>
        </DndProvider>
      )

      expect(capturedDroppableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'planner',
            date: '2024-12-25',
          }),
        })
      )
      // Invalid hour should result in undefined
      expect((capturedDroppableArgs as { data: { hour?: number } }).data.hour).toBeUndefined()
    })

    it('should reject NaN hour value (use undefined)', () => {
      render(
        <DndProvider>
          <DroppableZone
            id="planner-hour-invalid"
            type="planner"
            date="2024-12-25"
            hour={NaN}
          >
            <div>NaN Hour</div>
          </DroppableZone>
        </DndProvider>
      )

      // NaN hour should result in undefined
      expect((capturedDroppableArgs as { data: { hour?: number } }).data.hour).toBeUndefined()
    })

    it('should reject non-integer hour values (use undefined)', () => {
      render(
        <DndProvider>
          <DroppableZone
            id="planner-hour-invalid"
            type="planner"
            date="2024-12-25"
            hour={14.5}
          >
            <div>Non-integer Hour</div>
          </DroppableZone>
        </DndProvider>
      )

      // Non-integer hour should result in undefined
      expect((capturedDroppableArgs as { data: { hour?: number } }).data.hour).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps} children={null} />
        </DndProvider>
      )

      const zone = screen.getByTestId('droppable-zone')
      expect(zone).toBeInTheDocument()
    })

    it('should handle multiple children via ReactNode', () => {
      render(
        <DndProvider>
          <DroppableZone {...defaultProps}>
            <div>Child 1</div>
            <div>Child 2</div>
          </DroppableZone>
        </DndProvider>
      )

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
    })
  })
})
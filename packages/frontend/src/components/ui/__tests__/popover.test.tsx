import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from '../popover'

describe('Popover Component', () => {
  describe('Rendering', () => {
    it('renders Popover with trigger and content', () => {
      render(
        <Popover>
          <PopoverTrigger data-testid="popover-trigger">Open</PopoverTrigger>
          <PopoverContent>
            <div>Popover content</div>
          </PopoverContent>
        </Popover>
      )

      expect(screen.getByTestId('popover-trigger')).toBeInTheDocument()
    })

    it('does not show content by default', () => {
      render(
        <Popover>
          <PopoverTrigger data-testid="popover-trigger">Open</PopoverTrigger>
          <PopoverContent>
            <div data-testid="popover-content">Popover content</div>
          </PopoverContent>
        </Popover>
      )

      expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument()
    })

    it('shows content when open', async () => {
      const user = userEvent.setup()
      render(
        <Popover>
          <PopoverTrigger data-testid="popover-trigger">Open</PopoverTrigger>
          <PopoverContent>
            <div data-testid="popover-content">Popover content</div>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByTestId('popover-trigger'))
      expect(screen.getByTestId('popover-content')).toBeInTheDocument()
    })

    it('renders with default open state', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <div data-testid="popover-content">Popover content</div>
          </PopoverContent>
        </Popover>
      )

      expect(screen.getByTestId('popover-content')).toBeInTheDocument()
    })
  })

  describe('Subcomponents', () => {
    it('exports all required subcomponents', () => {
      expect(Popover).toBeDefined()
      expect(PopoverTrigger).toBeDefined()
      expect(PopoverContent).toBeDefined()
      expect(PopoverAnchor).toBeDefined()
    })
  })

  describe('Interaction', () => {
    it('toggles visibility on trigger click', async () => {
      const user = userEvent.setup()
      render(
        <Popover>
          <PopoverTrigger data-testid="popover-trigger">Open</PopoverTrigger>
          <PopoverContent>
            <div data-testid="popover-content">Popover content</div>
          </PopoverContent>
        </Popover>
      )

      // Initially closed
      expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument()

      // Open
      await user.click(screen.getByTestId('popover-trigger'))
      expect(screen.getByTestId('popover-content')).toBeInTheDocument()

      // Close
      await user.click(screen.getByTestId('popover-trigger'))
      expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument()
    })

    it('calls onOpenChange when open state changes', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(
        <Popover onOpenChange={onOpenChange}>
          <PopoverTrigger data-testid="popover-trigger">Open</PopoverTrigger>
          <PopoverContent>
            <div>Popover content</div>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByTestId('popover-trigger'))
      expect(onOpenChange).toHaveBeenCalledWith(true)
    })
  })

  describe('Accessibility', () => {
    it('has proper role attributes when open', async () => {
      const user = userEvent.setup()
      render(
        <Popover>
          <PopoverTrigger data-testid="popover-trigger">Open</PopoverTrigger>
          <PopoverContent>
            <div>Popover content</div>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByTestId('popover-trigger'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('ClassName Merging', () => {
    it('merges custom className with default classes on PopoverContent', async () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent className="custom-content-class">
            <div data-testid="popover-content">Content</div>
          </PopoverContent>
        </Popover>
      )

      // The content is rendered in a portal, so we look for it in the document
      const content = screen.getByTestId('popover-content').parentElement
      expect(content).toHaveClass('custom-content-class')
      // Should also have default classes
      expect(content?.className).toMatch(/z-50/)
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to PopoverTrigger', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(
        <Popover>
          <PopoverTrigger ref={ref} data-testid="popover-trigger">
            Open
          </PopoverTrigger>
        </Popover>
      )

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    it('forwards ref to PopoverContent', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent ref={ref}>
            <div>Content</div>
          </PopoverContent>
        </Popover>
      )

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Positioning', () => {
    it('accepts side prop for positioning', async () => {
      const user = userEvent.setup()
      render(
        <Popover>
          <PopoverTrigger data-testid="popover-trigger">Open</PopoverTrigger>
          <PopoverContent side="left" data-testid="popover-content">
            <div>Content</div>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByTestId('popover-trigger'))
      expect(screen.getByTestId('popover-content')).toBeInTheDocument()
    })

    it('accepts align prop for positioning', async () => {
      const user = userEvent.setup()
      render(
        <Popover>
          <PopoverTrigger data-testid="popover-trigger">Open</PopoverTrigger>
          <PopoverContent align="start" data-testid="popover-content">
            <div>Content</div>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByTestId('popover-trigger'))
      expect(screen.getByTestId('popover-content')).toBeInTheDocument()
    })
  })
})
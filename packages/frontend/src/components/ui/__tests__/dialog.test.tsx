import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../dialog'

describe('Dialog Component', () => {
  describe('Rendering', () => {
    it('renders Dialog with trigger and content', async () => {
      render(
        <Dialog>
          <DialogTrigger data-testid="dialog-trigger">Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument()
      expect(screen.getByText('Open Dialog')).toBeInTheDocument()
    })

    it('renders dialog content when open', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
      expect(screen.getByText('Test description')).toBeInTheDocument()
    })
  })

  describe('Subcomponents', () => {
    it('exports all required subcomponents', () => {
      expect(Dialog).toBeDefined()
      expect(DialogTrigger).toBeDefined()
      expect(DialogContent).toBeDefined()
      expect(DialogHeader).toBeDefined()
      expect(DialogFooter).toBeDefined()
      expect(DialogTitle).toBeDefined()
      expect(DialogDescription).toBeDefined()
      expect(DialogClose).toBeDefined()
    })
  })

  describe('Interaction', () => {
    it('opens dialog when trigger is clicked', async () => {
      const user = userEvent.setup()
      render(
        <Dialog>
          <DialogTrigger data-testid="dialog-trigger">Open Dialog</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      // Initially, dialog content is not visible
      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument()

      await user.click(screen.getByTestId('dialog-trigger'))

      // After clicking, dialog content should be visible
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })

    it('closes dialog when close button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      // Dialog is initially open
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()

      // Find and click the close button (X icon)
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      // Dialog should be closed
      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument()
    })

    it('calls onOpenChange when dialog state changes', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(
        <Dialog onOpenChange={onOpenChange}>
          <DialogTrigger data-testid="dialog-trigger">Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByTestId('dialog-trigger'))
      expect(onOpenChange).toHaveBeenCalledWith(true)
    })
  })

  describe('Accessibility', () => {
    it('has proper role attributes', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      // Dialog content should have dialog role
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has accessible title and description', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Accessible Title</DialogTitle>
            <DialogDescription>Accessible description text</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      expect(screen.getByText('Accessible Title')).toBeInTheDocument()
      expect(screen.getByText('Accessible description text')).toBeInTheDocument()
    })

    it('supports visually hidden description with sr-only class', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription className="sr-only">
              Hidden but accessible description
            </DialogDescription>
            <div>Actual content</div>
          </DialogContent>
        </Dialog>
      )

      // Description should be in the DOM but visually hidden
      const description = screen.getByText('Hidden but accessible description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('sr-only')
    })
  })

  describe('ClassName Merging', () => {
    it('merges custom className on DialogContent', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent className="custom-content-class" data-testid="dialog-content">
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass('custom-content-class')
    })

    it('merges custom className on DialogTitle', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle className="custom-title-class">Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const title = screen.getByText('Test Dialog')
      expect(title).toHaveClass('custom-title-class')
    })

    it('merges custom className on DialogDescription', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription className="custom-desc-class">
              Test description
            </DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const description = screen.getByText('Test description')
      expect(description).toHaveClass('custom-desc-class')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to DialogContent', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent ref={ref}>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('forwards ref to DialogTitle', () => {
      const ref = React.createRef<HTMLHeadingElement>()
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle ref={ref}>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
    })
  })

  describe('Layout Constraints', () => {
    it('applies max-height constraint of 85vh', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const content = screen.getByTestId('dialog-content')
      expect(content.className).toMatch(/max-h-\[85vh\]/)
    })

    it('applies centered positioning with translate', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const content = screen.getByTestId('dialog-content')
      expect(content.className).toMatch(/left-\[50%\]/)
      expect(content.className).toMatch(/top-\[50%\]/)
      expect(content.className).toMatch(/translate-x-\[-50%\]/)
      expect(content.className).toMatch(/translate-y-\[-50%\]/)
    })

    it('applies flex layout for sticky header support', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const content = screen.getByTestId('dialog-content')
      expect(content.className).toMatch(/flex/)
      expect(content.className).toMatch(/flex-col/)
    })

    it('applies mobile responsive width', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const content = screen.getByTestId('dialog-content')
      // Should have w-[calc(100vw-2rem)] for mobile
      expect(content.className).toMatch(/w-\[calc\(100vw-2rem\)\]/)
    })
  })

  describe('Animation', () => {
    it('applies animation classes for open/close states', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const content = screen.getByTestId('dialog-content')
      // Animation classes
      expect(content.className).toMatch(/data-\[state=open\]:animate-in/)
      expect(content.className).toMatch(/data-\[state=closed\]:animate-out/)
      // Fade animation
      expect(content.className).toMatch(/data-\[state=closed\]:fade-out-0/)
      expect(content.className).toMatch(/data-\[state=open\]:fade-in-0/)
      // Zoom animation
      expect(content.className).toMatch(/data-\[state=closed\]:zoom-out-95/)
      expect(content.className).toMatch(/data-\[state=open\]:zoom-in-95/)
    })
  })

  describe('Header and Footer', () => {
    it('renders DialogHeader with correct styling', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>Test description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      const header = screen.getByTestId('dialog-header')
      expect(header).toBeInTheDocument()
      expect(header.className).toMatch(/flex/)
      expect(header.className).toMatch(/flex-col/)
    })

    it('renders DialogFooter with correct styling', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
            <DialogFooter data-testid="dialog-footer">
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      const footer = screen.getByTestId('dialog-footer')
      expect(footer).toBeInTheDocument()
      expect(footer.className).toMatch(/flex/)
    })

    it('applies shrink-0 to DialogHeader for sticky header support', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader data-testid="dialog-header" className="shrink-0">
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>Test description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      const header = screen.getByTestId('dialog-header')
      expect(header).toHaveClass('shrink-0')
    })
  })
})
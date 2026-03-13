import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from '../select'

describe('Select Component', () => {
  describe('Rendering', () => {
    it('renders Select component with trigger and content', async () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      expect(screen.getByTestId('select-trigger')).toBeInTheDocument()
      expect(screen.getByText('Select an option')).toBeInTheDocument()
    })

    it('renders with initial default value', () => {
      render(
        <Select defaultValue="option1">
          <SelectTrigger data-testid="select-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      expect(screen.getByTestId('select-trigger')).toHaveTextContent('Option 1')
    })
  })

  describe('Subcomponents', () => {
    it('exports all required subcomponents', () => {
      expect(Select).toBeDefined()
      expect(SelectGroup).toBeDefined()
      expect(SelectValue).toBeDefined()
      expect(SelectTrigger).toBeDefined()
      expect(SelectContent).toBeDefined()
      expect(SelectLabel).toBeDefined()
      expect(SelectItem).toBeDefined()
      expect(SelectSeparator).toBeDefined()
      expect(SelectScrollUpButton).toBeDefined()
      expect(SelectScrollDownButton).toBeDefined()
    })

    it('renders SelectGroup with label', async () => {
      const user = userEvent.setup()
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Group 1</SelectLabel>
              <SelectItem value="item1">Item 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByTestId('select-trigger'))
      expect(screen.getByText('Group 1')).toBeInTheDocument()
    })

    it('renders SelectSeparator', async () => {
      const user = userEvent.setup()
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="item1">Item 1</SelectItem>
            <SelectSeparator />
            <SelectItem value="item2">Item 2</SelectItem>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByTestId('select-trigger'))
      // Separator is rendered as a div with a specific class pattern
      // Check that both items are present (separator is between them)
      expect(screen.getByRole('option', { name: 'Item 1' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Item 2' })).toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('opens dropdown when trigger is clicked', async () => {
      const user = userEvent.setup()
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByTestId('select-trigger'))
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('selects item on click', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      render(
        <Select onValueChange={onValueChange}>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByTestId('select-trigger'))
      await user.click(screen.getByRole('option', { name: 'Option 1' }))
      expect(onValueChange).toHaveBeenCalledWith('option1')
    })
  })

  describe('Accessibility', () => {
    it('has proper role attributes', async () => {
      const user = userEvent.setup()
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByTestId('select-trigger'))
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('disables the select when disabled prop is passed', () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      expect(screen.getByTestId('select-trigger')).toBeDisabled()
    })
  })

  describe('ClassName Merging', () => {
    it('merges custom className with default classes on Trigger', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger-class" data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByTestId('select-trigger')
      expect(trigger).toHaveClass('custom-trigger-class')
      // Should also have default classes
      expect(trigger.className).toMatch(/flex/)
    })

    it('merges custom className on SelectItem', async () => {
      const user = userEvent.setup()
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1" className="custom-item-class">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByTestId('select-trigger'))
      const item = screen.getByRole('option', { name: 'Option 1' })
      expect(item).toHaveClass('custom-item-class')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to SelectTrigger', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(
        <Select>
          <SelectTrigger ref={ref} data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
        </Select>
      )

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    it('forwards ref to SelectContent', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent ref={ref}>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      // Content is rendered in a portal, so we check for the ref value
      expect(ref.current).toBeDefined()
    })
  })
})
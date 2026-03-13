import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from '../dropdown-menu'

describe('DropdownMenu Component', () => {
  describe('Rendering', () => {
    it('renders DropdownMenu with trigger and content', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByTestId('menu-trigger')).toBeInTheDocument()
    })

    it('does not show content by default', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem data-testid="menu-item">Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.queryByTestId('menu-item')).not.toBeInTheDocument()
    })

    it('shows content when trigger is clicked', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem data-testid="menu-item">Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      expect(screen.getByTestId('menu-item')).toBeInTheDocument()
    })
  })

  describe('Subcomponents', () => {
    it('exports all required subcomponents', () => {
      expect(DropdownMenu).toBeDefined()
      expect(DropdownMenuTrigger).toBeDefined()
      expect(DropdownMenuContent).toBeDefined()
      expect(DropdownMenuItem).toBeDefined()
      expect(DropdownMenuCheckboxItem).toBeDefined()
      expect(DropdownMenuRadioItem).toBeDefined()
      expect(DropdownMenuLabel).toBeDefined()
      expect(DropdownMenuSeparator).toBeDefined()
      expect(DropdownMenuShortcut).toBeDefined()
      expect(DropdownMenuGroup).toBeDefined()
      expect(DropdownMenuPortal).toBeDefined()
      expect(DropdownMenuSub).toBeDefined()
      expect(DropdownMenuSubContent).toBeDefined()
      expect(DropdownMenuSubTrigger).toBeDefined()
      expect(DropdownMenuRadioGroup).toBeDefined()
    })

    it('renders DropdownMenuLabel', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('renders DropdownMenuSeparator', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      const separator = document.querySelector('[role="separator"]')
      expect(separator).toBeInTheDocument()
    })

    it('renders DropdownMenuShortcut', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      expect(screen.getByText('Ctrl+S')).toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('calls onSelect when item is clicked', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onSelect}>Click Me</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      await user.click(screen.getByText('Click Me'))
      expect(onSelect).toHaveBeenCalled()
    })

    it('closes menu when item is clicked', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem data-testid="menu-item">Click Me</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      expect(screen.getByTestId('menu-item')).toBeInTheDocument()

      await user.click(screen.getByText('Click Me'))
      expect(screen.queryByTestId('menu-item')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper role attributes when open', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Item 1' })).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('disables menu item when disabled prop is passed', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled onSelect={onSelect}>
              Disabled Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      await user.click(screen.getByText('Disabled Item'))
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('ClassName Merging', () => {
    it('merges custom className on DropdownMenuTrigger', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger className="custom-trigger-class" data-testid="menu-trigger">
            Menu
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const trigger = screen.getByTestId('menu-trigger')
      expect(trigger).toHaveClass('custom-trigger-class')
    })

    it('merges custom className on DropdownMenuContent', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent className="custom-content-class">
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      const menu = screen.getByRole('menu')
      expect(menu).toHaveClass('custom-content-class')
    })

    it('merges custom className on DropdownMenuItem', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="custom-item-class">
              Item 1
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      const item = screen.getByRole('menuitem', { name: 'Item 1' })
      expect(item).toHaveClass('custom-item-class')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to DropdownMenuTrigger', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger ref={ref} data-testid="menu-trigger">
            Menu
          </DropdownMenuTrigger>
        </DropdownMenu>
      )

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    it('forwards ref to DropdownMenuContent', async () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
          <DropdownMenuContent ref={ref}>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Grouping', () => {
    it('renders DropdownMenuGroup with items', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Group Item 1</DropdownMenuItem>
              <DropdownMenuItem>Group Item 2</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      expect(screen.getByRole('menuitem', { name: 'Group Item 1' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Group Item 2' })).toBeInTheDocument()
    })
  })

  describe('Checkbox Items', () => {
    it('renders and toggles checkbox item', async () => {
      const user = userEvent.setup()
      const onCheckedChange = vi.fn()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={false}
              onCheckedChange={onCheckedChange}
            >
              Toggle Option
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      await user.click(screen.getByRole('menuitemcheckbox', { name: 'Toggle Option' }))
      expect(onCheckedChange).toHaveBeenCalledWith(true)
    })
  })

  describe('Radio Items', () => {
    it('renders and selects radio item', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1" onValueChange={onValueChange}>
              <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      await user.click(screen.getByRole('menuitemradio', { name: 'Option 2' }))
      expect(onValueChange).toHaveBeenCalledWith('option2')
    })
  })

  describe('Submenus', () => {
    it('renders submenu structure', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByTestId('menu-trigger'))
      // Verify submenu trigger is rendered
      expect(screen.getByText('More Options')).toBeInTheDocument()
      // Verify it has the correct role for submenu trigger
      expect(screen.getByRole('menuitem', { name: 'More Options' })).toBeInTheDocument()
    })
  })
})
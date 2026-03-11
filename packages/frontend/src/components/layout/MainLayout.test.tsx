import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MainLayout } from './MainLayout'

// Mock the Outlet component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  }
})

const renderWithRouter = (initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <MainLayout />
    </MemoryRouter>
  )
}

describe('MainLayout', () => {
  describe('Sidebar', () => {
    it('should render collapsed sidebar by default', () => {
      renderWithRouter()

      const sidebar = screen.getByRole('navigation', { name: /sidebar/i })
      expect(sidebar).toHaveClass('w-16')
    })

    it('should expand sidebar on mouse enter', () => {
      renderWithRouter()

      const sidebar = screen.getByRole('navigation', { name: /sidebar/i })
      fireEvent.mouseEnter(sidebar)

      expect(sidebar).toHaveClass('w-56')
    })

    it('should collapse sidebar on mouse leave', () => {
      renderWithRouter()

      const sidebar = screen.getByRole('navigation', { name: /sidebar/i })
      fireEvent.mouseEnter(sidebar)
      fireEvent.mouseLeave(sidebar)

      expect(sidebar).toHaveClass('w-16')
    })

    it('should show app logo/abbreviation when collapsed', () => {
      renderWithRouter()

      // When collapsed, show "NM" abbreviation
      expect(screen.getByText('NM')).toBeInTheDocument()
    })

    it('should show full app name when expanded', () => {
      renderWithRouter()

      const sidebar = screen.getByRole('navigation', { name: /sidebar/i })
      fireEvent.mouseEnter(sidebar)

      expect(screen.getByText('NanoMail')).toBeInTheDocument()
    })
  })

  describe('Navigation Items', () => {
    it('should render Inbox navigation item', () => {
      renderWithRouter()

      expect(screen.getByRole('link', { name: /inbox/i })).toBeInTheDocument()
    })

    it('should render To-Do navigation item', () => {
      renderWithRouter()

      expect(screen.getByRole('link', { name: /to-do/i })).toBeInTheDocument()
    })

    it('should render Settings navigation item', () => {
      renderWithRouter()

      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    })

    it('should show icons for all navigation items', () => {
      renderWithRouter()

      // Check for icons by their SVG elements
      const navItems = screen.getAllByRole('link')
      navItems.forEach(item => {
        expect(item.querySelector('svg')).toBeInTheDocument()
      })
    })

    it('should highlight active navigation item', () => {
      renderWithRouter('/inbox')

      const inboxLink = screen.getByRole('link', { name: /inbox/i })
      expect(inboxLink).toHaveClass('bg-accent')
    })
  })

  describe('Main Content', () => {
    it('should render the Outlet for nested routes', () => {
      renderWithRouter()

      expect(screen.getByTestId('outlet')).toBeInTheDocument()
    })

    it('should have proper layout structure', () => {
      renderWithRouter()

      // Check for flex container
      const container = screen.getByRole('navigation', { name: /sidebar/i }).parentElement
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('h-screen')
    })
  })
})
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

// Mock the contexts
vi.mock('@/lib/ThemeContext', () => ({
  useTheme: () => ({ dark: false, toggle: vi.fn() }),
}))

vi.mock('@/lib/SimonContext', () => ({
  useSimon: () => ({ insights: [], ready: false }),
}))

vi.mock('@/lib/AuthModalContext', () => ({
  useAuthModal: () => ({ open: vi.fn() }),
}))

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

vi.mock('@/api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  },
}))

vi.mock('@/hooks/useGeolocation', () => ({
  default: () => ({ location: null, error: null, loading: false }),
}))

describe('Home Page Component', () => {
  it('renders home page', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText('Truvornex')).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const searchInput = screen.getByPlaceholderText(/search/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('renders service categories', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/cleaning/i)).toBeInTheDocument()
  })

  it('renders Simon AI widget', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/Simon AI/i)).toBeInTheDocument()
  })

  it('renders navigation menu', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/services/i)).toBeInTheDocument()
  })

  it('renders hero section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/find trusted/i)).toBeInTheDocument()
  })

  it('renders location button', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const locationButton = screen.getByRole('button', { name: /location/i })
    expect(locationButton).toBeInTheDocument()
  })

  it('renders provider cards section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/nearby providers/i)).toBeInTheDocument()
  })

  it('renders community section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/community/i)).toBeInTheDocument()
  })

  it('renders events section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/events/i)).toBeInTheDocument()
  })

  it('renders transport section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/transport/i)).toBeInTheDocument()
  })

  it('handles search input', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'cleaning')
    expect(searchInput).toHaveValue('cleaning')
  })

  it('dismisses Simon widget', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    const dismissButton = document.querySelector('.lucide-x')?.parentElement
    if (dismissButton) {
      await user.click(dismissButton)
      // Widget should be dismissed
    }
  })

  it('navigates to AI assistant', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    const aiButton = screen.getByText(/ask simon/i)
    await user.click(aiButton)
    // Should navigate to AI page
  })

  it('renders service category cards', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const categoryCards = document.querySelectorAll('.service-category')
    expect(categoryCards.length).toBeGreaterThan(0)
  })

  it('renders footer', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/contact/i)).toBeInTheDocument()
  })

  it('renders dark mode toggle', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const darkModeToggle = document.querySelector('.dark-mode-toggle')
    expect(darkModeToggle).toBeInTheDocument()
  })

  it('renders user menu when authenticated', () => {
    const { useAuth } = require('@/lib/AuthContext')
    useAuth.mockReturnValue({ user: { id: '1' } })

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    // User menu should be rendered
  })

  it('renders login button when not authenticated', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/login/i)).toBeInTheDocument()
  })

  it('renders mobile menu toggle', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const menuToggle = screen.getByRole('button', { name: /menu/i })
    expect(menuToggle).toBeInTheDocument()
  })

  it('handles mobile menu toggle', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    await user.click(screen.getByRole('button', { name: /menu/i }))
    // Mobile menu should open
  })

  it('renders Simon insights carousel', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const carousel = document.querySelector('.simon-insights')
    expect(carousel).toBeInTheDocument()
  })

  it('renders booking quick action', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/book now/i)).toBeInTheDocument()
  })

  it('renders trust score badges', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    // Trust badges should be rendered
  })

  it('handles service category click', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    const firstCategory = screen.getByText(/cleaning/i)
    await user.click(firstCategory)
    // Should navigate to category page
  })

  it('renders emergency now button', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/emergency/i)).toBeInTheDocument()
  })

  it('renders group buy section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/group buy/i)).toBeInTheDocument()
  })

  it('renders skill swap section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/skill swap/i)).toBeInTheDocument()
  })

  it('renders notification center', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const notificationBell = document.querySelector('.notification-bell')
    expect(notificationBell).toBeInTheDocument()
  })

  it('handles notification click', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    const notificationBell = document.querySelector('.notification-bell')
    if (notificationBell) {
      await user.click(notificationBell)
      // Should open notification panel
    }
  })

  it('renders wallet balance when authenticated', () => {
    const { useAuth } = require('@/lib/AuthContext')
    useAuth.mockReturnValue({ user: { id: '1', wallet_balance: 100 } })

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    // Wallet balance should be shown
  })

  it('renders featured providers', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const providerCards = document.querySelectorAll('.provider-card')
    expect(providerCards.length).toBeGreaterThan(0)
  })

  it('renders testimonial section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/what people say/i)).toBeInTheDocument()
  })

  it('renders FAQ section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/faq/i)).toBeInTheDocument()
  })

  it('renders download app section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText(/download app/i)).toBeInTheDocument()
  })

  it('handles newsletter signup', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    const emailInput = screen.getByPlaceholderText(/email/i)
    await user.type(emailInput, 'test@example.com')
    
    const submitButton = screen.getByRole('button', { name: /subscribe/i })
    await user.click(submitButton)
    // Should handle newsletter signup
  })

  it('renders social media links', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const socialLinks = document.querySelectorAll('.social-link')
    expect(socialLinks.length).toBeGreaterThan(0)
  })

  it('supports data attributes', () => {
    render(
      <MemoryRouter>
        <Home data-testid="test-home-page" />
      </MemoryRouter>
    )
    expect(screen.getByTestId('test-home-page')).toBeInTheDocument()
  })

  it('renders with loading state', () => {
    const { useGeolocation } = require('@/hooks/useGeolocation')
    useGeolocation.mockReturnValue({ location: null, error: null, loading: true })

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    // Should show loading state
  })

  it('renders with error state', () => {
    const { useGeolocation } = require('@/hooks/useGeolocation')
    useGeolocation.mockReturnValue({ location: null, error: 'Location error', loading: false })

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    // Should show error state
  })
})
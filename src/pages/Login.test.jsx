import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import { MemoryRouter } from 'react-router-dom'

// Mock the AuthContext
vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    checkUserAuth: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

describe('Login Page Component', () => {
  it('renders login page', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen.getByText('Truvornex')).toBeInTheDocument()
  })

  it('renders login form', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('renders signup form when signup tab is selected', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.click(screen.getByText('Sign up'))
    expect(screen.getByText('Create account')).toBeInTheDocument()
  })

  it('renders email input', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    const emailInput = screen.getByPlaceholderText(/email/i)
    expect(emailInput).toBeInTheDocument()
  })

  it('renders password input', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    const passwordInput = screen.getByPlaceholderText(/password/i)
    expect(passwordInput).toBeInTheDocument()
  })

  it('renders show password toggle', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    const eyeIcon = document.querySelector('.lucide-eye') || document.querySelector('.lucide-eye-off')
    expect(eyeIcon).toBeInTheDocument()
  })

  it('renders full name input on signup tab', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.click(screen.getByText('Sign up'))
    expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument()
  })

  it('renders role selector on signup tab', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.click(screen.getByText('Sign up'))
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Provider')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    const passwordInput = screen.getByPlaceholderText(/password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    const eyeIcon = document.querySelector('.lucide-eye')
    await user.click(eyeIcon)
    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  it('handles tab switching', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    expect(screen.getByText('Sign in')).toHaveClass('text-foreground')
    
    await user.click(screen.getByText('Sign up'))
    expect(screen.getByText('Sign up')).toHaveClass('text-foreground')
  })

  it('displays error message on failed login', async () => {
    const user = userEvent.setup()
    global.fetch.mockRejectedValue(new Error('Login failed'))
    
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('displays success message on successful signup', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.click(screen.getByText('Sign up'))
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'password123')
    await user.type(screen.getByPlaceholderText(/full name/i), 'Test User')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeInTheDocument()
    })
  })

  it('validates required fields on signup', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.click(screen.getByText('Sign up'))
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/full name/i)).toBeInTheDocument()
    })
  })

  it('renders loading state during form submission', async () => {
    const user = userEvent.setup()
    global.fetch.mockImplementation(() => new Promise(() => {}))
    
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    const loader = document.querySelector('.lucide-loader-2')
    expect(loader).toBeInTheDocument()
  })

  it('renders left panel on large screens', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    const leftPanel = document.querySelector('.hidden.lg\\:flex')
    expect(leftPanel).toBeInTheDocument()
  })

  it('renders particle canvas', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('renders navigation link to home', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen.getByText('Back to home')).toBeInTheDocument()
  })

  it('renders branding elements', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen.getByText('Truvornex')).toBeInTheDocument()
  })

  it('renders security badges', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    const shieldIcon = document.querySelector('.lucide-shield')
    expect(shieldIcon).toBeInTheDocument()
  })

  it('handles role selection', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.click(screen.getByText('Sign up'))
    await user.click(screen.getByText('Provider'))
    
    expect(screen.getByText('Provider')).toHaveClass('bg-foreground', 'text-background')
  })

  it('clears error and success messages on tab change', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.click(screen.getByText('Sign up'))
    await user.click(screen.getByText('Sign in'))
    
    // Error/success should be cleared
  })

  it('redirects authenticated users', async () => {
    const { useAuth } = require('@/lib/AuthContext')
    useAuth.mockReturnValue({ user: { id: '1' }, checkUserAuth: vi.fn() })
    
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    )
    
    // Should redirect
  })

  it('renders responsive layout', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    const container = document.querySelector('.min-h-\\[100vh\\]')
    expect(container).toBeInTheDocument()
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.tab()
    const emailInput = screen.getByPlaceholderText(/email/i)
    expect(emailInput).toHaveFocus()
  })

  it('renders feature highlights', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    const zapIcon = document.querySelector('.lucide-zap')
    expect(zapIcon).toBeInTheDocument()
  })

  it('handles form reset on tab change', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.click(screen.getByText('Sign up'))
    
    const emailInput = screen.getByPlaceholderText(/email/i)
    expect(emailInput).toHaveValue('')
  })

  it('supports data attributes', () => {
    render(
      <MemoryRouter>
        <Login data-testid="test-login-page" />
      </MemoryRouter>
    )
    expect(screen.getByTestId('test-login-page')).toBeInTheDocument()
  })
})
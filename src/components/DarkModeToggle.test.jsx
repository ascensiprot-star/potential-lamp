import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DarkModeToggle from './DarkModeToggle'

// Mock the useDarkMode hook
vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({
    dark: false,
    toggle: vi.fn(),
  }),
}))

describe('DarkModeToggle Component', () => {
  it('renders toggle button', () => {
    render(<DarkModeToggle />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('renders moon icon when not in dark mode', () => {
    render(<DarkModeToggle />)
    const moonIcon = document.querySelector('.lucide-moon')
    expect(moonIcon).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<DarkModeToggle className="custom-class" />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('has correct ARIA label', () => {
    render(<DarkModeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Toggle dark mode')
  })

  it('applies correct base classes', () => {
    render(<DarkModeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-9', 'w-9', 'rounded-xl', 'flex', 'items-center', 'justify-center')
  })

  it('applies hover classes', () => {
    render(<DarkModeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('hover:bg-zinc-100', 'dark:hover:bg-zinc-800')
  })

  it('applies text color classes', () => {
    render(<DarkModeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('text-zinc-500', 'dark:text-zinc-400')
  })

  it('applies hover text color classes', () => {
    render(<DarkModeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('hover:text-zinc-900', 'dark:hover:text-zinc-100')
  })

  it('handles toggle click', async () => {
    const user = userEvent.setup()
    const { useDarkMode } = require('@/hooks/useDarkMode')
    const mockToggle = vi.fn()
    useDarkMode.mockReturnValue({ dark: false, toggle: mockToggle })

    render(<DarkModeToggle />)
    await user.click(screen.getByRole('button'))
    expect(mockToggle).toHaveBeenCalled()
  })

  it('has transition classes', () => {
    render(<DarkModeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('transition-colors')
  })

  it('renders sun icon when in dark mode', () => {
    const { useDarkMode } = require('@/hooks/useDarkMode')
    useDarkMode.mockReturnValue({ dark: true, toggle: vi.fn() })

    render(<DarkModeToggle />)
    const sunIcon = document.querySelector('.lucide-sun')
    expect(sunIcon).toBeInTheDocument()
  })

  it('does not render moon icon when in dark mode', () => {
    const { useDarkMode } = require('@/hooks/useDarkMode')
    useDarkMode.mockReturnValue({ dark: true, toggle: vi.fn() })

    render(<DarkModeToggle />)
    const moonIcon = document.querySelector('.lucide-moon')
    expect(moonIcon).not.toBeInTheDocument()
  })

  it('renders with icon size', () => {
    render(<DarkModeToggle />)
    const icon = document.querySelector('.lucide-moon') || document.querySelector('.lucide-sun')
    expect(icon).toHaveClass('h-4', 'w-4')
  })

  it('supports data attributes', () => {
    render(<DarkModeToggle data-testid="test-dark-mode-toggle" />)
    expect(screen.getByTestId('test-dark-mode-toggle')).toBeInTheDocument()
  })

  it('handles empty className', () => {
    render(<DarkModeToggle className="" />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('handles null className gracefully', () => {
    render(<DarkModeToggle className={null} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('applies rounded corners', () => {
    render(<DarkModeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('rounded-xl')
  })

  it('has correct dimensions', () => {
    render(<DarkModeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-9', 'w-9')
  })

  it('centers content', () => {
    render(<DarkModeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('flex', 'items-center', 'justify-center')
  })
})
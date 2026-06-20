import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('Button Component', () => {
  it('renders button with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')

    rerender(<Button variant="outline">Cancel</Button>)
    expect(screen.getByRole('button')).toHaveClass('border', 'border-input')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent')

    rerender(<Button variant="link">Link</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-primary', 'underline-offset-4')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-8', 'text-xs')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10', 'px-8')

    rerender(<Button size="icon"><svg /></Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9', 'w-9')
  })

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Button ref={ref}>Ref Button</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('renders children correctly', () => {
    render(<Button>Test Content</Button>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders with icon children', () => {
    render(
      <Button>
        <svg data-testid="icon" />
        <span>With Icon</span>
      </Button>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('With Icon')).toBeInTheDocument()
  })

  it('has correct default variant and size', () => {
    render(<Button>Default</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary', 'h-9', 'px-4')
  })

  it('handles multiple clicks', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Multi Click</Button>)
    
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(3)
  })

  it('applies focus-visible classes', () => {
    render(<Button>Focus Test</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-1')
  })

  it('prevents pointer events when disabled', () => {
    render(<Button disabled>Disabled Test</Button>)
    expect(screen.getByRole('button')).toHaveClass('disabled:pointer-events-none')
  })
})
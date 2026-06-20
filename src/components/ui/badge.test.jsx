import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge Component', () => {
  it('renders badge with default variant', () => {
    render(<Badge>Default Badge</Badge>)
    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md', 'border')
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Badge variant="default">Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('bg-primary')

    rerender(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary')).toHaveClass('bg-secondary')

    rerender(<Badge variant="destructive">Destructive</Badge>)
    expect(screen.getByText('Destructive')).toHaveClass('bg-destructive')

    rerender(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText('Outline')).toHaveClass('text-foreground')
  })

  it('applies custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>)
    expect(screen.getByText('Custom')).toHaveClass('custom-badge')
  })

  it('renders with correct base classes', () => {
    render(<Badge>Test</Badge>)
    const badge = screen.getByText('Test')
    expect(badge).toHaveClass(
      'px-2.5',
      'py-0.5',
      'text-xs',
      'font-semibold',
      'transition-colors'
    )
  })

  it('has focus ring classes', () => {
    render(<Badge>Focus Test</Badge>)
    const badge = screen.getByText('Focus Test')
    expect(badge).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-ring',
      'focus:ring-offset-2'
    )
  })

  it('renders with hover states', () => {
    const { rerender } = render(<Badge variant="default">Hover Default</Badge>)
    expect(screen.getByText('Hover Default')).toHaveClass('hover:bg-primary/80')

    rerender(<Badge variant="secondary">Hover Secondary</Badge>)
    expect(screen.getByText('Hover Secondary')).toHaveClass('hover:bg-secondary/80')

    rerender(<Badge variant="destructive">Hover Destructive</Badge>)
    expect(screen.getByText('Hover Destructive')).toHaveClass('hover:bg-destructive/80')
  })

  it('has shadow on default variant', () => {
    render(<Badge variant="default">Shadow Badge</Badge>)
    expect(screen.getByText('Shadow Badge')).toHaveClass('shadow')
  })

  it('has shadow on destructive variant', () => {
    render(<Badge variant="destructive">Destructive Shadow</Badge>)
    expect(screen.getByText('Destructive Shadow')).toHaveClass('shadow')
  })

  it('renders long text correctly', () => {
    render(<Badge>This is a very long badge text that should still render properly</Badge>)
    expect(screen.getByText('This is a very long badge text that should still render properly')).toBeInTheDocument()
  })

  it('renders with numbers', () => {
    render(<Badge>42</Badge>)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders with special characters', () => {
    render(<Badge>Badge & Test!</Badge>)
    expect(screen.getByText('Badge & Test!')).toBeInTheDocument()
  })

  it('renders with icon children', () => {
    render(
      <Badge>
        <span>★</span>
        <span>Star Badge</span>
      </Badge>
    )
    expect(screen.getByText('★')).toBeInTheDocument()
    expect(screen.getByText('Star Badge')).toBeInTheDocument()
  })

  it('has transparent border on non-outline variants', () => {
    const { rerender } = render(<Badge variant="default">Default Border</Badge>)
    expect(screen.getByText('Default Border')).toHaveClass('border-transparent')

    rerender(<Badge variant="secondary">Secondary Border</Badge>)
    expect(screen.getByText('Secondary Border')).toHaveClass('border-transparent')

    rerender(<Badge variant="destructive">Destructive Border</Badge>)
    expect(screen.getByText('Destructive Border')).toHaveClass('border-transparent')
  })

  it('maintains correct color contrast', () => {
    const { rerender } = render(<Badge variant="default">Primary</Badge>)
    expect(screen.getByText('Primary')).toHaveClass('text-primary-foreground')

    rerender(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary')).toHaveClass('text-secondary-foreground')

    rerender(<Badge variant="destructive">Destructive</Badge>)
    expect(screen.getByText('Destructive')).toHaveClass('text-destructive-foreground')
  })

  it('renders badge with inline content', () => {
    render(
      <div>
        Text <Badge>Inline Badge</Badge> more text
      </div>
    )
    expect(screen.getByText('Inline Badge')).toBeInTheDocument()
  })

  it('supports data attributes', () => {
    render(<Badge data-testid="test-badge">Data Badge</Badge>)
    expect(screen.getByTestId('test-badge')).toBeInTheDocument()
  })

  it('handles empty string content', () => {
    render(<Badge></Badge>)
    const badge = screen.getByText('')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('px-2.5', 'py-0.5')
  })
})
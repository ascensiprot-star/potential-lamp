import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Separator } from './separator'

describe('Separator Component', () => {
  it('renders horizontal separator by default', () => {
    render(<Separator />)
    const separator = document.querySelector('[data-orientation]')
    expect(separator).toBeInTheDocument()
    expect(separator).toHaveAttribute('data-orientation', 'horizontal')
  })

  it('renders vertical separator when orientation is vertical', () => {
    render(<Separator orientation="vertical" />)
    const separator = document.querySelector('[data-orientation="vertical"]')
    expect(separator).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Separator className="custom-separator" />)
    const separator = document.querySelector('.custom-separator')
    expect(separator).toBeInTheDocument()
  })

  it('applies correct classes for horizontal orientation', () => {
    render(<Separator orientation="horizontal" />)
    const separator = document.querySelector('[data-orientation="horizontal"]')
    expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-[1px]', 'w-full')
  })

  it('applies correct classes for vertical orientation', () => {
    render(<Separator orientation="vertical" />)
    const separator = document.querySelector('[data-orientation="vertical"]')
    expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-full', 'w-[1px]')
  })

  it('sets decorative attribute by default', () => {
    render(<Separator />)
    const separator = document.querySelector('[data-orientation]')
    expect(separator).toHaveAttribute('role', 'none')
  })

  it('respects decorative prop', () => {
    render(<Separator decorative={false} />)
    const separator = document.querySelector('[data-orientation]')
    expect(separator).not.toHaveAttribute('role', 'none')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Separator ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('renders with custom height via className', () => {
    render(<Separator className="h-2" />)
    const separator = document.querySelector('.h-2')
    expect(separator).toBeInTheDocument()
  })

  it('renders with custom width via className', () => {
    render(<Separator orientation="vertical" className="w-2" />)
    const separator = document.querySelector('.w-2')
    expect(separator).toBeInTheDocument()
  })

  it('supports data attributes', () => {
    render(<Separator data-testid="test-separator" />)
    expect(screen.getByTestId('test-separator')).toBeInTheDocument()
  })

  it('renders with custom background color', () => {
    render(<Separator className="bg-red-500" />)
    const separator = document.querySelector('.bg-red-500')
    expect(separator).toBeInTheDocument()
  })

  it('renders with margin classes', () => {
    render(<Separator className="my-4" />)
    const separator = document.querySelector('.my-4')
    expect(separator).toBeInTheDocument()
  })

  it('renders with inline styles', () => {
    render(<Separator style={{ backgroundColor: '#ff0000' }} />)
    const separator = document.querySelector('[style*="background-color"]')
    expect(separator).toBeInTheDocument()
  })

  it('renders separator in card context', () => {
    render(
      <div>
        <div>Content above</div>
        <Separator />
        <div>Content below</div>
      </div>
    )
    expect(screen.getByText('Content above')).toBeInTheDocument()
    expect(screen.getByText('Content below')).toBeInTheDocument()
  })

  it('renders multiple separators', () => {
    render(
      <div>
        <div>Section 1</div>
        <Separator />
        <div>Section 2</div>
        <Separator />
        <div>Section 3</div>
      </div>
    )
    const separators = document.querySelectorAll('[data-orientation]')
    expect(separators.length).toBe(2)
  })

  it('renders separator with custom border styles', () => {
    render(<Separator className="border-2 border-dashed" />)
    const separator = document.querySelector('.border-2.border-dashed')
    expect(separator).toBeInTheDocument()
  })

  it('renders separator in vertical layout', () => {
    render(
      <div className="flex h-64">
        <div className="w-1/2">Left</div>
        <Separator orientation="vertical" />
        <div className="w-1/2">Right</div>
      </div>
    )
    expect(screen.getByText('Left')).toBeInTheDocument()
    expect(screen.getByText('Right')).toBeInTheDocument()
  })

  it('has correct ARIA attributes when decorative', () => {
    render(<Separator />)
    const separator = document.querySelector('[data-orientation]')
    expect(separator).toHaveAttribute('role', 'none')
  })

  it('handles orientation change', () => {
    const { rerender } = render(<Separator orientation="horizontal" />)
    expect(document.querySelector('[data-orientation="horizontal"]')).toBeInTheDocument()

    rerender(<Separator orientation="vertical" />)
    expect(document.querySelector('[data-orientation="vertical"]')).toBeInTheDocument()
  })

  it('renders with opacity', () => {
    render(<Separator className="opacity-50" />)
    const separator = document.querySelector('.opacity-50')
    expect(separator).toBeInTheDocument()
  })

  it('renders with hidden class', () => {
    render(<Separator className="hidden" />)
    const separator = document.querySelector('.hidden')
    expect(separator).toBeInTheDocument()
  })

  it('applies shrink-0 class', () => {
    render(<Separator />)
    const separator = document.querySelector('[data-orientation]')
    expect(separator).toHaveClass('shrink-0')
  })

  it('renders in menu context', () => {
    render(
      <div className="space-y-2">
        <div>Menu Item 1</div>
        <Separator />
        <div>Menu Item 2</div>
      </div>
    )
    expect(screen.getByText('Menu Item 1')).toBeInTheDocument()
    expect(screen.getByText('Menu Item 2')).toBeInTheDocument()
  })

  it('renders with custom spacing', () => {
    render(<Separator className="my-8" />)
    const separator = document.querySelector('.my-8')
    expect(separator).toBeInTheDocument()
  })
})
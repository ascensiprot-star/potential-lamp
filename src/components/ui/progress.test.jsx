import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from './progress'

describe('Progress Component', () => {
  it('renders progress with default props', () => {
    render(<Progress />)
    const progress = document.querySelector('[role="progressbar"]')
    expect(progress).toBeInTheDocument()
  })

  it('renders with value prop', () => {
    render(<Progress value={50} />)
    const progress = document.querySelector('[role="progressbar"]')
    expect(progress).toHaveAttribute('aria-valuenow', '50')
  })

  it('renders with custom className', () => {
    render(<Progress className="custom-progress" />)
    const progress = document.querySelector('[role="progressbar"]')
    expect(progress).toHaveClass('custom-progress')
  })

  it('applies correct base classes', () => {
    render(<Progress />)
    const progress = document.querySelector('[role="progressbar"]')
    expect(progress).toHaveClass(
      'relative',
      'h-2',
      'w-full',
      'overflow-hidden',
      'rounded-full',
      'bg-primary/20'
    )
  })

  it('renders indicator with correct classes', () => {
    render(<Progress value={50} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveClass('h-full', 'w-full', 'flex-1', 'bg-primary', 'transition-all')
  })

  it('calculates correct transform for 0%', () => {
    render(<Progress value={0} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveStyle('transform: translateX(-100%)')
  })

  it('calculates correct transform for 50%', () => {
    render(<Progress value={50} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveStyle('transform: translateX(-50%)')
  })

  it('calculates correct transform for 100%', () => {
    render(<Progress value={100} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveStyle('transform: translateX(0%)')
  })

  it('calculates correct transform for 25%', () => {
    render(<Progress value={25} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveStyle('transform: translateX(-75%)')
  })

  it('calculates correct transform for 75%', () => {
    render(<Progress value={75} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveStyle('transform: translateX(-25%)')
  })

  it('handles undefined value', () => {
    render(<Progress />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveStyle('transform: translateX(-100%)')
  })

  it('handles null value', () => {
    render(<Progress value={null} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveStyle('transform: translateX(-100%)')
  })

  it('handles values greater than 100', () => {
    render(<Progress value={150} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    // Should cap at 100%
    expect(indicator).toHaveStyle('transform: translateX(0%)')
  })

  it('handles negative values', () => {
    render(<Progress value={-10} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    // Should be treated as 0
    expect(indicator).toHaveStyle('transform: translateX(-100%)')
  })

  it('has correct ARIA attributes', () => {
    render(<Progress value={50} />)
    const progress = document.querySelector('[role="progressbar"]')
    expect(progress).toHaveAttribute('role', 'progressbar')
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(progress).toHaveAttribute('aria-valuenow', '50')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Progress ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('supports data attributes', () => {
    render(<Progress data-testid="test-progress" />)
    expect(screen.getByTestId('test-progress')).toBeInTheDocument()
  })

  it('handles decimal values', () => {
    render(<Progress value={33.33} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveStyle('transform: translateX(-66.67%)')
  })

  it('handles very small values', () => {
    render(<Progress value={0.1} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveStyle('transform: translateX(-99.9%)')
  })

  it('handles controlled value updates', () => {
    const { rerender } = render(<Progress value={25} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveStyle('transform: translateX(-75%)')
    
    rerender(<Progress value={50} />)
    expect(indicator).toHaveStyle('transform: translateX(-50%)')
    
    rerender(<Progress value={75} />)
    expect(indicator).toHaveStyle('transform: translateX(-25%)')
  })

  it('renders with custom height via className', () => {
    render(<Progress className="h-4" />)
    const progress = document.querySelector('[role="progressbar"]')
    expect(progress).toHaveClass('h-4')
  })

  it('renders with custom width via className', () => {
    render(<Progress className="w-1/2" />)
    const progress = document.querySelector('[role="progressbar"]')
    expect(progress).toHaveClass('w-1/2')
  })

  it('indicator has transition class', () => {
    render(<Progress value={50} />)
    const indicator = document.querySelector('.h-full.w-full.flex-1.bg-primary')
    expect(indicator).toHaveClass('transition-all')
  })

  it('handles indeterminate state', () => {
    render(<Progress />)
    const progress = document.querySelector('[role="progressbar"]')
    expect(progress).toHaveAttribute('aria-valuenow', '0')
  })

  it('renders without crashing with extreme values', () => {
    const { rerender } = render(<Progress value={999999} />)
    expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument()
    
    rerender(<Progress value={-999999} />)
    expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument()
  })
})
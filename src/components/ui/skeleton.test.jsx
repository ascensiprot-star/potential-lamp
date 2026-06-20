import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from './skeleton'

describe('Skeleton Component', () => {
  it('renders skeleton with default classes', () => {
    render(<Skeleton />)
    const skeleton = screen.getByTestId('skeleton') || document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Skeleton className="custom-skeleton" />)
    const skeleton = document.querySelector('.custom-skeleton')
    expect(skeleton).toBeInTheDocument()
  })

  it('applies correct base classes', () => {
    render(<Skeleton />)
    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-primary/10')
  })

  it('renders with custom width', () => {
    render(<Skeleton className="w-32" />)
    const skeleton = document.querySelector('.w-32')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders with custom height', () => {
    render(<Skeleton className="h-8" />)
    const skeleton = document.querySelector('.h-8')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders as circle', () => {
    render(<Skeleton className="rounded-full" />)
    const skeleton = document.querySelector('.rounded-full')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders with data attributes', () => {
    render(<Skeleton data-testid="test-skeleton" />)
    expect(screen.getByTestId('test-skeleton')).toBeInTheDocument()
  })

  it('renders multiple skeletons', () => {
    render(
      <div>
        <Skeleton className="w-32 h-8" />
        <Skeleton className="w-48 h-8" />
        <Skeleton className="w-40 h-8" />
      </div>
    )
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('renders skeleton for avatar', () => {
    render(<Skeleton className="h-10 w-10 rounded-full" />)
    const skeleton = document.querySelector('.h-10.w-10.rounded-full')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders skeleton for card', () => {
    render(<Skeleton className="h-48 w-full rounded-lg" />)
    const skeleton = document.querySelector('.h-48.w-full.rounded-lg')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders skeleton for text line', () => {
    render(<Skeleton className="h-4 w-3/4" />)
    const skeleton = document.querySelector('.h-4.w-3\\/4')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders skeleton for button', () => {
    render(<Skeleton className="h-10 w-24 rounded-md" />)
    const skeleton = document.querySelector('.h-10.w-24.rounded-md')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders skeleton for image', () => {
    render(<Skeleton className="h-64 w-full rounded-lg" />)
    const skeleton = document.querySelector('.h-64.w-full.rounded-lg')
    expect(skeleton).toBeInTheDocument()
  })

  it('has animation class', () => {
    render(<Skeleton />)
    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toHaveClass('animate-pulse')
  })

  it('applies custom background color', () => {
    render(<Skeleton className="bg-gray-200" />)
    const skeleton = document.querySelector('.bg-gray-200')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders skeleton with inline styles', () => {
    render(<Skeleton style={{ width: '100px', height: '50px' }} />)
    const skeleton = document.querySelector('[style*="width: 100px"]')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders skeleton without children', () => {
    render(<Skeleton />)
    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton.children.length).toBe(0)
  })

  it('renders skeleton with custom border radius', () => {
    render(<Skeleton className="rounded-xl" />)
    const skeleton = document.querySelector('.rounded-xl')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders skeleton for input field', () => {
    render(<Skeleton className="h-10 w-full rounded-md" />)
    const skeleton = document.querySelector('.h-10.w-full.rounded-md')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders skeleton for table row', () => {
    render(
      <div className="flex gap-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
    )
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('renders skeleton for list item', () => {
    render(
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(2)
  })

  it('renders skeleton with custom animation delay', () => {
    render(<Skeleton className="animate-pulse" style={{ animationDelay: '0.5s' }} />)
    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toHaveAttribute('style')
  })

  it('renders skeleton with opacity', () => {
    render(<Skeleton className="opacity-50" />)
    const skeleton = document.querySelector('.opacity-50')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders skeleton for complete card structure', () => {
    render(
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(4)
  })

  it('renders skeleton with hidden class', () => {
    render(<Skeleton className="hidden" />)
    const skeleton = document.querySelector('.hidden')
    expect(skeleton).toBeInTheDocument()
  })
})
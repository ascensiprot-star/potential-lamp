import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScrollArea, ScrollBar } from './scroll-area'

describe('ScrollArea Component', () => {
  it('renders scroll area with children', () => {
    render(
      <ScrollArea>
        <div>Scrollable Content</div>
      </ScrollArea>
    )
    expect(screen.getByText('Scrollable Content')).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    render(
      <ScrollArea className="custom-scroll">
        <div>Content</div>
      </ScrollArea>
    )
    const scrollArea = document.querySelector('.custom-scroll')
    expect(scrollArea).toBeInTheDocument()
  })

  it('applies correct base classes', () => {
    render(
      <ScrollArea>
        <div>Base Classes</div>
      </ScrollArea>
    )
    const scrollArea = document.querySelector('.relative.overflow-hidden')
    expect(scrollArea).toBeInTheDocument()
  })

  it('renders viewport with correct classes', () => {
    render(
      <ScrollArea>
        <div>Viewport Test</div>
      </ScrollArea>
    )
    const viewport = document.querySelector('.h-full.w-full.rounded-\\[inherit\\]')
    expect(viewport).toBeInTheDocument()
  })

  it('renders scroll bar by default', () => {
    render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    )
    const scrollBar = document.querySelector('.flex.touch-none')
    expect(scrollBar).toBeInTheDocument()
  })

  it('renders scroll bar with vertical orientation by default', () => {
    render(<ScrollBar />)
    const scrollBar = document.querySelector('.h-full.w-2\\.5')
    expect(scrollBar).toBeInTheDocument()
  })

  it('renders scroll bar with horizontal orientation', () => {
    render(<ScrollBar orientation="horizontal" />)
    const scrollBar = document.querySelector('.h-2\\.5.flex-col')
    expect(scrollBar).toBeInTheDocument()
  })

  it('applies custom className to scroll bar', () => {
    render(<ScrollBar className="custom-scrollbar" />)
    const scrollBar = document.querySelector('.custom-scrollbar')
    expect(scrollBar).toBeInTheDocument()
  })

  it('renders scroll bar thumb', () => {
    render(<ScrollBar />)
    const thumb = document.querySelector('.relative.flex-1.rounded-full')
    expect(thumb).toBeInTheDocument()
  })

  it('forwards ref correctly for scroll area', () => {
    const ref = { current: null }
    render(
      <ScrollArea ref={ref}>
        <div>Content</div>
      </ScrollArea>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('forwards ref correctly for scroll bar', () => {
    const ref = { current: null }
    render(<ScrollBar ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('renders with long content to enable scrolling', () => {
    render(
      <ScrollArea className="h-32">
        <div className="space-y-4">
          {[...Array(20)].map((_, i) => (
            <div key={i}>Item {i}</div>
          ))}
        </div>
      </ScrollArea>
    )
    expect(screen.getByText('Item 0')).toBeInTheDocument()
    expect(screen.getByText('Item 19')).toBeInTheDocument()
  })

  it('applies correct classes for vertical scroll bar', () => {
    render(<ScrollBar orientation="vertical" />)
    const scrollBar = document.querySelector('.h-full.w-2\\.5')
    expect(scrollBar).toHaveClass(
      'flex',
      'touch-none',
      'select-none',
      'transition-colors',
      'h-full',
      'w-2.5',
      'border-l',
      'border-l-transparent'
    )
  })

  it('applies correct classes for horizontal scroll bar', () => {
    render(<ScrollBar orientation="horizontal" />)
    const scrollBar = document.querySelector('.h-2\\.5.flex-col')
    expect(scrollBar).toHaveClass(
      'flex',
      'touch-none',
      'select-none',
      'transition-colors',
      'h-2.5',
      'flex-col',
      'border-t',
      'border-t-transparent'
    )
  })

  it('applies correct classes to scroll bar thumb', () => {
    render(<ScrollBar />)
    const thumb = document.querySelector('.relative.flex-1.rounded-full')
    expect(thumb).toHaveClass('relative', 'flex-1', 'rounded-full', 'bg-border')
  })

  it('renders scroll area with custom height', () => {
    render(
      <ScrollArea className="h-64">
        <div>Tall Content</div>
      </ScrollArea>
    )
    const scrollArea = document.querySelector('.h-64')
    expect(scrollArea).toBeInTheDocument()
  })

  it('renders scroll area with custom width', () => {
    render(
      <ScrollArea className="w-64">
        <div>Wide Content</div>
      </ScrollArea>
    )
    const scrollArea = document.querySelector('.w-64')
    expect(scrollArea).toBeInTheDocument()
  })

  it('supports data attributes', () => {
    render(
      <ScrollArea data-testid="test-scroll">
        <div>Content</div>
      </ScrollArea>
    )
    expect(screen.getByTestId('test-scroll')).toBeInTheDocument()
  })

  it('renders with multiple children', () => {
    render(
      <ScrollArea>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ScrollArea>
    )
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })

  it('renders scroll area with nested content', () => {
    render(
      <ScrollArea>
        <div className="nested">
          <div>Level 1</div>
          <div>Level 2</div>
        </div>
      </ScrollArea>
    )
    expect(screen.getByText('Level 1')).toBeInTheDocument()
    expect(screen.getByText('Level 2')).toBeInTheDocument()
  })

  it('renders with border radius inheritance', () => {
    render(
      <ScrollArea className="rounded-lg">
        <div>Rounded Content</div>
      </ScrollArea>
    )
    const viewport = document.querySelector('.rounded-\\[inherit\\]')
    expect(viewport).toBeInTheDocument()
  })

  it('handles scroll bar visibility', () => {
    render(
      <ScrollArea className="h-20">
        <div>Content that needs scrolling</div>
      </ScrollArea>
    )
    const scrollBar = document.querySelector('.flex.touch-none')
    expect(scrollBar).toBeInTheDocument()
  })

  it('renders corner element', () => {
    render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    )
    const corner = document.querySelector('[data-radix-scroll-area-corner]')
    expect(corner).toBeInTheDocument()
  })

  it('applies custom background to thumb', () => {
    render(<ScrollBar className="[&>div]:bg-gray-500" />)
    const scrollBar = document.querySelector('.\\[&>div\\]:bg-gray-500')
    expect(scrollBar).toBeInTheDocument()
  })

  it('renders with custom padding', () => {
    render(
      <ScrollArea className="p-4">
        <div>Padded Content</div>
      </ScrollArea>
    )
    const scrollArea = document.querySelector('.p-4')
    expect(scrollArea).toBeInTheDocument()
  })

  it('handles horizontal scroll area', () => {
    render(
      <ScrollArea className="w-64">
        <div className="flex whitespace-nowrap">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="mr-4">Item {i}</div>
          ))}
        </div>
      </ScrollArea>
    )
    expect(screen.getByText('Item 0')).toBeInTheDocument()
    expect(screen.getByText('Item 9')).toBeInTheDocument()
  })

  it('renders scroll bar with custom orientation change', () => {
    const { rerender } = render(<ScrollBar orientation="vertical" />)
    expect(document.querySelector('.h-full.w-2\\.5')).toBeInTheDocument()

    rerender(<ScrollBar orientation="horizontal" />)
    expect(document.querySelector('.h-2\\.5.flex-col')).toBeInTheDocument()
  })

  it('applies hidden class to scroll bar', () => {
    render(<ScrollBar className="hidden" />)
    const scrollBar = document.querySelector('.hidden')
    expect(scrollBar).toBeInTheDocument()
  })

  it('renders with auto-scroll to content', () => {
    render(
      <ScrollArea>
        <div>Auto Scroll Content</div>
      </ScrollArea>
    )
    expect(screen.getByText('Auto Scroll Content')).toBeInTheDocument()
  })
})
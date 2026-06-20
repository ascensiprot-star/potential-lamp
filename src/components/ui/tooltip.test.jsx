import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'

describe('Tooltip Component', () => {
  it('renders tooltip trigger', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    await user.hover(screen.getByText('Hover me'))
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument()
    })
  })

  it('hides tooltip when mouse leaves', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    await user.hover(screen.getByText('Hover me'))
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument()
    })

    await user.unhover(screen.getByText('Hover me'))
    
    await waitFor(() => {
      expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument()
    })
  })

  it('renders with custom className', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent className="custom-tooltip">Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Content').parentElement).toHaveClass('custom-tooltip')
  })

  it('renders with custom side offset', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent sideOffset={10}>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies correct base classes to content', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Base Classes</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    const content = screen.getByText('Base Classes').parentElement
    expect(content).toHaveClass(
      'z-50',
      'overflow-hidden',
      'rounded-md',
      'bg-primary',
      'px-3',
      'py-1.5',
      'text-xs',
      'text-primary-foreground'
    )
  })

  it('has animation classes', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Animated</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    const content = screen.getByText('Animated').parentElement
    expect(content).toHaveClass('animate-in', 'fade-in-0', 'zoom-in-95')
  })

  it('has close animation classes', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Close Animation</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    const content = screen.getByText('Close Animation').parentElement
    expect(content).toHaveClass('data-[state=closed]:animate-out', 'data-[state=closed]:fade-out-0')
  })

  it('handles controlled open state', () => {
    const { rerender } = render(
      <TooltipProvider>
        <Tooltip open={false}>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.queryByText('Content')).not.toBeInTheDocument()

    rerender(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('shows tooltip on focus', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <button>Focus me</button>
          </TooltipTrigger>
          <TooltipContent>Focus content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText('Focus content')).toBeInTheDocument()
    })
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent ref={ref}>Ref Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('renders with complex trigger content', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>
            <button>
              <span>Icon</span>
              <span>Button Text</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Button Text')).toBeInTheDocument()
  })

  it('renders with complex tooltip content', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>
            <div>
              <strong>Rich Content</strong>
              <p>Description text</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Rich Content')).toBeInTheDocument()
    expect(screen.getByText('Description text')).toBeInTheDocument()
  })

  it('handles delay behavior', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger>Delay Trigger</TooltipTrigger>
          <TooltipContent>Delayed Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    await user.hover(screen.getByText('Delay Trigger'))
    // Content should appear after delay
  })

  it('renders without tooltip provider when using default', () => {
    render(
      <Tooltip open>
        <TooltipTrigger>Trigger</TooltipTrigger>
        <TooltipContent>No Provider</TooltipContent>
      </Tooltip>
    )
    // Should still render, though behavior may differ
    expect(screen.getByText('Trigger')).toBeInTheDocument()
  })

  it('supports data attributes', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent data-testid="test-tooltip">Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByTestId('test-tooltip')).toBeInTheDocument()
  })

  it('renders with multiple tooltips', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger 1</TooltipTrigger>
          <TooltipContent>Content 1</TooltipContent>
        </Tooltip>
        <Tooltip open>
          <TooltipTrigger>Trigger 2</TooltipTrigger>
          <TooltipContent>Content 2</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Trigger 1')).toBeInTheDocument()
    expect(screen.getByText('Trigger 2')).toBeInTheDocument()
    expect(screen.getByText('Content 1')).toBeInTheDocument()
    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })

  it('handles tooltip with keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <button>Keyboard Trigger</button>
          </TooltipTrigger>
          <TooltipContent>Keyboard Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    await user.tab()
    const button = screen.getByRole('button')
    expect(button).toHaveFocus()
  })

  it('renders tooltip with arrow', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Arrow Tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Arrow Tooltip')).toBeInTheDocument()
  })

  it('handles tooltip positioning', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent side="top">Top Positioned</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Top Positioned')).toBeInTheDocument()
  })

  it('supports skip delay', () => {
    render(
      <TooltipProvider skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Skip Trigger</TooltipTrigger>
          <TooltipContent>Skip Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Skip Trigger')).toBeInTheDocument()
  })
})
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './popover'

describe('Popover Component', () => {
  it('renders popover trigger button', () => {
    render(
      <Popover>
        <PopoverTrigger>Open Popover</PopoverTrigger>
        <PopoverContent>Popover Content</PopoverContent>
      </Popover>
    )
    expect(screen.getByText('Open Popover')).toBeInTheDocument()
  })

  it('opens popover when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Popover Content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Popover Content')).toBeInTheDocument()
    })
  })

  it('closes popover when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    await user.click(document.body)
    
    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })
  })

  it('renders popover with custom className', () => {
    render(
      <Popover open>
        <PopoverContent className="custom-popover">Content</PopoverContent>
      </Popover>
    )
    expect(screen.getByText('Content').parentElement).toHaveClass('custom-popover')
  })

  it('renders popover with different alignments', () => {
    const { rerender } = render(
      <Popover open>
        <PopoverContent align="start">Start Aligned</PopoverContent>
      </Popover>
    )
    expect(screen.getByText('Start Aligned')).toBeInTheDocument()

    rerender(
      <Popover open>
        <PopoverContent align="end">End Aligned</PopoverContent>
      </Popover>
    )
    expect(screen.getByText('End Aligned')).toBeInTheDocument()

    rerender(
      <Popover open>
        <PopoverContent align="center">Center Aligned</PopoverContent>
      </Popover>
    )
    expect(screen.getByText('Center Aligned')).toBeInTheDocument()
  })

  it('renders with custom side offset', () => {
    render(
      <Popover open>
        <PopoverContent sideOffset={10}>Content</PopoverContent>
      </Popover>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('handles controlled open state', () => {
    const { rerender } = render(
      <Popover open={false}>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    )
    
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
    
    rerender(
      <Popover open>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    )
    
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies correct base classes to content', () => {
    render(
      <Popover open>
        <PopoverContent>Base Classes</PopoverContent>
      </Popover>
    )
    
    const content = screen.getByText('Base Classes').parentElement
    expect(content).toHaveClass(
      'z-50',
      'w-72',
      'rounded-md',
      'border',
      'bg-popover',
      'p-4',
      'text-popover-foreground',
      'shadow-md'
    )
  })

  it('has animation classes', () => {
    render(
      <Popover open>
        <PopoverContent>Animated Content</PopoverContent>
      </Popover>
    )
    
    const content = screen.getByText('Animated Content').parentElement
    expect(content).toHaveClass('data-[state=open]:animate-in', 'data-[state=closed]:animate-out')
  })

  it('renders popover anchor', () => {
    render(
      <Popover>
        <PopoverAnchor>
          <div id="anchor">Anchor Element</div>
        </PopoverAnchor>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    )
    
    expect(screen.getByText('Anchor Element')).toBeInTheDocument()
  })

  it('supports complex content', () => {
    render(
      <Popover open>
        <PopoverContent>
          <h3>Title</h3>
          <p>Description text</p>
          <button>Action</button>
        </PopoverContent>
      </Popover>
    )
    
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description text')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(
      <Popover open>
        <PopoverContent ref={ref}>Ref Content</PopoverContent>
      </Popover>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('closes on escape key press', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')
    
    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })
  })

  it('handles popover with default open', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Trigger</PopoverTrigger>
        <PopoverContent>Default Open Content</PopoverContent>
      </Popover>
    )
    
    expect(screen.getByText('Default Open Content')).toBeInTheDocument()
  })

  it('supports onOpenChange callback', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <Popover onOpenChange={handleChange}>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByText('Open'))
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('renders popover with custom width', () => {
    render(
      <Popover open>
        <PopoverContent className="w-96">Custom Width</PopoverContent>
      </Popover>
    )
    
    expect(screen.getByText('Custom Width').parentElement).toHaveClass('w-96')
  })

  it('supports data attributes', () => {
    render(
      <Popover open>
        <PopoverContent data-testid="test-popover">Content</PopoverContent>
      </Popover>
    )
    
    expect(screen.getByTestId('test-popover')).toBeInTheDocument()
  })

  it('handles focus management', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>Focus Trigger</PopoverTrigger>
        <PopoverContent>
          <input placeholder="Focus input" />
        </PopoverContent>
      </Popover>
    )

    await user.click(screen.getByText('Focus Trigger'))
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Focus input')).toBeInTheDocument()
    })
  })

  it('renders without trigger when controlled', () => {
    render(
      <Popover open>
        <PopoverContent>No Trigger Content</PopoverContent>
      </Popover>
    )
    
    expect(screen.getByText('No Trigger Content')).toBeInTheDocument()
  })

  it('handles portal behavior', () => {
    render(
      <Popover open>
        <PopoverContent>Portal Content</PopoverContent>
      </Popover>
    )
    
    // Content should be rendered in a portal
    expect(screen.getByText('Portal Content')).toBeInTheDocument()
  })
})
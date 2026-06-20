import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion'

describe('Accordion Component', () => {
  it('renders accordion item', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('expands item when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Expandable Item</AccordionTrigger>
          <AccordionContent>Hidden Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    await user.click(screen.getByText('Expandable Item'))
    expect(screen.getByText('Hidden Content')).toBeInTheDocument()
  })

  it('collapses item when trigger is clicked again', async () => {
    const user = userEvent.setup()
    render(
      <Accordion type="single" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Collapsible Item</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()

    await user.click(screen.getByText('Collapsible Item'))
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('handles multiple items with collapsible behavior', async () => {
    const user = userEvent.setup()
    render(
      <Accordion type="multiple">
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    await user.click(screen.getByText('Item 1'))
    await user.click(screen.getByText('Item 2'))

    expect(screen.getByText('Content 1')).toBeInTheDocument()
    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })

  it('handles single item behavior', async () => {
    const user = userEvent.setup()
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    await user.click(screen.getByText('Item 1'))
    expect(screen.getByText('Content 1')).toBeInTheDocument()

    await user.click(screen.getByText('Item 2'))
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument()
    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })

  it('renders with custom className on item', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1" className="custom-item">
          <AccordionTrigger>Custom Item</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('Custom Item').parentElement.parentElement).toHaveClass('custom-item')
  })

  it('renders with custom className on trigger', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger className="custom-trigger">Custom Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('Custom Trigger')).toHaveClass('custom-trigger')
  })

  it('renders with custom className on content', () => {
    render(
      <Accordion type="single" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent className="custom-content">Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('Content').parentElement).toHaveClass('custom-content')
  })

  it('applies correct base classes to item', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    const item = screen.getByText('Trigger').parentElement.parentElement
    expect(item).toHaveClass('border-b')
  })

  it('applies correct base classes to trigger', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Base Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('Base Trigger')).toHaveClass(
      'flex',
      'flex-1',
      'items-center',
      'justify-between',
      'py-4',
      'text-sm',
      'font-medium'
    )
  })

  it('applies correct base classes to content', () => {
    render(
      <Accordion type="single" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Base Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    const content = screen.getByText('Base Content').parentElement
    expect(content).toHaveClass('pb-4', 'pt-0')
  })

  it('rotates chevron when open', async () => {
    const user = userEvent.setup()
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Chevron Test</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    const chevron = screen.getByRole('img') || document.querySelector('.h-4.w-4')
    expect(chevron).toHaveClass('transition-transform')

    await user.click(screen.getByText('Chevron Test'))
    expect(chevron).toHaveClass('rotate-180')
  })

  it('renders chevron icon', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Chevron Item</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    const chevron = document.querySelector('.h-4.w-4')
    expect(chevron).toBeInTheDocument()
  })

  it('handles controlled value', () => {
    const { rerender } = render(
      <Accordion type="single" value="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('Content 1')).toBeInTheDocument()
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument()

    rerender(
      <Accordion type="single" value="item-2">
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument()
    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })

  it('handles default value', () => {
    render(
      <Accordion type="single" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Default Open</AccordionTrigger>
          <AccordionContent>Default Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('Default Content')).toBeInTheDocument()
  })

  it('renders with complex content', () => {
    render(
      <Accordion type="single" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Complex Content</AccordionTrigger>
          <AccordionContent>
            <div>
              <h4>Title</h4>
              <p>Description text</p>
              <button>Action</button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description text')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger ref={ref}>Ref Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Keyboard Item</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    screen.getByText('Keyboard Item').focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('supports data attributes', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1" data-testid="test-item">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByTestId('test-item')).toBeInTheDocument()
  })

  it('renders without content initially collapsed', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Collapsed Item</AccordionTrigger>
          <AccordionContent>Hidden Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument()
  })

  it('handles multiple default values', () => {
    render(
      <Accordion type="multiple" defaultValue={['item-1', 'item-2']}>
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Item 3</AccordionTrigger>
          <AccordionContent>Content 3</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('Content 1')).toBeInTheDocument()
    expect(screen.getByText('Content 2')).toBeInTheDocument()
    expect(screen.queryByText('Content 3')).not.toBeInTheDocument()
  })
})
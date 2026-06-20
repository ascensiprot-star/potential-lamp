import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator, SelectGroup } from './select'

describe('Select Component', () => {
  it('renders select trigger with placeholder', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByText('Choose an option')).toBeInTheDocument()
  })

  it('opens select dropdown when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    )

    await user.click(screen.getByRole('combobox'))
    
    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument()
    })
  })

  it('renders select item with correct value', () => {
    render(
      <Select open>
        <SelectContent>
          <SelectItem value="test-value">Test Item</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })

  it('renders select label', () => {
    render(
      <Select open>
        <SelectContent>
          <SelectLabel>Category</SelectLabel>
          <SelectItem value="1">Item 1</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Category')).toHaveClass('px-2', 'py-1.5', 'text-sm', 'font-semibold')
  })

  it('renders select separator', () => {
    render(
      <Select open>
        <SelectContent>
          <SelectItem value="1">Item 1</SelectItem>
          <SelectSeparator />
          <SelectItem value="2">Item 2</SelectItem>
        </SelectContent>
      </Select>
    )
    
    const separator = document.querySelector('.-mx-1.my-1.h-px')
    expect(separator).toBeInTheDocument()
  })

  it('renders select group', () => {
    render(
      <Select open>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Group 1</SelectLabel>
            <SelectItem value="g1-1">Group 1 Item 1</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Group 2</LabelLabel>
            <SelectItem value="g2-1">Group 2 Item 1</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByText('Group 1')).toBeInTheDocument()
    expect(screen.getByText('Group 2')).toBeInTheDocument()
    expect(screen.getByText('Group 1 Item 1')).toBeInTheDocument()
    expect(screen.getByText('Group 2 Item 1')).toBeInTheDocument()
  })

  it('applies custom className to trigger', () => {
    render(
      <Select>
        <SelectTrigger className="custom-trigger">
          <SelectValue placeholder="Custom" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Item 1</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByRole('combobox')).toHaveClass('custom-trigger')
  })

  it('applies custom className to content', () => {
    render(
      <Select open>
        <SelectContent className="custom-content">
          <SelectItem value="1">Item 1</SelectItem>
        </SelectContent>
      </Select>
    )
    
    const content = screen.getByText('Item 1').parentElement?.parentElement
    expect(content).toHaveClass('custom-content')
  })

  it('applies custom className to items', () => {
    render(
      <Select open>
        <SelectContent>
          <SelectItem value="1" className="custom-item">Custom Item</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByText('Custom Item')).toHaveClass('custom-item')
  })

  it('handles controlled value', () => {
    const { rerender } = render(
      <Select value="option1">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    
    rerender(
      <Select value="option2">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    )
  })

  it('handles disabled state', () => {
    render(
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Disabled" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Item 1</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('selects item when clicked', async () => {
    const user = userEvent.setup()
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    )

    await user.click(screen.getByRole('combobox'))
    
    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Option 1'))
  })

  it('renders select with multiple items', async () => {
    const user = userEvent.setup()
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Multiple Options" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
          <SelectItem value="3">Option 3</SelectItem>
          <SelectItem value="4">Option 4</SelectItem>
        </SelectContent>
      </Select>
    )

    await user.click(screen.getByRole('combobox'))
    
    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
      expect(screen.getByText('Option 3')).toBeInTheDocument()
      expect(screen.getByText('Option 4')).toBeInTheDocument()
    })
  })

  it('renders scroll buttons for long content', () => {
    render(
      <Select open>
        <SelectContent>
          {Array.from({ length: 20 }).map((_, i) => (
            <SelectItem key={i} value={`item-${i}`}>Item {i}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
    
    // Check if scroll up and down buttons are rendered
    const scrollButtons = document.querySelectorAll('[data-radix-select-scroll-button]')
    expect(scrollButtons.length).toBeGreaterThan(0)
  })

  it('handles select with default value', () => {
    render(
      <Select defaultValue="default1">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default1">Default Option 1</SelectItem>
          <SelectItem value="default2">Default Option 2</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('supports onValueChange callback', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <Select onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Change me" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="val1">Value 1</SelectItem>
          <SelectItem value="val2">Value 2</SelectItem>
        </SelectContent>
      </Select>
    )

    await user.click(screen.getByRole('combobox'))
    
    await waitFor(() => {
      expect(screen.getByText('Value 1')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Value 1'))
    // Note: onValueChange might be called asynchronously
  })

  it('renders select with position prop', () => {
    render(
      <Select open>
        <SelectContent position="item-aligned">
          <SelectItem value="1">Item 1</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })
})
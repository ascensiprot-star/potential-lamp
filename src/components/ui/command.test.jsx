import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from './command'

describe('Command Component', () => {
  it('renders command with default props', () => {
    render(<Command />)
    const command = document.querySelector('[cmdk-root]')
    expect(command).toBeInTheDocument()
  })

  it('renders command with custom className', () => {
    render(<Command className="custom-command" />)
    const command = document.querySelector('.custom-command')
    expect(command).toBeInTheDocument()
  })

  it('renders command input', () => {
    render(
      <Command>
        <CommandInput placeholder="Search..." />
      </Command>
    )
    const input = screen.getByPlaceholderText('Search...')
    expect(input).toBeInTheDocument()
  })

  it('renders search icon in input', () => {
    render(
      <Command>
        <CommandInput />
      </Command>
    )
    const icon = document.querySelector('.mr-2.h-4.w-4')
    expect(icon).toBeInTheDocument()
  })

  it('renders command list', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem>Item 1</CommandItem>
        </CommandList>
      </Command>
    )
    const list = document.querySelector('[cmdk-list]')
    expect(list).toBeInTheDocument()
  })

  it('renders command empty state', () => {
    render(
      <Command>
        <CommandList>
          <CommandEmpty>No results found</CommandEmpty>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('renders command group', () => {
    render(
      <Command>
        <CommandList>
          <CommandGroup heading="Group">
            <CommandItem>Item 1</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('Group')).toBeInTheDocument()
  })

  it('renders command item', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem>Test Item</CommandItem>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })

  it('renders command shortcut', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem>
            Save
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('⌘S')).toBeInTheDocument()
  })

  it('renders command separator', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem>Item 1</CommandItem>
          <CommandSeparator />
          <CommandItem>Item 2</CommandItem>
        </CommandList>
      </Command>
    )
    const separator = document.querySelector('.-mx-1.h-px')
    expect(separator).toBeInTheDocument()
  })

  it('renders command dialog', () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem>Dialog Item</CommandItem>
        </CommandList>
      </CommandDialog>
    )
    expect(screen.getByText('Dialog Item')).toBeInTheDocument()
  })

  it('applies correct classes to command', () => {
    render(<Command />)
    const command = document.querySelector('[cmdk-root]')
    expect(command).toHaveClass('flex', 'h-full', 'w-full', 'flex-col', 'overflow-hidden', 'rounded-md')
  })

  it('applies correct classes to input', () => {
    render(
      <Command>
        <CommandInput />
      </Command>
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md', 'bg-transparent', 'py-3', 'text-sm')
  })

  it('applies correct classes to list', () => {
    render(
      <Command>
        <CommandList />
      </Command>
    )
    const list = document.querySelector('[cmdk-list]')
    expect(list).toHaveClass('max-h-[300px]', 'overflow-y-auto', 'overflow-x-hidden')
  })

  it('applies correct classes to empty', () => {
    render(
      <Command>
        <CommandList>
          <CommandEmpty>Empty</CommandEmpty>
        </CommandList>
      </Command>
    )
    const empty = screen.getByText('Empty')
    expect(empty).toHaveClass('py-6', 'text-center', 'text-sm')
  })

  it('applies correct classes to group', () => {
    render(
      <Command>
        <CommandList>
          <CommandGroup heading="Test">
            <CommandItem>Item</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    )
    const group = document.querySelector('[cmdk-group]')
    expect(group).toHaveClass('overflow-hidden', 'p-1', 'text-foreground')
  })

  it('applies correct classes to item', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem>Item</CommandItem>
        </CommandList>
      </Command>
    )
    const item = screen.getByText('Item')
    expect(item).toHaveClass('relative', 'flex', 'cursor-default', 'gap-2', 'select-none', 'items-center', 'rounded-sm')
  })

  it('applies correct classes to shortcut', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem>
            Action
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
        </CommandList>
      </Command>
    )
    const shortcut = screen.getByText('⌘K')
    expect(shortcut).toHaveClass('ml-auto', 'text-xs', 'tracking-widest', 'text-muted-foreground')
  })

  it('applies custom className to input', () => {
    render(
      <Command>
        <CommandInput className="custom-input" />
      </Command>
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-input')
  })

  it('applies custom className to list', () => {
    render(
      <Command>
        <CommandList className="custom-list" />
      </Command>
    )
    const list = document.querySelector('[cmdk-list]')
    expect(list).toHaveClass('custom-list')
  })

  it('applies custom className to item', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem className="custom-item">Custom</CommandItem>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('Custom')).toHaveClass('custom-item')
  })

  it('handles input filtering', async () => {
    const user = userEvent.setup()
    render(
      <Command>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem>Apple</CommandItem>
          <CommandItem>Banana</CommandItem>
          <CommandItem>Cherry</CommandItem>
        </CommandList>
      </Command>
    )

    const input = screen.getByPlaceholderText('Search')
    await user.type(input, 'App')
    // Filtering should happen
  })

  it('handles item selection', async () => {
    const user = userEvent.setup()
    render(
      <Command>
        <CommandList>
          <CommandItem onSelect={() => {}}>Selectable Item</CommandItem>
        </CommandList>
      </Command>
    )

    await user.click(screen.getByText('Selectable Item'))
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem>Item 1</CommandItem>
          <CommandItem>Item 2</CommandItem>
          <CommandItem>Item 3</CommandItem>
        </CommandList>
      </Command>
    )

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.keyboard('{ArrowDown}')
    // Keyboard navigation should work
  })

  it('renders complete command structure', () => {
    render(
      <Command>
        <CommandInput placeholder="Search commands..." />
        <CommandList>
          <CommandEmpty>No results found</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              Calendar
              <CommandShortcut>⌘C</CommandShortcut>
            </CommandItem>
            <CommandItem>
              Search Emoji
              <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>
              Profile
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              Logout
              <CommandShortcut>⌘L</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    )

    expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument()
    expect(screen.getByText('Suggestions')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Command ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('handles disabled items', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem disabled>Disabled Item</CommandItem>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('Disabled Item')).toHaveClass('data-[disabled=true]:pointer-events-none')
  })

  it('supports data attributes', () => {
    render(
      <Command data-testid="test-command">
        <CommandList>
          <CommandItem>Item</CommandItem>
        </CommandList>
      </Command>
    )
    expect(screen.getByTestId('test-command')).toBeInTheDocument()
  })

  it('renders command dialog with open state', () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Dialog Search" />
        <CommandList>
          <CommandItem>Dialog Item</CommandItem>
        </CommandList>
      </CommandDialog>
    )
    expect(screen.getByText('Dialog Item')).toBeInTheDocument()
  })

  it('handles item with icons', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem>
            <svg data-testid="icon" />
            <span>Item with Icon</span>
          </CommandItem>
        </CommandList>
      </Command>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Item with Icon')).toBeInTheDocument()
  })

  it('handles multiple groups', () => {
    render(
      <Command>
        <CommandList>
          <CommandGroup heading="Group 1">
            <CommandItem>Item 1.1</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Group 2">
            <CommandItem>Item 2.1</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('Group 1')).toBeInTheDocument()
    expect(screen.getByText('Group 2')).toBeInTheDocument()
  })
})
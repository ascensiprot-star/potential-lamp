import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
} from './dropdown-menu'

describe('DropdownMenu Component', () => {
  it('renders dropdown trigger', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Open Menu')).toBeInTheDocument()
  })

  it('opens dropdown when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Menu Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Menu Item')).toBeInTheDocument()
    })
  })

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument()
    })

    await user.click(document.body)
    
    await waitFor(() => {
      expect(screen.queryByText('Item')).not.toBeInTheDocument()
    })
  })

  it('renders dropdown menu item', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem>Test Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })

  it('renders dropdown checkbox item', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>Checkbox Item</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Checkbox Item')).toBeInTheDocument()
  })

  it('renders dropdown radio item', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuRadioItem value="radio1">Radio Item</DropdownMenuRadioItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Radio Item')).toBeInTheDocument()
  })

  it('renders dropdown label', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuLabel>Menu Label</DropdownMenuLabel>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Menu Label')).toBeInTheDocument()
  })

  it('renders dropdown separator', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Item 2</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    const separator = document.querySelector('.-mx-1.my-1.h-px')
    expect(separator).toBeInTheDocument()
  })

  it('renders dropdown shortcut', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Save
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('⌘S')).toBeInTheDocument()
  })

  it('renders dropdown group', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem>Group Item 1</DropdownMenuItem>
            <DropdownMenuItem>Group Item 2</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Group Item 1')).toBeInTheDocument()
    expect(screen.getByText('Group Item 2')).toBeInTheDocument()
  })

  it('renders dropdown submenu', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Submenu Trigger</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub Item 1</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Submenu Trigger')).toBeInTheDocument()
  })

  it('renders dropdown radio group', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="option1">
            <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
  })

  it('applies custom className to content', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent className="custom-content">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    const content = screen.getByText('Item').parentElement
    expect(content).toHaveClass('custom-content')
  })

  it('applies custom className to items', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem className="custom-item">Custom Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Custom Item')).toHaveClass('custom-item')
  })

  it('handles item click', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleClick}>Clickable Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Clickable Item')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Clickable Item'))
    expect(handleClick).toHaveBeenCalled()
  })

  it('handles checkbox item toggle', async () => {
    const user = userEvent.setup()
    const handleCheck = vi.fn()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem onCheckedChange={handleCheck}>Checkbox</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Checkbox')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Checkbox'))
  })

  it('applies inset styling to items', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem inset>Inset Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Inset Item')).toHaveClass('pl-8')
  })

  it('applies inset styling to labels', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Inset Label')).toHaveClass('pl-8')
  })

  it('handles disabled items', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Disabled Item')).toHaveClass('data-[disabled]:pointer-events-none')
  })

  it('has correct base classes for content', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    const content = screen.getByText('Item').parentElement
    expect(content).toHaveClass(
      'z-50',
      'min-w-[8rem]',
      'overflow-hidden',
      'rounded-md',
      'border',
      'bg-popover',
      'p-1'
    )
  })

  it('has correct base classes for items', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem>Base Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Base Item')).toHaveClass(
      'relative',
      'flex',
      'cursor-default',
      'select-none',
      'items-center',
      'gap-2',
      'rounded-sm',
      'px-2',
      'py-1.5'
    )
  })

  it('renders complete dropdown structure', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuLabel>File</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            New
            <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Open
            <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Auto Save</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Export</DropdownMenuItem>
            <DropdownMenuItem>Import</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    expect(screen.getByText('File')).toBeInTheDocument()
    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Auto Save')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByText('Import')).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(
      <DropdownMenu open>
        <DropdownMenuContent ref={ref}>
          <DropdownMenuItem>Ref Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('closes on escape key', async () => {
    const user = userEvent.setup()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')
    
    await waitFor(() => {
      expect(screen.queryByText('Item')).not.toBeInTheDocument()
    })
  })

  it('supports controlled open state', () => {
    const { rerender } = render(
      <DropdownMenu open={false}>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.queryByText('Item')).not.toBeInTheDocument()

    rerender(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Item')).toBeInTheDocument()
  })

  it('renders submenu with chevron icon', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Submenu</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub Item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    // ChevronRight should be rendered
    const chevron = document.querySelector('.ml-auto')
    expect(chevron).toBeInTheDocument()
  })

  it('handles complex nested menu structure', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuLabel>Main Menu</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Submenu</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item 1</DropdownMenuItem>
                <DropdownMenuItem>Sub Item 2</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText('Main Menu')).toBeInTheDocument()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Submenu')).toBeInTheDocument()
  })
})
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from './dialog'

describe('Dialog Component', () => {
  it('renders dialog trigger button', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>Dialog Content</DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Open Dialog')).toBeInTheDocument()
  })

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <p>Content</p>
        </DialogContent>
      </Dialog>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument()
    })
  })

  it('closes dialog when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <p>Content</p>
        </DialogContent>
      </Dialog>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument()
    })

    const closeButton = screen.getByLabelText('Close') || screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Title')).not.toBeInTheDocument()
    })
  })

  it('renders dialog with custom className', () => {
    render(
      <Dialog open>
        <DialogContent className="custom-dialog">Content</DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Content').parentElement).toHaveClass('custom-dialog')
  })

  it('renders dialog header with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Header Title</DialogTitle>
            <DialogDescription>Header Description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    
    const header = screen.getByText('Header Title').parentElement
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5')
  })

  it('renders dialog footer with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <button>Cancel</button>
            <button>Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    
    const footer = screen.getByText('Cancel').parentElement
    expect(footer).toHaveClass('flex', 'flex-col-reverse')
  })

  it('renders dialog title with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    
    expect(screen.getByText('Test Title')).toHaveClass('text-lg', 'font-semibold')
  })

  it('renders dialog description with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogDescription>Test Description</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    
    expect(screen.getByText('Test Description')).toHaveClass('text-sm', 'text-muted-foreground')
  })

  it('handles controlled open state', () => {
    const { rerender } = render(
      <Dialog open={false}>
        <DialogContent>Content</DialogContent>
      </Dialog>
    )
    
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
    
    rerender(
      <Dialog open>
        <DialogContent>Content</DialogContent>
      </Dialog>
    )
    
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders dialog overlay', () => {
    render(
      <Dialog open>
        <DialogContent>Content</DialogContent>
      </Dialog>
    )
    
    const overlay = document.querySelector('[data-state="open"]') || document.querySelector('.fixed.inset-0')
    expect(overlay).toBeInTheDocument()
  })

  it('supports dialog close component', async () => {
    const user = userEvent.setup()
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <p>Content</p>
          <DialogClose asChild>
            <button>Custom Close</button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )

    await user.click(screen.getByText('Custom Close'))
    
    await waitFor(() => {
      expect(screen.queryByText('Title')).not.toBeInTheDocument()
    })
  })

  it('renders complete dialog structure', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Dialog</DialogTitle>
            <DialogDescription>This is a complete dialog</DialogDescription>
          </DialogHeader>
          <p>Main content goes here</p>
          <DialogFooter>
            <DialogClose asChild>
              <button>Cancel</button>
            </DialogClose>
            <button>Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Complete Dialog')).toBeInTheDocument()
    expect(screen.getByText('This is a complete dialog')).toBeInTheDocument()
    expect(screen.getByText('Main content goes here')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('applies animation classes on open', () => {
    render(
      <Dialog open>
        <DialogContent>Animated Content</DialogContent>
      </Dialog>
    )
    
    const content = screen.getByText('Animated Content').parentElement
    expect(content).toHaveClass('data-[state=open]:animate-in')
  })

  it('supports multiple dialogs', () => {
    render(
      <>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Dialog 1</DialogTitle>
          </DialogContent>
        </Dialog>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Dialog 2</DialogTitle>
          </DialogContent>
        </Dialog>
      </>
    )
    
    expect(screen.getByText('Dialog 1')).toBeInTheDocument()
    expect(screen.getByText('Dialog 2')).toBeInTheDocument()
  })

  it('handles keyboard escape to close', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    await user.click(screen.getByText('Open'))
    
    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')
    
    await waitFor(() => {
      expect(screen.queryByText('Title')).not.toBeInTheDocument()
    })
  })
})
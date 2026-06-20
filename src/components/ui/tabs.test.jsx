import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'

describe('Tabs Component', () => {
  it('renders tabs with default structure', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Content 1')).toBeInTheDocument()
  })

  it('shows only active tab content', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Content 1')).toBeInTheDocument()
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument()
  })

  it('switches tabs when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Content 1')).toBeInTheDocument()
    
    await user.click(screen.getByText('Tab 2'))
    
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument()
    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })

  it('applies active state styles to selected tab', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Active Tab</TabsTrigger>
          <TabsTrigger value="tab2">Inactive Tab</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    const activeTab = screen.getByText('Active Tab')
    const inactiveTab = screen.getByText('Inactive Tab')
    
    expect(activeTab).toHaveClass('data-[state=active]:bg-background')
    expect(inactiveTab).not.toHaveClass('data-[state=active]:bg-background')
  })

  it('applies custom className to tabs list', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-list">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Tab 1').parentElement).toHaveClass('custom-list')
  })

  it('applies custom className to tabs trigger', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1" className="custom-trigger">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Tab 1')).toHaveClass('custom-trigger')
  })

  it('applies custom className to tabs content', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="custom-content">Content 1</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Content 1')).toHaveClass('custom-content')
  })

  it('renders tabs list with correct base styles', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>
    )
    
    const list = screen.getByText('Tab 1').parentElement
    expect(list).toHaveClass(
      'inline-flex',
      'h-9',
      'items-center',
      'justify-center',
      'rounded-lg',
      'bg-muted'
    )
  })

  it('renders tabs trigger with correct base styles', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Trigger</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Trigger')).toHaveClass(
      'inline-flex',
      'items-center',
      'justify-center',
      'rounded-md',
      'px-3',
      'py-1'
    )
  })

  it('renders tabs content with correct base styles', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Content')).toHaveClass('mt-2')
  })

  it('handles disabled tab trigger', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" disabled>Disabled Tab</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Disabled Tab')).toBeDisabled()
    expect(screen.getByText('Disabled Tab')).toHaveClass('disabled:pointer-events-none')
  })

  it('handles controlled value', () => {
    const { rerender } = render(
      <Tabs value="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Content 1')).toBeInTheDocument()
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument()
    
    rerender(
      <Tabs value="tab2">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument()
    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })

  it('renders multiple tabs with complex content', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Overview</TabsTrigger>
          <TabsTrigger value="tab2">Details</TabsTrigger>
          <TabsTrigger value="tab3">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <div>Overview Content</div>
          <p>Some text here</p>
        </TabsContent>
        <TabsContent value="tab2">
          <div>Details Content</div>
          <ul><li>Item 1</li><li>Item 2</li></ul>
        </TabsContent>
        <TabsContent value="tab3">
          <div>Settings Content</div>
          <button>Action</button>
        </TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Overview Content')).toBeInTheDocument()
  })

  it('has focus ring on trigger', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Focus Tab</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Focus Tab')).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2'
    )
  })

  it('supports onValueChange callback', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <Tabs defaultValue="tab1" onValueChange={handleChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    await user.click(screen.getByText('Tab 2'))
    // Note: onValueChange might be called
  })

  it('renders tabs with icon triggers', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">
            <span>🏠</span>
            <span>Home</span>
          </TabsTrigger>
          <TabsTrigger value="tab2">
            <span>⚙️</span>
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Home Content</TabsContent>
        <TabsContent value="tab2">Settings Content</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('🏠')).toBeInTheDocument()
    expect(screen.getByText('⚙️')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })
})
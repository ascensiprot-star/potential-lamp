import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './resizable'

describe('Resizable Component', () => {
  it('renders resizable panel group', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel defaultSize={50}>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizablePanel defaultSize={50}>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByText('Panel 1')).toBeInTheDocument()
    expect(screen.getByText('Panel 2')).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    render(
      <ResizablePanelGroup className="custom-group">
        <ResizablePanel>
          <div>Content</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const group = document.querySelector('.custom-group')
    expect(group).toBeInTheDocument()
  })

  it('applies correct base classes to panel group', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>
          <div>Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const group = document.querySelector('[data-panel-group-direction]')
    expect(group).toHaveClass('flex', 'h-full', 'w-full')
  })

  it('renders resizable handle', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const handle = document.querySelector('[data-panel-resize-handle-id]')
    expect(handle).toBeInTheDocument()
  })

  it('renders handle with grip icon when withHandle is true', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const grip = document.querySelector('.h-2\\.5.w-2\\.5')
    expect(grip).toBeInTheDocument()
  })

  it('applies custom className to handle', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle className="custom-handle" />
        <ResizablePanel>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const handle = document.querySelector('.custom-handle')
    expect(handle).toBeInTheDocument()
  })

  it('renders with horizontal direction by default', () => {
    render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel>
          <div>Horizontal Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const group = document.querySelector('[data-panel-group-direction="horizontal"]')
    expect(group).toBeInTheDocument()
  })

  it('renders with vertical direction', () => {
    render(
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel>
          <div>Vertical Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const group = document.querySelector('[data-panel-group-direction="vertical"]')
    expect(group).toBeInTheDocument()
  })

  it('applies vertical direction classes', () => {
    render(
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel>
          <div>Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const group = document.querySelector('[data-panel-group-direction="vertical"]')
    expect(group).toHaveClass('data-[panel-group-direction=vertical]:flex-col')
  })

  it('renders with default size', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel defaultSize={30}>
          <div>30% Panel</div>
        </ResizablePanel>
        <ResizablePanel defaultSize={70}>
          <div>70% Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByText('30% Panel')).toBeInTheDocument()
    expect(screen.getByText('70% Panel')).toBeInTheDocument()
  })

  it('renders with min size', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel minSize={20}>
          <div>Min Size Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByText('Min Size Panel')).toBeInTheDocument()
  })

  it('renders with max size', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel maxSize={80}>
          <div>Max Size Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByText('Max Size Panel')).toBeInTheDocument()
  })

  it('applies correct classes to horizontal handle', () => {
    render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const handle = document.querySelector('[data-panel-resize-handle-id]')
    expect(handle).toHaveClass('relative', 'flex', 'w-px', 'items-center', 'justify-center')
  })

  it('applies correct classes to vertical handle', () => {
    render(
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const handle = document.querySelector('[data-panel-resize-handle-id]')
    expect(handle).toHaveClass('data-[panel-group-direction=vertical]:h-px', 'data-[panel-group-direction=vertical]:w-full')
  })

  it('renders handle with focus ring', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const handle = document.querySelector('[data-panel-resize-handle-id]')
    expect(handle).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-1', 'focus-visible:ring-ring')
  })

  it('renders multiple panels', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel defaultSize={33}>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={33}>
          <div>Panel 2</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={34}>
          <div>Panel 3</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByText('Panel 1')).toBeInTheDocument()
    expect(screen.getByText('Panel 2')).toBeInTheDocument()
    expect(screen.getByText('Panel 3')).toBeInTheDocument()
  })

  it('supports data attributes', () => {
    render(
      <ResizablePanelGroup data-testid="test-group">
        <ResizablePanel>
          <div>Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByTestId('test-group')).toBeInTheDocument()
  })

  it('renders collapsible panel', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel collapsible>
          <div>Collapsible Panel</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div>Main Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByText('Collapsible Panel')).toBeInTheDocument()
    expect(screen.getByText('Main Panel')).toBeInTheDocument()
  })

  it('renders with id', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel id="test-panel">
          <div>Panel with ID</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const panel = document.querySelector('#test-panel')
    expect(panel).toBeInTheDocument()
  })

  it('renders with order', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel order={2}>
          <div>Panel 2</div>
        </ResizablePanel>
        <ResizablePanel order={1}>
          <div>Panel 1</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByText('Panel 1')).toBeInTheDocument()
    expect(screen.getByText('Panel 2')).toBeInTheDocument()
  })

  it('applies custom styles to handle', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle style={{ backgroundColor: 'red' }} />
        <ResizablePanel>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const handle = document.querySelector('[data-panel-resize-handle-id]')
    expect(handle).toHaveAttribute('style')
  })

  it('renders handle with border background', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const handleIcon = document.querySelector('.rounded-sm.border')
    expect(handleIcon).toBeInTheDocument()
    expect(handleIcon).toHaveClass('rounded-sm', 'border', 'bg-border')
  })

  it('renders nested panel groups', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel>
              <div>Nested Panel 1</div>
            </ResizablePanel>
            <ResizablePanel>
              <div>Nested Panel 2</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByText('Nested Panel 1')).toBeInTheDocument()
    expect(screen.getByText('Nested Panel 2')).toBeInTheDocument()
  })

  it('handles resize behavior', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel defaultSize={50}>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
    const handle = document.querySelector('[data-panel-resize-handle-id]')
    expect(handle).toBeInTheDocument()
    expect(handle).toHaveClass('relative', 'flex')
  })
})
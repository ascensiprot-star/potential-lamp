import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card'

describe('Card Component', () => {
  it('renders card with default styling', () => {
    render(<Card>Card content</Card>)
    const card = screen.getByText('Card content')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('rounded-xl', 'border', 'bg-card', 'shadow')
  })

  it('renders card with custom className', () => {
    render(<Card className="custom-card">Custom card</Card>)
    expect(screen.getByText('Custom card')).toHaveClass('custom-card')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Card ref={ref}>Ref card</Card>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('renders card children correctly', () => {
    render(
      <Card>
        <span>Child 1</span>
        <span>Child 2</span>
      </Card>
    )
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
  })
})

describe('CardHeader Component', () => {
  it('renders header with default styling', () => {
    render(<CardHeader>Header content</CardHeader>)
    const header = screen.getByText('Header content')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
  })

  it('renders header with custom className', () => {
    render(<CardHeader className="custom-header">Custom header</CardHeader>)
    expect(screen.getByText('Custom header')).toHaveClass('custom-header')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<CardHeader ref={ref}>Header ref</CardHeader>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe('CardTitle Component', () => {
  it('renders title with default styling', () => {
    render(<CardTitle>Card Title</CardTitle>)
    const title = screen.getByText('Card Title')
    expect(title).toBeInTheDocument()
    expect(title).toHaveClass('font-semibold', 'leading-none', 'tracking-tight')
  })

  it('renders title with custom className', () => {
    render(<CardTitle className="custom-title">Custom Title</CardTitle>)
    expect(screen.getByText('Custom Title')).toHaveClass('custom-title')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<CardTitle ref={ref}>Title ref</CardTitle>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe('CardDescription Component', () => {
  it('renders description with default styling', () => {
    render(<CardDescription>Card description</CardDescription>)
    const description = screen.getByText('Card description')
    expect(description).toBeInTheDocument()
    expect(description).toHaveClass('text-sm', 'text-muted-foreground')
  })

  it('renders description with custom className', () => {
    render(<CardDescription className="custom-description">Custom description</CardDescription>)
    expect(screen.getByText('Custom description')).toHaveClass('custom-description')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<CardDescription ref={ref}>Description ref</CardDescription>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe('CardContent Component', () => {
  it('renders content with default styling', () => {
    render(<CardContent>Content</CardContent>)
    const content = screen.getByText('Content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveClass('p-6', 'pt-0')
  })

  it('renders content with custom className', () => {
    render(<CardContent className="custom-content">Custom content</CardContent>)
    expect(screen.getByText('Custom content')).toHaveClass('custom-content')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<CardContent ref={ref}>Content ref</CardContent>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe('CardFooter Component', () => {
  it('renders footer with default styling', () => {
    render(<CardFooter>Footer content</CardFooter>)
    const footer = screen.getByText('Footer content')
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
  })

  it('renders footer with custom className', () => {
    render(<CardFooter className="custom-footer">Custom footer</CardFooter>)
    expect(screen.getByText('Custom footer')).toHaveClass('custom-footer')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<CardFooter ref={ref}>Footer ref</CardFooter>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe('Card Integration', () => {
  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>Test description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Card content goes here')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('maintains component hierarchy', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    )

    const card = container.querySelector('.rounded-xl')
    const header = container.querySelector('.flex.flex-col')
    const content = container.querySelector('.p-6.pt-0')
    
    expect(card).toBeInTheDocument()
    expect(header).toBeInTheDocument()
    expect(content).toBeInTheDocument()
  })

  it('supports nested content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Nested Test</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <span>Nested</span>
            <span>Content</span>
          </div>
        </CardContent>
      </Card>
    )

    expect(screen.getByText('Nested')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('handles long content in description', () => {
    const longText = 'This is a very long description that should wrap properly within the card description component'
    render(
      <Card>
        <CardHeader>
          <CardDescription>{longText}</CardDescription>
        </CardHeader>
      </Card>
    )
    expect(screen.getByText(longText)).toBeInTheDocument()
  })
})
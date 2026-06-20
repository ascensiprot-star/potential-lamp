import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from './alert'

describe('Alert Component', () => {
  it('renders alert with default variant', () => {
    render(<Alert>Default Alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Default Alert')
  })

  it('renders with destructive variant', () => {
    render(<Alert variant="destructive">Destructive Alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('border-destructive/50', 'text-destructive')
  })

  it('renders alert title', () => {
    render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>Alert Description</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Alert Title')).toBeInTheDocument()
    expect(screen.getByText('Alert Description')).toBeInTheDocument()
  })

  it('renders alert description', () => {
    render(
      <Alert>
        <AlertDescription>Description text</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Description text')).toBeInTheDocument()
  })

  it('applies custom className to alert', () => {
    render(<Alert className="custom-alert">Custom</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('custom-alert')
  })

  it('applies custom className to title', () => {
    render(
      <Alert>
        <AlertTitle className="custom-title">Title</AlertTitle>
      </Alert>
    )
    expect(screen.getByText('Title')).toHaveClass('custom-title')
  })

  it('applies custom className to description', () => {
    render(
      <Alert>
        <AlertDescription className="custom-description">Description</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Description')).toHaveClass('custom-description')
  })

  it('applies correct base classes to alert', () => {
    render(<Alert>Base Classes</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass(
      'relative',
      'w-full',
      'rounded-lg',
      'border',
      'px-4',
      'py-3',
      'text-sm'
    )
  })

  it('applies correct classes to title', () => {
    render(
      <Alert>
        <AlertTitle>Title Classes</AlertTitle>
      </Alert>
    )
    expect(screen.getByText('Title Classes')).toHaveClass(
      'mb-1',
      'font-medium',
      'leading-none',
      'tracking-tight'
    )
  })

  it('applies correct classes to description', () => {
    render(
      <Alert>
        <AlertDescription>Description Classes</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Description Classes')).toHaveClass('text-sm')
  })

  it('renders with icon', () => {
    render(
      <Alert>
        <svg data-testid="alert-icon" />
        <div>Alert with icon</div>
      </Alert>
    )
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    expect(screen.getByText('Alert with icon')).toBeInTheDocument()
  })

  it('positions icon correctly', () => {
    render(
      <Alert>
        <svg data-testid="icon" />
        <div>Content</div>
      </Alert>
    )
    const icon = screen.getByTestId('icon')
    expect(icon).toHaveClass('absolute', 'left-4', 'top-4')
  })

  it('adds padding when icon is present', () => {
    render(
      <Alert>
        <svg data-testid="icon" />
        <div>Content</div>
      </Alert>
    )
    const content = screen.getByText('Content').parentElement
    expect(content).toHaveClass('pl-7')
  })

  it('has correct ARIA role', () => {
    render(<Alert>ARIA Alert</Alert>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('forwards ref correctly for alert', () => {
    const ref = { current: null }
    render(<Alert ref={ref}>Ref Alert</Alert>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('forwards ref correctly for title', () => {
    const ref = { current: null }
    render(
      <Alert>
        <AlertTitle ref={ref}>Ref Title</AlertTitle>
      </Alert>
    )
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
  })

  it('forwards ref correctly for description', () => {
    const ref = { current: null }
    render(
      <Alert>
        <AlertDescription ref={ref}>Ref Description</AlertDescription>
      </Alert>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('renders complete alert structure', () => {
    render(
      <Alert variant="destructive">
        <svg data-testid="error-icon" />
        <div>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Something went wrong. Please try again later.
          </AlertDescription>
        </div>
      </Alert>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong. Please try again later.')).toBeInTheDocument()
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
  })

  it('handles long content in description', () => {
    const longText = 'This is a very long description that should wrap properly within the alert component and maintain readability'
    render(
      <Alert>
        <AlertDescription>{longText}</AlertDescription>
      </Alert>
    )
    expect(screen.getByText(longText)).toBeInTheDocument()
  })

  it('renders with multiple paragraphs in description', () => {
    render(
      <Alert>
        <AlertDescription>
          <p>First paragraph</p>
          <p>Second paragraph</p>
        </AlertDescription>
      </Alert>
    )
    expect(screen.getByText('First paragraph')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph')).toBeInTheDocument()
  })

  it('applies dark mode specific classes for destructive variant', () => {
    render(<Alert variant="destructive">Dark Mode</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('dark:border-destructive')
  })

  it('handles icon color in destructive variant', () => {
    render(
      <Alert variant="destructive">
        <svg data-testid="destructive-icon" />
        <div>Destructive Content</div>
      </Alert>
    )
    const icon = screen.getByTestId('destructive-icon')
    expect(icon).toHaveClass('text-destructive')
  })

  it('supports data attributes', () => {
    render(<Alert data-testid="test-alert">Data Alert</Alert>)
    expect(screen.getByTestId('test-alert')).toBeInTheDocument()
  })

  it('renders without title', () => {
    render(
      <Alert>
        <AlertDescription>Only description</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Only description')).toBeInTheDocument()
  })

  it('renders without description', () => {
    render(
      <Alert>
        <AlertTitle>Only title</AlertTitle>
      </Alert>
    )
    expect(screen.getByText('Only title')).toBeInTheDocument()
  })

  it('renders with inline content', () => {
    render(<Alert>Simple inline alert message</Alert>)
    expect(screen.getByText('Simple inline alert message')).toBeInTheDocument()
  })

  it('handles HTML entities in content', () => {
    render(
      <Alert>
        <AlertDescription>Special & characters &lt;test&gt;</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Special & characters <test>')).toBeInTheDocument()
  })
})
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Label } from './label'

describe('Label Component', () => {
  it('renders label with default props', () => {
    render(<Label>Test Label</Label>)
    const label = screen.getByText('Test Label')
    expect(label).toBeInTheDocument()
    expect(label.tagName).toBe('LABEL')
  })

  it('renders with custom className', () => {
    render(<Label className="custom-label">Custom</Label>)
    expect(screen.getByText('Custom')).toHaveClass('custom-label')
  })

  it('applies correct base classes', () => {
    render(<Label>Base Classes</Label>)
    const label = screen.getByText('Base Classes')
    expect(label).toHaveClass(
      'text-sm',
      'font-medium',
      'leading-none',
      'peer-disabled:cursor-not-allowed',
      'peer-disabled:opacity-70'
    )
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Label ref={ref}>Ref Label</Label>)
    expect(ref.current).toBeInstanceOf(HTMLLabelElement)
  })

  it('associates with input via htmlFor', () => {
    render(
      <>
        <Label htmlFor="test-input">Test Input</Label>
        <input id="test-input" />
      </>
    )
    const label = screen.getByText('Test Input')
    expect(label).toHaveAttribute('for', 'test-input')
  })

  it('associates with input via nested control', () => {
    render(
      <Label>
        Nested Input
        <input />
      </Label>
    )
    expect(screen.getByText('Nested Input')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Label onClick={handleClick}>Clickable Label</Label>)
    
    await user.click(screen.getByText('Clickable Label'))
    expect(handleClick).toHaveBeenCalled()
  })

  it('focuses associated input when clicked', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Label htmlFor="focus-input">Focus Label</Label>
        <input id="focus-input" />
      </>
    )
    
    await user.click(screen.getByText('Focus Label'))
    const input = screen.getByRole('textbox')
    expect(input).toHaveFocus()
  })

  it('renders with htmlFor attribute', () => {
    render(<Label htmlFor="username">Username</Label>)
    expect(screen.getByText('Username')).toHaveAttribute('for', 'username')
  })

  it('renders with id attribute', () => {
    render(<Label id="label-id">Label with ID</Label>)
    expect(screen.getByText('Label with ID')).toHaveAttribute('id', 'label-id')
  })

  it('supports data attributes', () => {
    render(<Label data-testid="test-label">Data Label</Label>)
    expect(screen.getByTestId('test-label')).toBeInTheDocument()
  })

  it('renders with aria attributes', () => {
    render(<Label aria-label="Screen reader label">Visual Label</Label>)
    expect(screen.getByText('Visual Label')).toHaveAttribute('aria-label', 'Screen reader label')
  })

  it('handles disabled peer styling', () => {
    render(
      <div className="peer">
        <input disabled />
        <Label>Disabled Peer Label</Label>
      </div>
    )
    expect(screen.getByText('Disabled Peer Label')).toHaveClass('peer-disabled:cursor-not-allowed')
  })

  it('renders long text content', () => {
    const longText = 'This is a very long label text that should wrap properly and maintain readability while still being styled correctly'
    render(<Label>{longText}</Label>)
    expect(screen.getByText(longText)).toBeInTheDocument()
  })

  it('renders with special characters', () => {
    render(<Label>Label & Special * Characters</Label>)
    expect(screen.getByText('Label & Special * Characters')).toBeInTheDocument()
  })

  it('renders with HTML content', () => {
    render(<Label><span>Bold</span> Label</Label>)
    expect(screen.getByText('Bold')).toBeInTheDocument()
    expect(screen.getByText('Label')).toBeInTheDocument()
  })

  it('handles form field association', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" type="email" />
      </>
    )
    
    expect(screen.getByText('Email')).toHaveAttribute('for', 'email')
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'email')
  })

  it('renders with icon content', () => {
    render(
      <Label>
        <span>★</span>
        <span>Star Label</span>
      </Label>
    )
    expect(screen.getByText('★')).toBeInTheDocument()
    expect(screen.getByText('Star Label')).toBeInTheDocument()
  })

  it('has correct font weight', () => {
    render(<Label>Font Weight</Label>)
    expect(screen.getByText('Font Weight')).toHaveClass('font-medium')
  })

  it('has correct font size', () => {
    render(<Label>Font Size</Label>)
    expect(screen.getByText('Font Size')).toHaveClass('text-sm')
  })

  it('has correct line height', () => {
    render(<Label>Line Height</Label>)
    expect(screen.getByText('Line Height')).toHaveClass('leading-none')
  })

  it('renders with description text', () => {
    render(
      <div>
        <Label>Description Label</Label>
        <p className="text-sm text-muted-foreground">Additional information</p>
      </div>
    )
    expect(screen.getByText('Description Label')).toBeInTheDocument()
    expect(screen.getByText('Additional information')).toBeInTheDocument()
  })

  it('supports required field indication', () => {
    render(
      <Label>
        Required Field
        <span className="text-destructive">*</span>
      </Label>
    )
    expect(screen.getByText('Required Field')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('handles multiple labels for different inputs', () => {
    render(
      <>
        <Label htmlFor="field1">Field 1</Label>
        <input id="field1" />
        <Label htmlFor="field2">Field 2</Label>
        <input id="field2" />
      </>
    )
    
    expect(screen.getByText('Field 1')).toHaveAttribute('for', 'field1')
    expect(screen.getByText('Field 2')).toHaveAttribute('for', 'field2')
  })
})
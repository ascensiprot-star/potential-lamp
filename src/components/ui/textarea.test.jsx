import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from './textarea'

describe('Textarea Component', () => {
  it('renders textarea with default props', () => {
    render(<Textarea placeholder="Enter text" />)
    const textarea = screen.getByPlaceholderText('Enter text')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveClass('flex', 'min-h-[60px]', 'w-full')
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<Textarea placeholder="Type here" />)
    const textarea = screen.getByPlaceholderText('Type here')
    
    await user.type(textarea, 'Hello World\nSecond line')
    expect(textarea).toHaveValue('Hello World\nSecond line')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Textarea disabled placeholder="Disabled" />)
    const textarea = screen.getByPlaceholderText('Disabled')
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('applies custom className', () => {
    render(<Textarea className="custom-textarea" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-textarea')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Textarea ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('renders with value prop', () => {
    render(<Textarea value="Initial value" />)
    expect(screen.getByRole('textbox')).toHaveValue('Initial value')
  })

  it('renders with name attribute', () => {
    render(<Textarea name="description" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'description')
  })

  it('renders with id attribute', () => {
    render(<Textarea id="test-textarea" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'test-textarea')
  })

  it('handles focus events', async () => {
    const user = userEvent.setup()
    const handleFocus = vi.fn()
    render(<Textarea onFocus={handleFocus} />)
    
    await user.click(screen.getByRole('textbox'))
    expect(handleFocus).toHaveBeenCalled()
  })

  it('handles blur events', async () => {
    const user = userEvent.setup()
    const handleBlur = vi.fn()
    render(<Textarea onBlur={handleBlur} />)
    
    const textarea = screen.getByRole('textbox')
    await user.click(textarea)
    await user.tab()
    expect(handleBlur).toHaveBeenCalled()
  })

  it('handles change events', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Textarea onChange={handleChange} />)
    
    await user.type(screen.getByRole('textbox'), 'a')
    expect(handleChange).toHaveBeenCalled()
  })

  it('renders with placeholder text', () => {
    render(<Textarea placeholder="Placeholder text" />)
    expect(screen.getByPlaceholderText('Placeholder text')).toBeInTheDocument()
  })

  it('has correct default styling classes', () => {
    render(<Textarea />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveClass(
      'rounded-md',
      'border',
      'border-input',
      'bg-transparent',
      'px-3',
      'py-2'
    )
  })

  it('has minimum height', () => {
    render(<Textarea />)
    expect(screen.getByRole('textbox')).toHaveClass('min-h-[60px]')
  })

  it('renders with rows attribute', () => {
    render(<Textarea rows={5} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5')
  })

  it('renders with cols attribute', () => {
    render(<Textarea cols={40} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('cols', '40')
  })

  it('renders with aria attributes', () => {
    render(<Textarea aria-label="Message input" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Message input')
  })

  it('handles readonly state', () => {
    render(<Textarea readOnly value="Readonly" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
  })

  it('handles required attribute', () => {
    render(<Textarea required />)
    expect(screen.getByRole('textbox')).toBeRequired()
  })

  it('clears textarea value', async () => {
    const user = userEvent.setup()
    render(<Textarea value="Initial" />)
    const textarea = screen.getByRole('textbox')
    
    await user.clear(textarea)
    expect(textarea).toHaveValue('')
  })

  it('handles maxlength attribute', () => {
    render(<Textarea maxLength={100} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '100')
  })

  it('handles multiline content', async () => {
    const user = userEvent.setup()
    render(<Textarea />)
    const textarea = screen.getByRole('textbox')
    
    await user.type(textarea, 'Line 1{Enter}Line 2{Enter}Line 3')
    expect(textarea).toHaveValue('Line 1\nLine 2\nLine 3')
  })

  it('respects controlled value', () => {
    const { rerender } = render(<Textarea value="Initial" />)
    expect(screen.getByRole('textbox')).toHaveValue('Initial')
    
    rerender(<Textarea value="Updated" />)
    expect(screen.getByRole('textbox')).toHaveValue('Updated')
  })

  it('handles resize styling', () => {
    render(<Textarea className="resize-none" />)
    expect(screen.getByRole('textbox')).toHaveClass('resize-none')
  })

  it('supports auto-resize behavior', () => {
    render(<Textarea className="resize-y" />)
    expect(screen.getByRole('textbox')).toHaveClass('resize-y')
  })

  it('renders with spellCheck attribute', () => {
    render(<Textarea spellCheck={false} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('spellcheck', 'false')
  })

  it('handles auto-complete attribute', () => {
    render(<Textarea autoComplete="off" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'off')
  })
})
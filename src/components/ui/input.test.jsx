import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './input'

describe('Input Component', () => {
  it('renders input with default props', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('flex', 'h-9', 'w-full')
  })

  it('renders with different types', () => {
    const { rerender } = render(<Input type="text" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')

    rerender(<Input type="password" />)
    expect(screen.getByLabelText(/password/i) || screen.getByRole('textbox')).toHaveAttribute('type', 'password')

    rerender(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="number" />)
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number')
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Type here" />)
    const input = screen.getByPlaceholderText('Type here')
    
    await user.type(input, 'Hello World')
    expect(input).toHaveValue('Hello World')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled" />)
    const input = screen.getByPlaceholderText('Disabled')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('applies custom className', () => {
    render(<Input className="custom-input" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-input')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('renders with value prop', () => {
    render(<Input value="Initial value" />)
    expect(screen.getByRole('textbox')).toHaveValue('Initial value')
  })

  it('renders with name attribute', () => {
    render(<Input name="username" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username')
  })

  it('renders with id attribute', () => {
    render(<Input id="test-input" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'test-input')
  })

  it('handles focus events', async () => {
    const user = userEvent.setup()
    const handleFocus = vi.fn()
    render(<Input onFocus={handleFocus} />)
    
    await user.click(screen.getByRole('textbox'))
    expect(handleFocus).toHaveBeenCalled()
  })

  it('handles blur events', async () => {
    const user = userEvent.setup()
    const handleBlur = vi.fn()
    render(<Input onBlur={handleBlur} />)
    
    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.tab()
    expect(handleBlur).toHaveBeenCalled()
  })

  it('handles change events', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    
    await user.type(screen.getByRole('textbox'), 'a')
    expect(handleChange).toHaveBeenCalled()
  })

  it('renders with placeholder text', () => {
    render(<Input placeholder="Placeholder text" />)
    expect(screen.getByPlaceholderText('Placeholder text')).toBeInTheDocument()
  })

  it('has correct default styling classes', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass(
      'rounded-md',
      'border',
      'border-input',
      'bg-transparent',
      'px-3',
      'py-1'
    )
  })

  it('supports file input type', () => {
    render(<Input type="file" />)
    const input = screen.getByRole('textbox') || screen.getByLabelText(/file/i)
    expect(input).toHaveAttribute('type', 'file')
  })

  it('renders with aria attributes', () => {
    render(<Input aria-label="Search input" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Search input')
  })

  it('handles readonly state', () => {
    render(<Input readOnly value="Readonly" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
  })

  it('handles required attribute', () => {
    render(<Input required />)
    expect(screen.getByRole('textbox')).toBeRequired()
  })

  it('clears input value', async () => {
    const user = userEvent.setup()
    render(<Input value="Initial" />)
    const input = screen.getByRole('textbox')
    
    await user.clear(input)
    expect(input).toHaveValue('')
  })
})
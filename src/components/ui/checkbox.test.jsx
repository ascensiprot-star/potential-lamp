import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './checkbox'

describe('Checkbox Component', () => {
  it('renders checkbox with default unchecked state', () => {
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toHaveAttribute('data-state', 'unchecked')
  })

  it('toggles when clicked', async () => {
    const user = userEvent.setup()
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    
    expect(checkbox).toHaveAttribute('data-state', 'unchecked')
    
    await user.click(checkbox)
    expect(checkbox).toHaveAttribute('data-state', 'checked')
    
    await user.click(checkbox)
    expect(checkbox).toHaveAttribute('data-state', 'unchecked')
  })

  it('renders with custom className', () => {
    render(<Checkbox className="custom-checkbox" />)
    expect(screen.getByRole('checkbox')).toHaveClass('custom-checkbox')
  })

  it('renders with checked state by default', () => {
    render(<Checkbox defaultChecked />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('data-state', 'checked')
  })

  it('handles controlled checked state', () => {
    const { rerender } = render(<Checkbox checked={false} />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'unchecked')
    
    rerender(<Checkbox checked={true} />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'checked')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Checkbox disabled />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
    expect(checkbox).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('applies correct base classes', () => {
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveClass(
      'peer',
      'h-4',
      'w-4',
      'shrink-0',
      'rounded-sm',
      'border',
      'border-primary',
      'shadow'
    )
  })

  it('applies checked state styles', () => {
    render(<Checkbox defaultChecked />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveClass(
      'data-[state=checked]:bg-primary',
      'data-[state=checked]:text-primary-foreground'
    )
  })

  it('has focus ring', () => {
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-1',
      'focus-visible:ring-ring'
    )
  })

  it('renders check icon when checked', () => {
    render(<Checkbox defaultChecked />)
    const checkbox = screen.getByRole('checkbox')
    const indicator = checkbox.querySelector('[class*="flex items-center"]')
    expect(indicator).toBeInTheDocument()
  })

  it('handles onChange callback', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Checkbox onCheckedChange={handleChange} />)
    
    await user.click(screen.getByRole('checkbox'))
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('handles keyboard interaction', async () => {
    const user = userEvent.setup()
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    
    checkbox.focus()
    await user.keyboard('{Enter}')
    expect(checkbox).toHaveAttribute('data-state', 'checked')
  })

  it('can be controlled with parent state', async () => {
    const user = userEvent.setup()
    const ControlledCheckbox = () => {
      const [checked, setChecked] = React.useState(false)
      return (
        <Checkbox
          checked={checked}
          onCheckedChange={setChecked}
        />
      )
    }
    
    render(<ControlledCheckbox />)
    const checkbox = screen.getByRole('checkbox')
    
    await user.click(checkbox)
    expect(checkbox).toHaveAttribute('data-state', 'checked')
  })

  it('has correct ARIA role', () => {
    render(<Checkbox />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Checkbox ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('renders with label', () => {
    render(
      <label>
        <Checkbox />
        <span>Accept terms</span>
      </label>
    )
    expect(screen.getByText('Accept terms')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('handles rapid clicking', async () => {
    const user = userEvent.setup()
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    
    await user.click(checkbox)
    await user.click(checkbox)
    await user.click(checkbox)
    
    expect(checkbox).toHaveAttribute('data-state', 'checked')
  })

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup()
    render(<Checkbox disabled />)
    const checkbox = screen.getByRole('checkbox')
    
    await user.click(checkbox)
    expect(checkbox).toHaveAttribute('data-state', 'unchecked')
  })

  it('supports indeterminate state', () => {
    render(<Checkbox checked="indeterminate" />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('data-state', 'indeterminate')
  })

  it('supports data attributes', () => {
    render(<Checkbox data-testid="test-checkbox" />)
    expect(screen.getByTestId('test-checkbox')).toBeInTheDocument()
  })

  it('renders with name attribute', () => {
    render(<Checkbox name="terms" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('name', 'terms')
  })

  it('renders with value attribute', () => {
    render(<Checkbox value="agree" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('value', 'agree')
  })

  it('handles required attribute', () => {
    render(<Checkbox required />)
    expect(screen.getByRole('checkbox')).toBeRequired()
  })

  it('indicator has correct classes', () => {
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    const indicator = checkbox.querySelector('[class*="flex items-center"]')
    expect(indicator).toHaveClass('flex', 'items-center', 'justify-center', 'text-current')
  })
})
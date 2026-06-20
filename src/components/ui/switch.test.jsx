import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './switch'

describe('Switch Component', () => {
  it('renders switch with default unchecked state', () => {
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeInTheDocument()
    expect(switchElement).toHaveAttribute('data-state', 'unchecked')
  })

  it('toggles when clicked', async () => {
    const user = userEvent.setup()
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    
    expect(switchElement).toHaveAttribute('data-state', 'unchecked')
    
    await user.click(switchElement)
    expect(switchElement).toHaveAttribute('data-state', 'checked')
    
    await user.click(switchElement)
    expect(switchElement).toHaveAttribute('data-state', 'unchecked')
  })

  it('renders with custom className', () => {
    render(<Switch className="custom-switch" />)
    expect(screen.getByRole('switch')).toHaveClass('custom-switch')
  })

  it('renders with checked state by default', () => {
    render(<Switch defaultChecked />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('data-state', 'checked')
  })

  it('handles controlled checked state', () => {
    const { rerender } = render(<Switch checked={false} />)
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked')
    
    rerender(<Switch checked={true} />)
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Switch disabled />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeDisabled()
    expect(switchElement).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('applies correct base classes', () => {
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveClass(
      'peer',
      'inline-flex',
      'h-5',
      'w-9',
      'shrink-0',
      'cursor-pointer',
      'items-center',
      'rounded-full',
      'border-2',
      'border-transparent',
      'shadow-sm',
      'transition-colors'
    )
  })

  it('applies checked state styles', () => {
    render(<Switch defaultChecked />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveClass('data-[state=checked]:bg-primary')
  })

  it('applies unchecked state styles', () => {
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveClass('data-[state=unchecked]:bg-input')
  })

  it('has focus ring', () => {
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    )
  })

  it('renders thumb with correct base classes', () => {
    render(<Switch />)
    const thumb = screen.getByRole('switch').querySelector('[class*="rounded-full"]')
    expect(thumb).toHaveClass(
      'pointer-events-none',
      'block',
      'h-4',
      'w-4',
      'rounded-full',
      'bg-background',
      'shadow-lg',
      'ring-0',
      'transition-transform'
    )
  })

  it('thumb translates when checked', () => {
    render(<Switch defaultChecked />)
    const thumb = screen.getByRole('switch').querySelector('[class*="rounded-full"]')
    expect(thumb).toHaveClass('data-[state=checked]:translate-x-4')
  })

  it('thumb stays in place when unchecked', () => {
    render(<Switch />)
    const thumb = screen.getByRole('switch').querySelector('[class*="rounded-full"]')
    expect(thumb).toHaveClass('data-[state=unchecked]:translate-x-0')
  })

  it('handles onChange callback', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Switch onCheckedChange={handleChange} />)
    
    await user.click(screen.getByRole('switch'))
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('handles keyboard interaction', async () => {
    const user = userEvent.setup()
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    
    switchElement.focus()
    await user.keyboard('{Enter}')
    expect(switchElement).toHaveAttribute('data-state', 'checked')
  })

  it('can be controlled with parent state', async () => {
    const user = userEvent.setup()
    const ControlledSwitch = () => {
      const [checked, setChecked] = React.useState(false)
      return (
        <Switch
          checked={checked}
          onCheckedChange={setChecked}
        />
      )
    }
    
    render(<ControlledSwitch />)
    const switchElement = screen.getByRole('switch')
    
    await user.click(switchElement)
    expect(switchElement).toHaveAttribute('data-state', 'checked')
  })

  it('has correct ARIA role', () => {
    render(<Switch />)
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Switch ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('renders with label', () => {
    render(
      <label>
        <Switch />
        <span>Enable notifications</span>
      </label>
    )
    expect(screen.getByText('Enable notifications')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('handles rapid clicking', async () => {
    const user = userEvent.setup()
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    
    await user.click(switchElement)
    await user.click(switchElement)
    await user.click(switchElement)
    
    expect(switchElement).toHaveAttribute('data-state', 'checked')
  })

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup()
    render(<Switch disabled />)
    const switchElement = screen.getByRole('switch')
    
    await user.click(switchElement)
    expect(switchElement).toHaveAttribute('data-state', 'unchecked')
  })

  it('supports data attributes', () => {
    render(<Switch data-testid="test-switch" />)
    expect(screen.getByTestId('test-switch')).toBeInTheDocument()
  })
})
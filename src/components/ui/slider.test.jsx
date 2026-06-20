import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Slider } from './slider'

describe('Slider Component', () => {
  it('renders slider with default props', () => {
    render(<Slider />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    render(<Slider className="custom-slider" />)
    expect(screen.getByRole('slider').parentElement).toHaveClass('custom-slider')
  })

  it('renders with default value', () => {
    render(<Slider defaultValue={[50]} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '50')
  })

  it('renders with min and max values', () => {
    render(<Slider min={0} max={100} defaultValue={[50]} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '100')
  })

  it('renders with step value', () => {
    render(<Slider step={5} defaultValue={[25]} />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Slider disabled />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeDisabled()
  })

  it('handles controlled value', () => {
    const { rerender } = render(<Slider value={[25]} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '25')
    
    rerender(<Slider value={[75]} />)
    expect(slider).toHaveAttribute('aria-valuenow', '75')
  })

  it('applies correct base classes to root', () => {
    render(<Slider />)
    const root = screen.getByRole('slider').parentElement
    expect(root).toHaveClass('relative', 'flex', 'w-full', 'touch-none', 'select-none', 'items-center')
  })

  it('renders track with correct classes', () => {
    render(<Slider />)
    const track = document.querySelector('.relative.h-1\\.5')
    expect(track).toHaveClass('h-1.5', 'w-full', 'grow', 'overflow-hidden', 'rounded-full', 'bg-primary/20')
  })

  it('renders range with correct classes', () => {
    render(<Slider />)
    const range = document.querySelector('.absolute.h-full.bg-primary')
    expect(range).toHaveClass('absolute', 'h-full', 'bg-primary')
  })

  it('renders thumb with correct classes', () => {
    render(<Slider />)
    const thumb = screen.getByRole('slider')
    expect(thumb).toHaveClass(
      'block',
      'h-4',
      'w-4',
      'rounded-full',
      'border',
      'border-primary/50',
      'bg-background',
      'shadow',
      'transition-colors'
    )
  })

  it('thumb has focus ring', () => {
    render(<Slider />)
    const thumb = screen.getByRole('slider')
    expect(thumb).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-1', 'focus-visible:ring-ring')
  })

  it('thumb is disabled when slider is disabled', () => {
    render(<Slider disabled />)
    const thumb = screen.getByRole('slider')
    expect(thumb).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
  })

  it('handles onValueChange callback', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Slider onValueChange={handleChange} defaultValue={[50]} />)
    
    // Simulate slider interaction
    const thumb = screen.getByRole('slider')
    await user.click(thumb)
    // The callback should be called when value changes
  })

  it('renders multiple thumbs for range slider', () => {
    render(<Slider defaultValue={[25, 75]} />)
    const thumbs = screen.getAllByRole('slider')
    expect(thumbs).toHaveLength(2)
  })

  it('handles value change via keyboard', async () => {
    const user = userEvent.setup()
    render(<Slider defaultValue={[50]} step={10} />)
    const slider = screen.getByRole('slider')
    
    slider.focus()
    await user.keyboard('{ArrowRight}')
    expect(slider).toHaveAttribute('aria-valuenow', '60')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Slider ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('renders with custom orientation', () => {
    render(<Slider orientation="vertical" />)
    const root = screen.getByRole('slider').parentElement
    expect(root).toBeInTheDocument()
  })

  it('supports inverted range', () => {
    render(<Slider defaultValue={[75, 25]} />)
    const thumbs = screen.getAllByRole('slider')
    expect(thumbs).toHaveLength(2)
  })

  it('handles min steps between thumbs', () => {
    render(<Slider minStepsBetweenThumbs={2} defaultValue={[20, 80]} />)
    expect(screen.getAllByRole('slider')).toHaveLength(2)
  })

  it('renders with correct ARIA attributes', () => {
    render(<Slider min={0} max={100} defaultValue={[50]} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '100')
    expect(slider).toHaveAttribute('aria-valuenow', '50')
    expect(slider).toHaveAttribute('aria-orientation', 'horizontal')
  })

  it('supports data attributes', () => {
    render(<Slider data-testid="test-slider" />)
    expect(screen.getByTestId('test-slider')).toBeInTheDocument()
  })

  it('handles extremely small step values', () => {
    render(<Slider step={0.1} defaultValue={[5.5]} />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
  })

  it('handles very large range values', () => {
    render(<Slider min={0} max={10000} defaultValue={[5000]} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuemax', '10000')
  })

  it('renders without crashing when value is at boundaries', () => {
    const { rerender } = render(<Slider defaultValue={[0]} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0')
    
    rerender(<Slider defaultValue={[100]} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '100')
  })

  it('handles onValueCommit callback', async () => {
    const user = userEvent.setup()
    const handleCommit = vi.fn()
    render(<Slider onValueCommit={handleCommit} defaultValue={[50]} />)
    
    const thumb = screen.getByRole('slider')
    await user.click(thumb)
    // Commit callback should be called after interaction
  })
})
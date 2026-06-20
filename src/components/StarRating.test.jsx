import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StarRating from './StarRating'

describe('StarRating Component', () => {
  it('renders 5 stars by default', () => {
    render(<StarRating />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars).toHaveLength(5)
  })

  it('renders with default rating of 0', () => {
    render(<StarRating />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveClass('text-border')
    })
  })

  it('renders with specified rating', () => {
    render(<StarRating rating={3} />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars[0]).toHaveClass('fill-foreground')
    expect(stars[1]).toHaveClass('fill-foreground')
    expect(stars[2]).toHaveClass('fill-foreground')
    expect(stars[3]).toHaveClass('text-border')
    expect(stars[4]).toHaveClass('text-border')
  })

  it('renders with full rating', () => {
    render(<StarRating rating={5} />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveClass('fill-foreground')
    })
  })

  it('rounds rating down', () => {
    render(<StarRating rating={2.4} />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars[0]).toHaveClass('fill-foreground')
    expect(stars[1]).toHaveClass('fill-foreground')
    expect(stars[2]).toHaveClass('text-border')
  })

  it('rounds rating up', () => {
    render(<StarRating rating={2.6} />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars[0]).toHaveClass('fill-foreground')
    expect(stars[1]).toHaveClass('fill-foreground')
    expect(stars[2]).toHaveClass('fill-foreground')
  })

  it('renders with custom size', () => {
    render(<StarRating size={20} />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveAttribute('width', '20')
      expect(star).toHaveAttribute('height', '20')
    })
  })

  it('renders with default size', () => {
    render(<StarRating />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveAttribute('width', '14')
      expect(star).toHaveAttribute('height', '14')
    })
  })

  it('applies interactive classes when interactive is true', () => {
    render(<StarRating interactive={true} />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveClass('cursor-pointer', 'hover:scale-110', 'transition-transform')
    })
  })

  it('does not apply interactive classes when interactive is false', () => {
    render(<StarRating interactive={false} />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).not.toHaveClass('cursor-pointer')
    })
  })

  it('handles onRate callback when interactive', async () => {
    const user = userEvent.setup()
    const handleRate = vi.fn()
    render(<StarRating rating={0} interactive={true} onRate={handleRate} />)
    
    const stars = document.querySelectorAll('.lucide-star')
    await user.click(stars[2])
    expect(handleRate).toHaveBeenCalledWith(3)
  })

  it('does not handle onRate when not interactive', async () => {
    const user = userEvent.setup()
    const handleRate = vi.fn()
    render(<StarRating rating={0} interactive={false} onRate={handleRate} />)
    
    const stars = document.querySelectorAll('.lucide-star')
    await user.click(stars[2])
    expect(handleRate).not.toHaveBeenCalled()
  })

  it('applies correct base classes', () => {
    render(<StarRating />)
    const container = document.querySelector('.flex.items-center')
    expect(container).toHaveClass('flex', 'items-center', 'gap-0.5')
  })

  it('handles rating of 0.5', () => {
    render(<StarRating rating={0.5} />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars[0]).toHaveClass('text-border')
  })

  it('handles rating of 4.9', () => {
    render(<StarRating rating={4.9} />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars[0]).toHaveClass('fill-foreground')
    expect(stars[1]).toHaveClass('fill-foreground')
    expect(stars[2]).toHaveClass('fill-foreground')
    expect(stars[3]).toHaveClass('fill-foreground')
    expect(stars[4]).toHaveClass('fill-foreground')
  })

  it('handles rating of 1', () => {
    render(<StarRating rating={1} />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars[0]).toHaveClass('fill-foreground')
    expect(stars[1]).toHaveClass('text-border')
  })

  it('handles rating of 2', () => {
    render(<StarRating rating={2} />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars[0]).toHaveClass('fill-foreground')
    expect(stars[1]).toHaveClass('fill-foreground')
    expect(stars[2]).toHaveClass('text-border')
  })

  it('handles rating of 3', () => {
    render(<StarRating rating={3} />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars[0]).toHaveClass('fill-foreground')
    expect(stars[1]).toHaveClass('fill-foreground')
    expect(stars[2]).toHaveClass('fill-foreground')
    expect(stars[3]).toHaveClass('text-border')
  })

  it('handles rating of 4', () => {
    render(<StarRating rating={4} />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars[0]).toHaveClass('fill-foreground')
    expect(stars[1]).toHaveClass('fill-foreground')
    expect(stars[2]).toHaveClass('fill-foreground')
    expect(stars[3]).toHaveClass('fill-foreground')
    expect(stars[4]).toHaveClass('text-border')
  })

  it('handles null rating', () => {
    render(<StarRating rating={null} />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveClass('text-border')
    })
  })

  it('handles undefined rating', () => {
    render(<StarRating rating={undefined} />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveClass('text-border')
    })
  })

  it('handles negative rating', () => {
    render(<StarRating rating={-1} />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveClass('text-border')
    })
  })

  it('handles rating greater than 5', () => {
    render(<StarRating rating={6} />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveClass('fill-foreground')
    })
  })

  it('handles onRate being undefined', async () => {
    const user = userEvent.setup()
    render(<StarRating interactive={true} />)
    
    const stars = document.querySelectorAll('.lucide-star')
    await user.click(stars[2])
    // Should not throw error
  })

  it('renders stars with unique keys', () => {
    render(<StarRating />)
    const stars = document.querySelectorAll('.lucide-star')
    expect(stars[0]).toHaveAttribute('key', '1')
    expect(stars[1]).toHaveAttribute('key', '2')
    expect(stars[2]).toHaveAttribute('key', '3')
    expect(stars[3]).toHaveAttribute('key', '4')
    expect(stars[4]).toHaveAttribute('key', '5')
  })

  it('supports data attributes', () => {
    render(<StarRating data-testid="test-star-rating" />)
    expect(screen.getByTestId('test-star-rating')).toBeInTheDocument()
  })

  it('applies hover effect on interactive stars', async () => {
    const user = userEvent.setup()
    render(<StarRating interactive={true} />)
    
    const stars = document.querySelectorAll('.lucide-star')
    await user.hover(stars[2])
    expect(stars[2]).toHaveClass('hover:scale-110')
  })

  it('handles very small size', () => {
    render(<StarRating size={8} />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveAttribute('width', '8')
      expect(star).toHaveAttribute('height', '8')
    })
  })

  it('handles very large size', () => {
    render(<StarRating size={32} />)
    const stars = document.querySelectorAll('.lucide-star')
    stars.forEach(star => {
      expect(star).toHaveAttribute('width', '32')
      expect(star).toHaveAttribute('height', '32')
    })
  })
})
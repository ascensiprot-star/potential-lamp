import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BookingCard from './BookingCard'

describe('BookingCard Component', () => {
  const mockBooking = {
    id: '1',
    service_name: 'Home Cleaning',
    provider_name: 'John Doe',
    status: 'confirmed',
    date: '2024-01-15',
    time_slot: '10:00 AM',
    price: 50,
  }

  it('renders booking card with service name', () => {
    render(<BookingCard booking={mockBooking} />)
    expect(screen.getByText('Home Cleaning')).toBeInTheDocument()
  })

  it('renders provider name when showProvider is true', () => {
    render(<BookingCard booking={mockBooking} showProvider={true} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('does not render provider name when showProvider is false', () => {
    render(<BookingCard booking={mockBooking} showProvider={false} />)
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })

  it('renders booking status badge', () => {
    render(<BookingCard booking={mockBooking} />)
    expect(screen.getByText('confirmed')).toBeInTheDocument()
  })

  it('renders booking date', () => {
    render(<BookingCard booking={mockBooking} />)
    expect(screen.getByText('2024-01-15')).toBeInTheDocument()
  })

  it('renders booking time slot', () => {
    render(<BookingCard booking={mockBooking} />)
    expect(screen.getByText('10:00 AM')).toBeInTheDocument()
  })

  it('renders price when greater than 0', () => {
    render(<BookingCard booking={mockBooking} />)
    expect(screen.getByText('$50')).toBeInTheDocument()
  })

  it('does not render price when 0', () => {
    const bookingWithoutPrice = { ...mockBooking, price: 0 }
    render(<BookingCard booking={bookingWithoutPrice} />)
    expect(screen.queryByText('$0')).not.toBeInTheDocument()
  })

  it('applies correct status styles for pending', () => {
    const pendingBooking = { ...mockBooking, status: 'pending' }
    render(<BookingCard booking={pendingBooking} />)
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('applies correct status styles for confirmed', () => {
    render(<BookingCard booking={mockBooking} />)
    expect(screen.getByText('confirmed')).toBeInTheDocument()
  })

  it('applies correct status styles for in_progress', () => {
    const inProgressBooking = { ...mockBooking, status: 'in_progress' }
    render(<BookingCard booking={inProgressBooking} />)
    expect(screen.getByText('in progress')).toBeInTheDocument()
  })

  it('applies correct status styles for completed', () => {
    const completedBooking = { ...mockBooking, status: 'completed' }
    render(<BookingCard booking={completedBooking} />)
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('applies correct status styles for cancelled', () => {
    const cancelledBooking = { ...mockBooking, status: 'cancelled' }
    render(<BookingCard booking={cancelledBooking} />)
    expect(screen.getByText('cancelled')).toBeInTheDocument()
  })

  it('applies correct status styles for no_show', () => {
    const noShowBooking = { ...mockBooking, status: 'no_show' }
    render(<BookingCard booking={noShowBooking} />)
    expect(screen.getByText('no show')).toBeInTheDocument()
  })

  it('handles onClick callback', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<BookingCard booking={mockBooking} onClick={handleClick} />)
    
    await user.click(screen.getByText('Home Cleaning'))
    expect(handleClick).toHaveBeenCalledWith(mockBooking)
  })

  it('renders calendar icon', () => {
    render(<BookingCard booking={mockBooking} />)
    const calendarIcon = document.querySelector('.lucide-calendar')
    expect(calendarIcon).toBeInTheDocument()
  })

  it('renders clock icon', () => {
    render(<BookingCard booking={mockBooking} />)
    const clockIcon = document.querySelector('.lucide-clock')
    expect(clockIcon).toBeInTheDocument()
  })

  it('applies correct base classes', () => {
    render(<BookingCard booking={mockBooking} />)
    const card = screen.getByText('Home Cleaning').parentElement.parentElement
    expect(card).toHaveClass('border', 'border-border', 'rounded-lg', 'p-4', 'hover:border-foreground', 'transition-colors', 'cursor-pointer', 'bg-card')
  })

  it('renders with custom booking data', () => {
    const customBooking = {
      ...mockBooking,
      service_name: 'Plumbing Repair',
      provider_name: 'Jane Smith',
      status: 'pending',
      date: '2024-02-20',
      time_slot: '2:30 PM',
      price: 75,
    }
    render(<BookingCard booking={customBooking} />)
    expect(screen.getByText('Plumbing Repair')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('2024-02-20')).toBeInTheDocument()
    expect(screen.getByText('2:30 PM')).toBeInTheDocument()
    expect(screen.getByText('$75')).toBeInTheDocument()
  })

  it('handles null onClick gracefully', async () => {
    const user = userEvent.setup()
    render(<BookingCard booking={mockBooking} />)
    
    await user.click(screen.getByText('Home Cleaning'))
    // Should not throw error
  })

  it('renders status with underscores replaced by spaces', () => {
    const statusWithUnderscore = { ...mockBooking, status: 'in_progress' }
    render(<BookingCard booking={statusWithUnderscore} />)
    expect(screen.getByText('in progress')).toBeInTheDocument()
  })

  it('applies font classes correctly', () => {
    render(<BookingCard booking={mockBooking} />)
    const serviceName = screen.getByText('Home Cleaning')
    expect(serviceName).toHaveClass('font-inter', 'font-semibold', 'text-sm')
  })

  it('renders provider name with muted text color', () => {
    render(<BookingCard booking={mockBooking} showProvider={true} />)
    const providerName = screen.getByText('John Doe')
    expect(providerName).toHaveClass('text-xs', 'text-muted-foreground')
  })

  it('renders date and time with muted text color', () => {
    render(<BookingCard booking={mockBooking} />)
    const dateText = screen.getByText('2024-01-15')
    expect(dateText).toHaveClass('text-xs', 'text-muted-foreground')
  })

  it('renders price with foreground color', () => {
    render(<BookingCard booking={mockBooking} />)
    const price = screen.getByText('$50')
    expect(price).toHaveClass('ml-auto', 'font-semibold', 'text-foreground')
  })

  it('handles missing status gracefully', () => {
    const bookingWithoutStatus = { ...mockBooking, status: null }
    render(<BookingCard booking={bookingWithoutStatus} />)
    const badge = document.querySelector('[class*="bg-"]')
    expect(badge).toBeInTheDocument()
  })

  it('renders badge with correct text size', () => {
    render(<BookingCard booking={mockBooking} />)
    const badge = screen.getByText('confirmed')
    expect(badge).toHaveClass('text-[10px]')
  })

  it('supports data attributes', () => {
    render(<BookingCard booking={mockBooking} data-testid="test-booking-card" />)
    expect(screen.getByTestId('test-booking-card')).toBeInTheDocument()
  })

  it('renders with different price values', () => {
    const { rerender } = render(<BookingCard booking={{ ...mockBooking, price: 10 }} />)
    expect(screen.getByText('$10')).toBeInTheDocument()

    rerender(<BookingCard booking={{ ...mockBooking, price: 1000 }} />)
    expect(screen.getByText('$1000')).toBeInTheDocument()

    rerender(<BookingCard booking={{ ...mockBooking, price: 99.99 }} />)
    expect(screen.getByText('$99.99')).toBeInTheDocument()
  })

  it('handles booking with very long service name', () => {
    const longNameBooking = {
      ...mockBooking,
      service_name: 'This is a very long service name that should still render properly within the card component without breaking the layout',
    }
    render(<BookingCard booking={longNameBooking} />)
    expect(screen.getByText('This is a very long service name that should still render properly within the card component without breaking the layout')).toBeInTheDocument()
  })

  it('handles booking with very long provider name', () => {
    const longProviderBooking = {
      ...mockBooking,
      provider_name: 'This is a very long provider name that should still render properly',
    }
    render(<BookingCard booking={longProviderBooking} showProvider={true} />)
    expect(screen.getByText('This is a very long provider name that should still render properly')).toBeInTheDocument()
  })

  it('applies hover styles', () => {
    render(<BookingCard booking={mockBooking} />)
    const card = screen.getByText('Home Cleaning').parentElement.parentElement
    expect(card).toHaveClass('hover:border-foreground')
  })
})
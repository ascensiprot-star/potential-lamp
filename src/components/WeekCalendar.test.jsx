import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeekCalendar from './WeekCalendar'

describe('WeekCalendar Component', () => {
  const mockBookings = [
    {
      id: '1',
      date: '2024-01-15',
      time_slot: '10:00',
      service_name: 'Cleaning Service',
      customer_email: 'john@example.com',
      status: 'confirmed',
      duration_minutes: 60,
    },
    {
      id: '2',
      date: '2024-01-16',
      time_slot: '14:00',
      service_name: 'Plumbing Repair',
      customer_email: 'jane@example.com',
      status: 'pending',
      duration_minutes: 90,
    },
  ]

  it('renders calendar with navigation header', () => {
    render(<WeekCalendar />)
    expect(screen.getByText(/Week/)).toBeInTheDocument()
  })

  it('renders previous week button', () => {
    render(<WeekCalendar />)
    const prevButton = document.querySelector('.lucide-chevron-left')
    expect(prevButton).toBeInTheDocument()
  })

  it('renders next week button', () => {
    render(<WeekCalendar />)
    const nextButton = document.querySelector('.lucide-chevron-right')
    expect(nextButton).toBeInTheDocument()
  })

  it('renders Today button when not on current week', async () => {
    const user = userEvent.setup()
    render(<WeekCalendar />)
    
    const nextButton = document.querySelector('.lucide-chevron-right').parentElement
    await user.click(nextButton)
    
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('does not render Today button when on current week', () => {
    render(<WeekCalendar />)
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
  })

  it('renders 7 day headers', () => {
    render(<WeekCalendar />)
    const dayHeaders = document.querySelectorAll('.grid > div:nth-child(2) div')
    expect(dayHeaders.length).toBe(7)
  })

  it('renders hour labels', () => {
    render(<WeekCalendar />)
    const hourLabels = document.querySelectorAll('.text-\\[10px\\].font-medium')
    expect(hourLabels.length).toBe(13)
  })

  it('renders booking slots when provided', () => {
    render(<WeekCalendar bookings={mockBookings} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
    expect(screen.getByText('Plumbing Repair')).toBeInTheDocument()
  })

  it('handles booking click', async () => {
    const user = userEvent.setup()
    const handleBookingClick = vi.fn()
    render(<WeekCalendar bookings={mockBookings} onBookingClick={handleBookingClick} />)
    
    const bookingButton = screen.getByText('Cleaning Service')
    await user.click(bookingButton)
    expect(handleBookingClick).toHaveBeenCalledWith(mockBookings[0])
  })

  it('applies correct status styles for pending bookings', () => {
    const pendingBooking = { ...mockBookings[0], status: 'pending' }
    render(<WeekCalendar bookings={[pendingBooking]} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('applies correct status styles for confirmed bookings', () => {
    render(<WeekCalendar bookings={mockBookings} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('applies correct status styles for in_progress bookings', () => {
    const inProgressBooking = { ...mockBookings[0], status: 'in_progress' }
    render(<WeekCalendar bookings={[inProgressBooking]} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('applies correct status styles for completed bookings', () => {
    const completedBooking = { ...mockBookings[0], status: 'completed' }
    render(<WeekCalendar bookings={[completedBooking]} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('applies correct status styles for cancelled bookings', () => {
    const cancelledBooking = { ...mockBookings[0], status: 'cancelled' }
    render(<WeekCalendar bookings={[cancelledBooking]} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('applies correct status styles for no_show bookings', () => {
    const noShowBooking = { ...mockBookings[0], status: 'no_show' }
    render(<WeekCalendar bookings={[noShowBooking]} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('renders booking time slot', () => {
    render(<WeekCalendar bookings={mockBookings} />)
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('renders booking service name', () => {
    render(<WeekCalendar bookings={mockBookings} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('renders customer email (username part)', () => {
    render(<WeekCalendar bookings={mockBookings} />)
    expect(screen.getByText('john')).toBeInTheDocument()
  })

  it('navigates to previous week', async () => {
    const user = userEvent.setup()
    render(<WeekCalendar />)
    
    const prevButton = document.querySelector('.lucide-chevron-left').parentElement
    const initialDate = screen.getByText(/–/).textContent
    
    await user.click(prevButton)
    
    const newDate = screen.getByText(/–/).textContent
    expect(newDate).not.toBe(initialDate)
  })

  it('navigates to next week', async () => {
    const user = userEvent.setup()
    render(<WeekCalendar />)
    
    const nextButton = document.querySelector('.lucide-chevron-right').parentElement
    const initialDate = screen.getByText(/–/).textContent
    
    await user.click(nextButton)
    
    const newDate = screen.getByText(/–/).textContent
    expect(newDate).not.toBe(initialDate)
  })

  it('navigates back to today when Today button is clicked', async () => {
    const user = userEvent.setup()
    render(<WeekCalendar />)
    
    // Navigate away from today
    const nextButton = document.querySelector('.lucide-chevron-right').parentElement
    await user.click(nextButton)
    expect(screen.getByText('Today')).toBeInTheDocument()
    
    // Click Today button
    await user.click(screen.getByText('Today'))
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
  })

  it('handles empty bookings array', () => {
    render(<WeekCalendar bookings={[]} />)
    const bookingButtons = screen.queryAllByText(/Service|Repair/)
    expect(bookingButtons.length).toBe(0)
  })

  it('handles null bookings', () => {
    render(<WeekCalendar bookings={null} />)
    const calendar = document.querySelector('.rounded-2xl')
    expect(calendar).toBeInTheDocument()
  })

  it('calculates booking position correctly', () => {
    const morningBooking = {
      ...mockBookings[0],
      time_slot: '09:00',
      date: new Date().toISOString().split('T')[0],
    }
    render(<WeekCalendar bookings={[morningBooking]} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('handles booking duration calculation', () => {
    const longBooking = {
      ...mockBookings[0],
      duration_minutes: 120,
      date: new Date().toISOString().split('T')[0],
      time_slot: '10:00',
    }
    render(<WeekCalendar bookings={[longBooking]} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('renders legend with all status types', () => {
    render(<WeekCalendar />)
    const legendItems = document.querySelectorAll('.flex.items-center.gap-1\\.5')
    expect(legendItems.length).toBe(6)
  })

  it('highlights current day', () => {
    render(<WeekCalendar />)
    // Today should be highlighted
    const todayCell = document.querySelector('[style*="var(--color-primary)"]')
    expect(todayCell).toBeInTheDocument()
  })

  it('handles bookings before start hour', () => {
    const earlyBooking = {
      ...mockBookings[0],
      time_slot: '07:00',
      date: new Date().toISOString().split('T')[0],
    }
    render(<WeekCalendar bookings={[earlyBooking]} />)
    // Early booking should not be visible
    expect(screen.queryByText('Cleaning Service')).not.toBeInTheDocument()
  })

  it('handles bookings after visible hours', () => {
    const lateBooking = {
      ...mockBookings[0],
      time_slot: '22:00',
      date: new Date().toISOString().split('T')[0],
    }
    render(<WeekCalendar bookings={[lateBooking]} />)
    // Late booking should not be visible
    expect(screen.queryByText('Cleaning Service')).not.toBeInTheDocument()
  })

  it('handles null time_slot gracefully', () => {
    const bookingWithoutTime = {
      ...mockBookings[0],
      time_slot: null,
      date: new Date().toISOString().split('T')[0],
    }
    render(<WeekCalendar bookings={[bookingWithoutTime]} />)
    // Should default to 9 AM
  })

  it('handles missing duration_minutes', () => {
    const bookingWithoutDuration = {
      ...mockBookings[0],
      duration_minutes: null,
      date: new Date().toISOString().split('T')[0],
      time_slot: '10:00',
    }
    render(<WeekCalendar bookings={[bookingWithoutDuration]} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('handles missing customer_email', () => {
    const bookingWithoutEmail = {
      ...mockBookings[0],
      customer_email: null,
      date: new Date().toISOString().split('T')[0],
      time_slot: '10:00',
    }
    render(<WeekCalendar bookings={[bookingWithoutEmail]} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
  })

  it('applies correct base classes', () => {
    render(<WeekCalendar />)
    const calendar = document.querySelector('.rounded-2xl')
    expect(calendar).toHaveClass('rounded-2xl', 'overflow-hidden', 'shadow-premium')
  })

  it('supports data attributes', () => {
    render(<WeekCalendar data-testid="test-week-calendar" />)
    expect(screen.getByTestId('test-week-calendar')).toBeInTheDocument()
  })

  it('handles onBookingClick being null', async () => {
    const user = userEvent.setup()
    render(<WeekCalendar bookings={mockBookings} />)
    
    const bookingButton = screen.getByText('Cleaning Service')
    await user.click(bookingButton)
    // Should not throw error
  })

  it('renders with multiple bookings on same day', () => {
    const sameDayBookings = [
      { ...mockBookings[0], date: new Date().toISOString().split('T')[0], time_slot: '10:00', id: '1' },
      { ...mockBookings[1], date: new Date().toISOString().split('T')[0], time_slot: '14:00', id: '2' },
    ]
    render(<WeekCalendar bookings={sameDayBookings} />)
    expect(screen.getByText('Cleaning Service')).toBeInTheDocument()
    expect(screen.getByText('Plumbing Repair')).toBeInTheDocument()
  })
})
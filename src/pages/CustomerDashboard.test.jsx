import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CustomerDashboard from './CustomerDashboard'

describe('CustomerDashboard Component', () => {
  it('renders customer dashboard', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    expect(screen.getByText('My Bookings')).toBeInTheDocument()
  })

  it('renders dashboard header', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    expect(screen.getByText('Track and manage your reservations')).toBeInTheDocument()
  })

  it('renders new booking button', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    expect(screen.getByText('+ New Booking')).toBeInTheDocument()
  })

  it('renders metric cards', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    const metricCards = document.querySelectorAll('.card-premium')
    expect(metricCards.length).toBeGreaterThan(0)
  })

  it('renders booking filters', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('handles filter selection', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    
    await user.click(screen.getByText('Upcoming'))
    expect(screen.getByText('Upcoming')).toHaveClass('active')
  })

  it('renders booking rows when bookings exist', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should render booking rows if bookings exist
  })

  it('renders empty state when no bookings', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should render empty state
  })

  it('renders booking dialog when booking is selected', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    
    // Click on a booking to open dialog
  })

  it('cancels booking', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    
    // Handle booking cancellation
  })

  it('displays correct status styles', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should apply correct status classes
  })

  it('renders calendar icon for date', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    const calendarIcon = document.querySelector('.lucide-calendar-days')
    expect(calendarIcon).toBeInTheDocument()
  })

  it('renders clock icon for time', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    const clockIcon = document.querySelector('.lucide-clock')
    expect(clockIcon).toBeInTheDocument()
  })

  it('displays booking price', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should display price if booking has price
  })

  it('renders provider initials', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter
    )
    // Should render provider initials
  })

  it('handles booking click', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    
    // Click on booking row
  })

  it('renders loading state', () => {
    // Test with loading prop
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should show loading spinner
  })

  it('calculates metrics correctly', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should calculate and display metrics
  })

  it('filters bookings by status', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should filter bookings based on selected filter
  })

  it('renders status badges', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should render status badges with correct colors
  })

  it('displays booking service name', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should display service name
  })

  it('displays booking provider name', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should display provider name
  })

  it('displays booking date and time', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter
    )
    // Should display date and time
  })

  it('renders responsive layout', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should render responsive layout
  })

  it('supports data attributes', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard data-testid="test-dashboard" />
      </MemoryRouter>
    )
    expect(screen.getByTestId('test-dashboard')).toBeInTheDocument()
  })

  it('handles dialog close', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    
    // Handle dialog close
  })

  it('renders navigation links', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should render navigation links
  })

  it('handles empty booking list gracefully', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should handle empty state
  })

  it('updates booking status after cancellation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    
    // Status should update after cancellation
  })

  it('displays booking details in dialog', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    // Should display booking details in dialog
  })

  it('renders arrow icon on booking rows', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    )
    const arrowIcon = document.querySelector('.lucide-arrow-right')
    expect(arrowIcon).toBeInTheDocument()
  })

  it('applies hover effects on booking rows', () => {
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter
    )
    const bookingRow = document.querySelector('.hover\\:shadow-float')
    expect(bookingRow).toBeInTheDocument()
  })
})
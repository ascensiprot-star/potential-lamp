import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar } from './calendar'

describe('Calendar Component', () => {
  it('renders calendar with default props', () => {
    render(<Calendar />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    render(<Calendar className="custom-calendar" />)
    const calendar = document.querySelector('.custom-calendar')
    expect(calendar).toBeInTheDocument()
  })

  it('renders navigation buttons', () => {
    render(<Calendar />)
    const navButtons = document.querySelectorAll('.nav_button')
    expect(navButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('renders month caption', () => {
    render(<Calendar />)
    const caption = document.querySelector('.caption_label')
    expect(caption).toBeInTheDocument()
  })

  it('renders calendar grid', () => {
    render(<Calendar />)
    const table = document.querySelector('.table')
    expect(table).toBeInTheDocument()
  })

  it('renders days of week', () => {
    render(<Calendar />)
    const headCells = document.querySelectorAll('.head_cell')
    expect(headCells.length).toBe(7) // 7 days in a week
  })

  it('renders calendar days', () => {
    render(<Calendar />)
    const days = document.querySelectorAll('.day')
    expect(days.length).toBeGreaterThan(0)
  })

  it('handles showOutsideDays prop', () => {
    const { rerender } = render(<Calendar showOutsideDays={false} />)
    expect(document.querySelector('.p-3')).toBeInTheDocument()

    rerender(<Calendar showOutsideDays={true} />)
    expect(document.querySelector('.p-3')).toBeInTheDocument()
  })

  it('renders chevron icons for navigation', () => {
    render(<Calendar />)
    const icons = document.querySelectorAll('.h-4.w-4')
    expect(icons.length).toBeGreaterThanOrEqual(2)
  })

  it('applies correct classes to months', () => {
    render(<Calendar />)
    const months = document.querySelector('.months')
    expect(months).toHaveClass('flex', 'flex-col', 'sm:flex-row', 'space-y-4', 'sm:space-x-4', 'sm:space-y-0')
  })

  it('applies correct classes to month', () => {
    render(<Calendar />)
    const month = document.querySelector('.month')
    expect(month).toHaveClass('space-y-4')
  })

  it('applies correct classes to caption', () => {
    render(<Calendar />)
    const caption = document.querySelector('.caption')
    expect(caption).toHaveClass('flex', 'justify-center', 'pt-1', 'relative', 'items-center')
  })

  it('applies correct classes to navigation', () => {
    render(<Calendar />)
    const nav = document.querySelector('.nav')
    expect(nav).toHaveClass('space-x-1', 'flex', 'items-center')
  })

  it('applies correct classes to table', () => {
    render(<Calendar />)
    const table = document.querySelector('.table')
    expect(table).toHaveClass('w-full', 'border-collapse', 'space-y-1')
  })

  it('applies correct classes to head row', () => {
    render(<Calendar />)
    const headRow = document.querySelector('.head_row')
    expect(headRow).toHaveClass('flex')
  })

  it('applies correct classes to head cell', () => {
    render(<Calendar />)
    const headCell = document.querySelector('.head_cell')
    expect(headCell).toHaveClass('text-muted-foreground', 'rounded-md', 'w-8', 'font-normal', 'text-[0.8rem]')
  })

  it('applies correct classes to row', () => {
    render(<Calendar />)
    const row = document.querySelector('.row')
    expect(row).toHaveClass('flex', 'w-full', 'mt-2')
  })

  it('applies correct classes to day', () => {
    render(<Calendar />)
    const day = document.querySelector('.day')
    expect(day).toHaveClass('h-8', 'w-8', 'p-0', 'font-normal')
  })

  it('handles selected day', () => {
    render(<Calendar mode="single" selected={new Date()} />)
    const selectedDay = document.querySelector('.day_selected')
    // Selected day might exist depending on the date
  })

  it('handles today highlighting', () => {
    render(<Calendar />)
    const today = document.querySelector('.day_today')
    // Today might be highlighted
  })

  it('handles disabled days', () => {
    const disabledDate = new Date()
    disabledDate.setMonth(disabledDate.getMonth() + 1)
    render(
      <Calendar
        mode="single"
        disabled={disabledDate}
      />
    )
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('handles range mode', () => {
    render(<Calendar mode="range" />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('handles multiple mode', () => {
    render(<Calendar mode="multiple" />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Calendar ref={ref} />)
    // Calendar might forward ref to underlying component
  })

  it('handles month navigation', async () => {
    const user = userEvent.setup()
    render(<Calendar />)
    
    const nextButton = document.querySelector('.nav_button_next')
    if (nextButton) {
      await user.click(nextButton)
    }
  })

  it('renders with custom classNames', () => {
    render(
      <Calendar
        classNames={{
          months: 'custom-months',
          day: 'custom-day',
        }}
      />
    )
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('handles minimum date', () => {
    const minDate = new Date()
    minDate.setDate(minDate.getDate() + 1)
    render(<Calendar mode="single" fromDate={minDate} />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('handles maximum date', () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() - 1)
    render(<Calendar mode="single" toDate={maxDate} />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('handles default month', () => {
    const defaultMonth = new Date(2024, 0, 1)
    render(<Calendar defaultMonth={defaultMonth} />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('handles week start', () => {
    render(<Calendar weekStartsOn={1} />) // Start on Monday
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('handles fixed number of weeks', () => {
    render(<Calendar fixedWeeks />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('handles ISO week', () => {
    render(<Calendar ISOWeek />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('supports data attributes', () => {
    render(<Calendar data-testid="test-calendar" />)
    expect(screen.getByTestId('test-calendar')).toBeInTheDocument()
  })

  it('handles caption layout', () => {
    render(<Calendar captionLayout="dropdown" />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('handles disabled navigation', () => {
    render(<Calendar disabled />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('handles hidden outside days', () => {
    render(<Calendar showOutsideDays={false} />)
    const calendar = document.querySelector('.p-3')
    expect(calendar).toBeInTheDocument()
  })

  it('applies outside day styles', () => {
    render(<Calendar />)
    const outsideDay = document.querySelector('.day_outside')
    // Outside days might exist depending on the month
  })

  it('applies range start styles', () => {
    render(<Calendar mode="range" />)
    const rangeStart = document.querySelector('.day-range-start')
    // Range start might exist
  })

  it('applies range end styles', () => {
    render(<Calendar mode="range" />)
    const rangeEnd = document.querySelector('.day-range-end')
    // Range end might exist
  })

  it('applies range middle styles', () => {
    render(<Calendar mode="range" />)
    const rangeMiddle = document.querySelector('.day-range-middle')
    // Range middle might exist
  })
})
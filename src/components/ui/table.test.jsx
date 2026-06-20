import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table'

describe('Table Component', () => {
  it('renders table with default structure', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header 1</TableHead>
            <TableHead>Header 2</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell 1</TableCell>
            <TableCell>Cell 2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByText('Header 1')).toBeInTheDocument()
    expect(screen.getByText('Header 2')).toBeInTheDocument()
    expect(screen.getByText('Cell 1')).toBeInTheDocument()
    expect(screen.getByText('Cell 2')).toBeInTheDocument()
  })

  it('renders table header with correct classes', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )
    const header = screen.getByText('Header').parentElement.parentElement
    expect(header.tagName).toBe('THEAD')
    expect(header).toHaveClass('[&_tr]:border-b')
  })

  it('renders table body with correct classes', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Body Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const body = screen.getByText('Body Cell').parentElement.parentElement
    expect(body.tagName).toBe('TBODY')
    expect(body).toHaveClass('[&_tr:last-child]:border-0')
  })

  it('renders table footer with correct classes', () => {
    render(
      <Table>
        <TableFooter>
          <TableRow>
            <TableCell>Footer Cell</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
    const footer = screen.getByText('Footer Cell').parentElement.parentElement
    expect(footer.tagName).toBe('TFOOT')
    expect(footer).toHaveClass('border-t', 'bg-muted/50', 'font-medium')
  })

  it('renders table row with correct classes', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Row Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const row = screen.getByText('Row Cell').parentElement
    expect(row.tagName).toBe('TR')
    expect(row).toHaveClass('border-b', 'transition-colors')
  })

  it('renders table head with correct classes', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Head Cell</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )
    const head = screen.getByText('Head Cell')
    expect(head.tagName).toBe('TH')
    expect(head).toHaveClass('h-10', 'px-2', 'text-left', 'align-middle', 'font-medium', 'text-muted-foreground')
  })

  it('renders table cell with correct classes', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell Content</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const cell = screen.getByText('Cell Content')
    expect(cell.tagName).toBe('TD')
    expect(cell).toHaveClass('p-2', 'align-middle')
  })

  it('renders table caption with correct classes', () => {
    render(
      <Table>
        <TableCaption>Table Caption</TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const caption = screen.getByText('Table Caption')
    expect(caption.tagName).toBe('CAPTION')
    expect(caption).toHaveClass('mt-4', 'text-sm', 'text-muted-foreground')
  })

  it('applies custom className to table', () => {
    render(
      <Table className="custom-table">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const table = document.querySelector('table')
    expect(table).toHaveClass('custom-table')
  })

  it('applies custom className to header', () => {
    render(
      <Table>
        <TableHeader className="custom-header">
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )
    const header = document.querySelector('thead')
    expect(header).toHaveClass('custom-header')
  })

  it('applies custom className to body', () => {
    render(
      <Table>
        <TableBody className="custom-body">
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const body = document.querySelector('tbody')
    expect(body).toHaveClass('custom-body')
  })

  it('applies custom className to footer', () => {
    render(
      <Table>
        <TableFooter className="custom-footer">
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
    const footer = document.querySelector('tfoot')
    expect(footer).toHaveClass('custom-footer')
  })

  it('applies custom className to row', () => {
    render(
      <Table>
        <TableBody>
          <TableRow className="custom-row">
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const row = document.querySelector('tr')
    expect(row).toHaveClass('custom-row')
  })

  it('applies custom className to head', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="custom-head">Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )
    expect(screen.getByText('Header')).toHaveClass('custom-head')
  })

  it('applies custom className to cell', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="custom-cell">Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByText('Cell')).toHaveClass('custom-cell')
  })

  it('applies custom className to caption', () => {
    render(
      <Table>
        <TableCaption className="custom-caption">Caption</TableCaption>
      </Table>
    )
    expect(screen.getByText('Caption')).toHaveClass('custom-caption')
  })

  it('handles hover state on row', async () => {
    const user = userEvent.setup()
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Hover Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const row = screen.getByText('Hover Cell').parentElement
    await user.hover(row)
    expect(row).toHaveClass('hover:bg-muted/50')
  })

  it('handles selected state on row', () => {
    render(
      <Table>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>Selected Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const row = screen.getByText('Selected Cell').parentElement
    expect(row).toHaveClass('data-[state=selected]:bg-muted')
  })

  it('renders complete table structure', () => {
    render(
      <Table>
        <TableCaption>User Data</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>john@example.com</TableCell>
            <TableCell>Admin</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane Smith</TableCell>
            <TableCell>jane@example.com</TableCell>
            <TableCell>User</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total: 2 users</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(screen.getByText('User Data')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Total: 2 users')).toBeInTheDocument()
  })

  it('forwards ref correctly for table', () => {
    const ref = { current: null }
    render(
      <Table ref={ref}>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(ref.current).toBeInstanceOf(HTMLTableElement)
  })

  it('forwards ref correctly for row', () => {
    const ref = { current: null }
    render(
      <Table>
        <TableBody>
          <TableRow ref={ref}>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(ref.current).toBeInstanceOf(HTMLTableRowElement)
  })

  it('forwards ref correctly for head', () => {
    const ref = { current: null }
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead ref={ref}>Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )
    expect(ref.current).toBeInstanceOf(HTMLTableCellElement)
  })

  it('forwards ref correctly for cell', () => {
    const ref = { current: null }
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell ref={ref}>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(ref.current).toBeInstanceOf(HTMLTableCellElement)
  })

  it('handles checkbox in table head', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <input type="checkbox" role="checkbox" />
            </TableHead>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )
    const headWithCheckbox = screen.getByRole('columnheader')
    expect(headWithCheckbox).toHaveClass('[&:has([role=checkbox])]:pr-0')
  })

  it('handles checkbox in table cell', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <input type="checkbox" role="checkbox" />
            </TableCell>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const cellWithCheckbox = screen.getByRole('cell')
    expect(cellWithCheckbox).toHaveClass('[&:has([role=checkbox])]:pr-0')
  })

  it('supports data attributes', () => {
    render(
      <Table data-testid="test-table">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByTestId('test-table')).toBeInTheDocument()
  })

  it('renders with empty table', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3}>No data available</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('handles colspan attribute', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2}>Spanned Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const cell = screen.getByText('Spanned Cell')
    expect(cell).toHaveAttribute('colspan', '2')
  })

  it('handles rowspan attribute', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell rowSpan={2}>Row Span</TableCell>
            <TableCell>Cell 1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Cell 2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const cell = screen.getByText('Row Span')
    expect(cell).toHaveAttribute('rowspan', '2')
  })
})
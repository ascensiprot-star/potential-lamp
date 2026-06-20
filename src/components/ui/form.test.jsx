import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  useFormField,
} from './form'
import { Input } from './input'

describe('Form Component', () => {
  it('renders form with form provider', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: {
          username: '',
        },
      })

      return (
        <Form {...form}>
          <form>Test Form</form>
        </Form>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Test Form')).toBeInTheDocument()
  })

  it('renders form item with correct classes', () => {
    render(
      <Form>
        <form>
          <FormItem>Form Item</FormItem>
        </form>
      </Form>
    )
    const item = screen.getByText('Form Item')
    expect(item).toHaveClass('space-y-2')
  })

  it('renders form label with correct classes', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Label</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('renders form description with correct classes', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormDescription>Test Description</FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Test Description')).toHaveClass('text-[0.8rem]', 'text-muted-foreground')
  })

  it('renders form message when there is an error', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage>Error message</FormMessage>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    expect(screen.queryByText('Error message')).not.toBeInTheDocument()
  })

  it('applies destructive class to label when there is error', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Error Label</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage>Error message</FormMessage>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    const label = screen.getByText('Error Label')
    expect(label).not.toHaveClass('text-destructive')
  })

  it('generates unique IDs for form fields', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('id')
  })

  it('connects label to input via htmlFor', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connected Label</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    const label = screen.getByText('Connected Label')
    const input = screen.getByRole('textbox')
    expect(label).toHaveAttribute('for', input.getAttribute('id'))
  })

  it('applies custom className to form item', () => {
    render(
      <Form>
        <form>
          <FormItem className="custom-item">Custom Item</FormItem>
        </form>
      </Form>
    )
    expect(screen.getByText('Custom Item')).toHaveClass('custom-item')
  })

  it('applies custom className to form label', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="custom-label">Custom Label</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Custom Label')).toHaveClass('custom-label')
  })

  it('applies custom className to form description', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormDescription className="custom-description">Custom Description</FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Custom Description')).toHaveClass('custom-description')
  })

  it('applies custom className to form message', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage className="custom-message">Error</FormMessage>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
  })

  it('handles controlled form field', async () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('')
  })

  it('renders complete form structure', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: {
          username: '',
          email: '',
        },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>Enter your username</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>Enter your email</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Username')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Enter your username')).toBeInTheDocument()
    expect(screen.getByText('Enter your email')).toBeInTheDocument()
  })

  it('forwards ref correctly for form item', () => {
    const ref = { current: null }
    render(
      <Form>
        <form>
          <FormItem ref={ref}>Ref Item</FormItem>
        </form>
      </Form>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('throws error when useFormField is used outside FormField', () => {
    const TestComponent = () => {
      const { id } = useFormField()
      return <div>{id}</div>
    }

    expect(() => render(<TestComponent />)).toThrow('useFormField should be used within <FormField>')
  })

  it('sets aria attributes on form control based on error state', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      return (
        <Form {...form}>
          <form>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>Description</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('supports data attributes', () => {
    render(
      <Form>
        <form>
          <FormItem data-testid="test-item">Data Item</FormItem>
        </form>
      </Form>
    )
    expect(screen.getByTestId('test-item')).toBeInTheDocument()
  })

  it('handles form submission', async () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: { field: '' },
      })

      const onSubmit = (data) => {
        // Handle submission
      }

      return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <button type="submit">Submit</button>
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Submit')).toBeInTheDocument()
  })

  it('renders multiple form fields', () => {
    const TestForm = () => {
      const form = useForm({
        defaultValues: {
          field1: '',
          field2: '',
          field3: '',
        },
      })

      return (
        <Form {...form}>
          <form>
            {['field1', 'field2', 'field3'].map((fieldName) => (
              <FormField
                key={fieldName}
                name={fieldName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldName}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </form>
        </Form>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('field1')).toBeInTheDocument()
    expect(screen.getByText('field2')).toBeInTheDocument()
    expect(screen.getByText('field3')).toBeInTheDocument()
  })
})
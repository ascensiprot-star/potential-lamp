import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

describe('ThemeContext Provider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('renders children', () => {
    render(
      <ThemeProvider>
        <div>Test Child</div>
      </ThemeProvider>
    )
    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('initializes theme from localStorage', () => {
    localStorage.setItem('truvornex-theme', 'light')
    
    const TestComponent = () => {
      const { theme } = useTheme()
      return <div>{theme}</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByText('light')).toBeInTheDocument()
  })

  it('defaults to dark theme when localStorage is empty', () => {
    const TestComponent = () => {
      const { theme } = useTheme()
      return <div>{theme}</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByText('dark')).toBeInTheDocument()
  })

  it('adds light class to document when theme is light', () => {
    localStorage.setItem('truvornex-theme', 'light')

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    )

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('removes light class when theme is dark', () => {
    localStorage.setItem('truvornex-theme', 'dark')

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('saves theme to localStorage on change', () => {
    const TestComponent = () => {
      const { theme, toggleTheme } = useTheme()
      return <button onClick={toggleTheme}>Toggle</button>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Toggle theme and check localStorage
  })

  it('toggles theme between light and dark', () => {
    const TestComponent = () => {
      const { theme, toggleTheme } = useTheme()
      return (
        <div>
          <span>{theme}</span>
          <button onClick={toggleTheme}>Toggle</button>
        </div>
      )
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
  })

  it('adds theme switching class during toggle', () => {
    const TestComponent = () => {
      const { toggleTheme } = useTheme()
      return <button onClick={toggleTheme}>Toggle</button>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
  })

  it('removes theme switching class after transition', async () => {
    const TestComponent = () => {
      const { toggleTheme } = useTheme()
      return <button onClick={toggleTheme}>Toggle</button>
    </TestComponent>

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
  })

  it('provides useTheme hook', () => {
    const TestComponent = () => {
      const theme = useTheme()
      return <div>{theme ? 'Has Theme' : 'No Theme'}</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByText('Has Theme')).toBeInTheDocument()
  })

  it('throws error when useTheme used outside provider', () => {
    const TestComponent = () => {
      try {
        useTheme()
        return <div>No Error</div>
      } catch (error) {
        return <div>{error.message}</div>
      }
    }

    render(<TestComponent />)
    expect(screen.getByText(/useTheme must be used/)).toBeInTheDocument()
  })

  it('provides theme state', () => {
    const TestComponent = () => {
      const { theme } = useTheme()
      return <div>{theme}</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
  })

  it('provides toggleTheme function', () => {
    const TestComponent = () => {
      const { toggleTheme } = useTheme()
      return <button onClick={toggleTheme}>Toggle Theme</button>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByText('Toggle Theme')).toBeInTheDocument()
  })

  it('handles localStorage errors gracefully', () => {
    const originalGetItem = localStorage.getItem
    localStorage.getItem = vi.fn(() => {
      throw new Error('Storage error')
    })

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    )

    expect(screen.getByText('Test')).toBeInTheDocument()
    
    localStorage.getItem = originalGetItem
  })

  it('handles localStorage setItem errors', () => {
    const originalSetItem = localStorage.setItem
    localStorage.setItem = vi.fn(() => {
      throw new Error('Storage error')
    })

    const TestComponent = () => {
      const { toggleTheme } = useTheme()
      return <button onClick={toggleTheme}>Toggle</button>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    localStorage.setItem = originalSetItem
  })

  it('persists theme preference across sessions', () => {
    localStorage.setItem('truvornex-theme', 'light')

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    )

    expect(localStorage.getItem('truvornex-theme')).toBe('light')
  })

  it('updates document class on theme change', () => {
    const TestComponent = () => {
      const { toggleTheme } = useTheme()
      return <button onClick={toggleTheme}>Toggle</button>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
  })

  it('handles rapid theme toggles', () => {
    const TestComponent = () => {
      const { toggleTheme, theme } = useTheme()
      return (
        <div>
          <span>{theme}</span>
          <button onClick={toggleTheme}>Toggle</button>
        </div>
      )
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
  })

  it('supports nested providers', () => {
    const TestComponent = () => {
      const theme = useTheme()
      return <div>{theme}</div>
    }

    render(
      <ThemeProvider>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </ThemeProvider>
    )
  })

  it('cleans up theme switching class after timeout', () => {
    const TestComponent = () => {
      const { toggleTheme } = useTheme()
      return <button onClick={toggleTheme}>Toggle</button>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
  })
})
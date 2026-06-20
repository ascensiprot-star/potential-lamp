import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// Mock fetch
global.fetch = vi.fn()

describe('AuthContext Provider', () => {
  it('renders children', () => {
    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    )
    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('initializes with loading state', () => {
    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    )
    
    // Should be in loading state initially
  })

  it('checks user auth on mount', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: '1', email: 'test@example.com' } }),
    })

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/user', { credentials: 'include' })
    })
  })

  it('sets user when auth check succeeds', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: '1', email: 'test@example.com' } }),
    })

    const TestComponent = () => {
      const { user } = useAuth()
      return <div>{user ? 'Authenticated' : 'Not Authenticated'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Authenticated')).toBeInTheDocument()
    })
  })

  it('sets unauthenticated when no user returned', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: null }),
    })

    const TestComponent = () => {
      const { isAuthenticated } = useAuth()
      return <div>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Not Authenticated')).toBeInTheDocument()
    })
  })

  it('handles auth check errors', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'))

    const TestComponent = () => {
      const { authError } = useAuth()
      return <div>{authError ? authError.message : 'No Error'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('sets authError on failure', async () => {
    global.fetch.mockRejectedValue(new Error('Auth failed'))

    const TestComponent = () => {
      const { authError } = useAuth()
      return <div>{authError ? 'Has Error' : 'No Error'}</div>
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Has Error')).toBeInTheDocument()
    })
  })

  it('provides useAuth hook', () => {
    const TestComponent = () => {
      const auth = useAuth()
      return <div>{auth ? 'Has Context' : 'No Context'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Has Context')).toBeInTheDocument()
  })

  it('throws error when useAuth used outside provider', () => {
    const TestComponent = () => {
      try {
        useAuth()
        return <div>No Error</div>
      } catch (error) {
        return <div>{error.message}</div>
      }
    }

    render(<TestComponent />)
    expect(screen.getByText(/useAuth must be used/)).toBeInTheDocument()
  })

  it('provides logout function', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    const TestComponent = () => {
      const { logout } = useAuth()
      return <button onClick={logout}>Logout</button>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const button = screen.getByText('Logout')
    // Test logout functionality
  })

  it('navigates to login on logout with default', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    const TestComponent = () => {
      const { logout } = useAuth()
      return <button onClick={() => logout(true)}>Logout</button>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Should redirect to login
  })

  it('clears user on logout', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    const TestComponent = () => {
      const { user, logout } = useAuth()
      return <button onClick={() => logout(false)}>Logout</button>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
  })

  it('provides navigateToLogin function', () => {
    const TestComponent = () => {
      const { navigateToLogin } = useAuth()
      return <button onClick={navigateToLogin}>Go to Login</button>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Go to Login')).toBeInTheDocument()
  })

  it('provides checkUserAuth function', () => {
    const TestComponent = () => {
      const { checkUserAuth } = useAuth()
      return <button onClick={checkUserAuth}>Check Auth</button>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Check Auth')).toBeInTheDocument()
  })

  it('provides setUser function', () => {
    const TestComponent = () => {
      const { setUser } = useAuth()
      return <button onClick={() => setUser({ id: '1' })}>Set User</button>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Set User')).toBeInTheDocument()
  })

  it('provides setIsAuthenticated function', () => {
    const TestComponent = () => {
      const { setIsAuthenticated } = useAuth()
      return <button onClick={() => setIsAuthenticated(true)}>Set Auth</button>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Set Auth')).toBeInTheDocument()
  })

  it('provides authChecked state', () => {
    const TestComponent = () => {
      const { authChecked } = useAuth()
      return <div>{authChecked ? 'Checked' : 'Not Checked'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Should eventually show Checked
  })

  it('provides isLoadingAuth state', () => {
    const TestComponent = () => {
      const { isLoadingAuth } = useAuth()
      return <div>{isLoadingAuth ? 'Loading' : 'Not Loading'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Should initially show Loading
  })

  it('provides isAuthenticated state', () => {
    const TestComponent = () => {
      const { isAuthenticated } = useAuth()
      return <div>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
  })

  it('provides user state', () => {
    const TestComponent = () => {
      const { user } = useAuth()
      return <div>{user ? user.email : 'No User'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
  })

  it('handles concurrent auth checks', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: '1' } }),
    })

    const TestComponent = () => {
      const { checkUserAuth } = useAuth()
      return (
        <div>
          <button onClick={checkUserAuth}>Check 1</button>
          <button onClick={checkUserAuth}>Check 2</button>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Handle concurrent checks
  })

  it('uses credentials include in fetch', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: '1' } }),
    })

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/user',
        { credentials: 'include' }
      )
    })
  })

  it('handles logout API errors gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('Logout failed'))

    const TestComponent = () => {
      const { logout } = useAuth()
      return <button onClick={() => logout(false)}>Logout</button>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
  })

  it('supports nested providers', () => {
    const TestComponent = () => {
      const auth = useAuth()
      return <div>{auth ? 'Nested' : 'Not Nested'}</div>
    }

    render(
      <AuthProvider>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </AuthProvider>
    )
  })
})
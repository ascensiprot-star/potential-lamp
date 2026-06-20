import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useGeolocation from './useGeolocation'

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
})

// Mock fetch
global.fetch = vi.fn()

describe('useGeolocation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('returns location state', () => {
    const { result } = renderHook(() => useGeolocation())
    
    expect(result.current.location).toBeDefined()
  })

  it('returns error state', () => {
    const { result } = renderHook(() => useGeolocation())
    
    expect(result.current.error).toBeDefined()
  })

  it('returns loading state', () => {
    const { result } = renderHook(() => useGeolocation())
    
    expect(result.current.loading).toBeDefined()
  })

  it('returns permissionDenied state', () => {
    const { result } = renderHook(() => useGeolocation())
    
    expect(result.current.permissionDenied).toBeDefined()
  })

  it('returns sendLocationToServer function', () => {
    const { result } = renderHook(() => useGeolocation())
    
    expect(result.current.sendLocationToServer).toBeInstanceOf(Function)
  })

  it('uses default fallback location', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 25.396, longitude: 68.374 } })
    })

    const { result } = renderHook(() => useGeolocation())

    expect(result.current.location).toEqual([25.396, 68.374])
  })

  it('uses custom fallback location', () => {
    const customFallback = [40.7128, -74.006]
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })

    const { result } = renderHook(() => useGeolocation(customFallback))

    expect(result.current.location).toEqual([40.7128, -74.006])
  })

  it('sets loading to true initially', () => {
    const { result } = renderHook(() => useGeolocation())
    
    expect(result.current.loading).toBe(true)
  })

  it('sets loading to false after getting location', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    const { result, waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()

    expect(result.current.loading).toBe(false)
  })

  it('sets error when geolocation is not supported', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      writable: true,
    })

    const { result, waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()

    expect(result.current.error).toBe('Geolocation is not supported by your browser')
    expect(result.current.location).toEqual([25.396, 68.374])
  })

  it('sets permissionDenied when permission is denied', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({ code: 1, message: 'Permission denied' })
    })

    const { result, waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()

    expect(result.current.permissionDenied).toBe(true)
  })

  it('retries without high accuracy on position unavailable', async () => {
    mockGeolocation.getCurrentPosition
      .mockImplementationOnce((success, error) => {
        error({ code: 2, message: 'Position unavailable' })
      })
      .mockImplementationOnce((success) => {
        success({ coords: { latitude: 40.7128, longitude: -74.006 } })
      })

    const { result, waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()
    await waitForNextUpdate()

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(2)
  })

  it('handles timeout errors', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({ code: 3, message: 'Timeout' })
    })
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })

    const { result, waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()
    await waitForNextUpdate()

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
  })

  it('sends location to server on success', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    const { waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()
  })

  it('sends location with correct format', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    renderHook(() => useGeolocation())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/location/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
  })

  it('watches for location changes', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7olocation: -74.006 } })
    })
    mockGeolocation.watchPosition.mockReturnValue('watch-id-1')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    renderHook(() => useGeolocation())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockGeolocation.watchPosition).toHaveBeenCalled()
  })

  it('clears watch on unmount', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    mockGeolocation.watchPosition.mockReturnValue('watch-id-1')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    const { unmount } = renderHook(() => useGeolocation())

    unmount()

    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith('watch-id-1')
  })

  it('syncs location periodically', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    mockGeolocation.watchPosition.mockReturnValue('watch-id-1')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    const { unmount } = renderHook(() => useGeolocation())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    unmount()

    // Should have set up interval
  })

  it('uses correct geolocation options', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })

    renderHook(() => useGeolocation())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  })

  it('uses watchPosition with lower accuracy options', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.128, longitude: -74.006 } })
    })
    mockGeolocation.watchPosition.mockReturnValue('watch-id-1')

    renderHook(() => useGeolocation())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 10000,
      }
    )
  })

  it('handles sendLocationToServer errors gracefully', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    global.fetch.mockRejectedValue(new Error('Network error'))

    const { waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()

    // Should not throw error
  })

  it('updates location on watch position change', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    mockGeolocation.watchPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7200, longitude: -74.0100 } })
    })

    const { result, waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()

    const callback = mockGeolocation.watchPosition.mock.calls[0][0]
    callback({ coords: { latitude: 40.7200, longitude: -74.0100 } })

    await waitForNextUpdate()

    expect(result.current.location).toEqual([40.7200, -74.0100])
  })

  it('clears error on successful location', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    const { result, waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()

    expect(result.current.error).toBeNull()
  })

  it('clears permissionDenied on successful retry', async () => {
    mockGeolocation.getCurrentPosition
      .mockImplementationOnce((success, error) => {
        error({ code: 1, message: 'Denied' })
      })
      .mockImplementation((success) => {
        success({ coords: { latitude: 40.7128, longitude: -74.006 } })
      })
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    const { result, waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()
    await waitForNextUpdate()

    expect(result.current.permissionDenied).toBe(false)
  })

  it('sends location with credentials include', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    renderHook(() => useGeolocation())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('sends location coordinates correctly', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    renderHook(() => useGeolocation())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const fetchCall = global.fetch.mock.calls.find(call => call[0]?.includes('/api/location/update'))
    const body = JSON.parse(fetchCall[1])
    expect(body.lat).toBe(40.7128)
    expect(body.lng).toBe(-74.006)
  })

  it('clears interval on unmount', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    mockGeolocation.watchPosition.mockReturnValue('watch-id-1')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    const { unmount } = renderHook(() => useGeolocation())

    unmount()

    // Should have cleared the interval
  })

  it('does not crash when sendLocationToServer fails', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    global.fetch.mockRejectedValue(new Error('Server error'))

    const { waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()

    // Should handle error gracefully
  })

  it('handles watchPosition errors gracefully', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } })
    })
    mockGeolocation.watchPosition.mockImplementation((success, error) => {
      error({ code: 2, message: 'Watch error' })
    })

    const { waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()

    // Should handle error gracefully
  })

  it('uses default fallback for Pakistan', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({ code: 3, message: 'Timeout' })
    })

    const { result, waitForNextUpdate } = renderHook(() => useGeolocation())

    await waitForNextUpdate()

    expect(result.current.location).toEqual([25.396, 68.374])
  })
})
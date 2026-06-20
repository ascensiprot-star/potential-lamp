import { render } from '@testing-library/react'
import { vi } from 'vitest'

// Custom render function with context providers
export function renderWithProviders(ui, { providerProps = {}, ...renderOptions } = {}) {
  // This will be expanded based on actual context providers in the app
  return render(ui, renderOptions)
}

// Mock user data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer',
  created_at: '2024-01-01T00:00:00Z',
}

// Mock provider data
export const mockProvider = {
  id: 'provider-123',
  user_id: 'user-123',
  business_name: 'Test Business',
  category: 'cleaning',
  rating: 4.5,
  review_count: 100,
  verified: true,
  location: {
    lat: 40.7128,
    lng: -74.0060,
    address: '123 Test St, New York, NY',
  },
  services: ['service-1', 'service-2'],
  availability: ['monday', 'tuesday', 'wednesday'],
  created_at: '2024-01-01T00:00:00Z',
}

// Mock service data
export const mockService = {
  id: 'service-123',
  provider_id: 'provider-123',
  category_id: 'category-123',
  name: 'Test Service',
  description: 'A test service description',
  price: 50,
  duration: 60,
  image_url: 'https://example.com/image.jpg',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
}

// Mock booking data
export const mockBooking = {
  id: 'booking-123',
  customer_id: 'user-123',
  provider_id: 'provider-123',
  service_id: 'service-123',
  status: 'confirmed',
  scheduled_date: '2024-12-01T10:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
}

// Mock notification data
export const mockNotification = {
  id: 'notification-123',
  user_id: 'user-123',
  type: 'booking_confirmed',
  title: 'Booking Confirmed',
  message: 'Your booking has been confirmed',
  read: false,
  created_at: '2024-01-01T00:00:00Z',
}

// Mock chat message data
export const mockChatMessage = {
  id: 'message-123',
  conversation_id: 'conversation-123',
  sender_id: 'user-123',
  message: 'Hello',
  created_at: '2024-01-01T00:00:00Z',
}

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        data: null,
        error: null,
      })),
      data: [],
      error: null,
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
      data: null,
      error: null,
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
}

// Mock fetch
export const mockFetch = vi.fn()

// Mock router
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
}

// Wait for async operations
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Mock API responses
export const mockApiResponse = (data, error = null) => ({
  data,
  error,
})

// Mock error response
export const mockErrorResponse = (message, status = 500) => ({
  error: {
    message,
    status,
  },
})

// Mock success response
export const mockSuccessResponse = (data) => ({
  data,
  error: null,
})
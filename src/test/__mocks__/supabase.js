import { vi } from 'vitest'

export const createClient = vi.fn(() => ({
  auth: {
    getUser: vi.fn(() => ({ data: { user: null }, error: null })),
    signInWithPassword: vi.fn(() => ({ data: null, error: null })),
    signUp: vi.fn(() => ({ data: null, error: null })),
    signOut: vi.fn(() => ({ error: null })),
    getSession: vi.fn(() => ({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
        data: [],
        error: null,
      })),
      order: vi.fn(() => ({
        data: [],
        error: null,
      })),
      limit: vi.fn(() => ({
        data: [],
        error: null,
      })),
      data: [],
      error: null,
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
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
  realtime: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({ subscription: { unsubscribe: vi.fn() } })),
      })),
    })),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => ({ data: null, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' }, error: null })),
      remove: vi.fn(() => ({ data: null, error: null })),
    })),
  },
}))
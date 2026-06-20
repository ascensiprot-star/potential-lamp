import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasRealCreds = supabaseUrl && supabaseAnonKey
    && !supabaseUrl.includes('placeholder')
    && supabaseUrl.startsWith('https://');

const noop = () => {};

const stubChannel = {
    on: function() { return this; },
    subscribe: function(cb) { if (cb) setTimeout(() => cb('CHANNEL_ERROR'), 0); return this; },
};

const stubClient = {
    from: (_table) => ({
        select: (_cols) => ({
            eq: (_c, _v) => ({
                limit: (_n) => Promise.resolve({ data: [], error: null }),
                order: (_c, _o) => ({ limit: (_n) => Promise.resolve({ data: [], error: null }), data: [], error: null }),
                single: () => Promise.resolve({ data: null, error: null }),
                data: [], error: null,
            }),
            order: (_c, _o) => ({
                limit: (_n) => Promise.resolve({ data: [], error: null }),
                eq: (_c, _v) => Promise.resolve({ data: [], error: null }),
                data: [], error: null,
            }),
            limit: (_n) => Promise.resolve({ data: [], error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
            then: (cb) => Promise.resolve({ data: [], error: null }).then(cb),
            catch: (cb) => Promise.resolve({ data: [], error: null }),
        }),
        insert: (_rows) => Promise.resolve({ data: null, error: null }),
        update: (_vals) => ({
            eq: (_c, _v) => Promise.resolve({ data: null, error: null }),
        }),
        delete: () => ({
            eq: (_c, _v) => Promise.resolve({ data: null, error: null }),
        }),
        upsert: (_rows) => Promise.resolve({ data: null, error: null }),
        count: () => Promise.resolve({ count: 0, error: null }),
    }),
    channel: (_name) => stubChannel,
    removeChannel: noop,
    auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: (_cb) => ({ data: { subscription: { unsubscribe: noop } } }),
        signOut: () => Promise.resolve({ error: null }),
        signInWithPassword: () => Promise.resolve({ error: { message: 'Use the app login form' } }),
        signUp: () => Promise.resolve({ error: { message: 'Use the app signup form' } }),
        signInWithOAuth: () => Promise.resolve({ error: { message: 'OAuth not available in this environment' } }),
    },
    storage: {
        from: (_bucket) => ({
            upload: (_path, _file, _opts) => Promise.resolve({ data: null, error: null }),
            getPublicUrl: (_path) => ({ data: { publicUrl: '' } }),
            remove: (_paths) => Promise.resolve({ data: null, error: null }),
        }),
    },
};

export const supabase = hasRealCreds
    ? createClient(supabaseUrl, supabaseAnonKey)
    : stubClient;

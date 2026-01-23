// Public Supabase client for unauthenticated access (share links, public pages)
// This client does NOT persist sessions and is safe for incognito/public access
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Public client with NO session persistence - safe for incognito/public routes
export const publicSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? {
      getItem: () => null, // Never return a session
      setItem: () => {}, // Never store a session
      removeItem: () => {}, // Never remove a session
    } : undefined,
    persistSession: false, // Don't persist sessions
    autoRefreshToken: false, // Don't try to refresh tokens
    detectSessionInUrl: false, // Don't detect sessions in URL
  },
  global: {
    headers: {
      // Explicitly use anon role
      'apikey': SUPABASE_PUBLISHABLE_KEY,
    }
  }
});

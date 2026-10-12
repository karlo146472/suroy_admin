import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env.local file.')
}

/**
 * The one Supabase client for the dashboard. It uses the public anon key, so every request is limited by
 * row-level security: only a signed-in "Tourism Administrator" (see is_admin() in the database) can change data.
 * The browser keeps the session in localStorage, which is Supabase's default.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Administrators sign in with a password, never from a link, so the client doesn't read sign-in links from the
  // address. The traveler pages that open from an email link (src/pages/ResetPassword.tsx) read their own link.
  auth: { detectSessionInUrl: false },
})

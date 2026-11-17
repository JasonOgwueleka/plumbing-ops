// Creates the single Supabase client used by the whole app.
// It uses the PUBLIC anon key. All data access is protected by the
// Row Level Security policies in supabase/migrations.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill it in.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

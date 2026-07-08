import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
  console.warn("Supabase VITE_SUPABASE_URL is using the default placeholder. Please update your .env file with real credentials.")
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

import { createClient } from '@supabase/supabase-js'
import type { CategoryRow, Database, ProductRow } from './supabase-types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Follow the setup steps in README.md.')
  }
  return supabase
}

export type { CategoryRow, ProductRow }

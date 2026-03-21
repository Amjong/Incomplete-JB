import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { getSupabaseClient } from './client'

export async function getCurrentSession() {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) {
    throw error
  }

  return data.session
}

export function subscribeToAuthChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return getSupabaseClient().auth.onAuthStateChange(callback)
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data.session
}

export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data.session
}

export async function signOutCurrentUser() {
  const { error } = await getSupabaseClient().auth.signOut()
  if (error) {
    throw error
  }
}

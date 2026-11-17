// Keeps track of the logged-in user and their profile (which holds the role).
// Any component can call useAuth() to get { session, profile, loading, signOut }.
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  // 1. Load the current session, and listen for login/logout.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // 2. Whenever the logged-in user changes, load their profile.
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || !data.is_active) {
          // No profile visible = deactivated (RLS hides everything from them).
          setAuthError('Your account is not active. Please contact the owner.')
          supabase.auth.signOut()
          setProfile(null)
        } else {
          setAuthError('')
          setProfile(data)
        }
        setLoading(false)
      })
  }, [userId])

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = { session, profile, loading, authError, signOut }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

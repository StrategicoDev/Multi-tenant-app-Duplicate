import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { User, UserRole, Tenant } from '../types/auth'

interface AuthContextType {
  user: User | null
  tenant: Tenant | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role?: UserRole, tenantName?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        fetchUserProfile(session.user)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes (including email verification)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      console.log('🔐 Auth event:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          console.log('✅ User authenticated:', session.user.email)
          fetchUserProfile(session.user)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setTenant(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', supabaseUser.id)
        .single()

      if (error) throw error

      setUser({
        id: supabaseUser.id,
        tenant_id: data.tenant_id,
        email: supabaseUser.email!,
        role: data.role || 'member',
        created_at: data.created_at,
      })

      if (data.tenants) {
        setTenant(data.tenants)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔑 AuthContext.signIn called with:', { email })
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('Supabase signIn response:', { 
        user: data.user?.email, 
        session: !!data.session,
        error 
      })
      
      if (error) {
        console.error('❌ Supabase signIn error:', error)
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          code: error.code || error.name,
        })
        throw error
      }
      
      console.log('✅ SignIn successful for:', data.user?.email)
    } catch (err) {
      console.error('❌ Exception in signIn:', err)
      throw err
    }
  }

  const signUp = async (email: string, password: string, role: UserRole = 'member', tenantName?: string) => {
    console.log('📧 AuthContext.signUp called with:', { email, role, tenantName })
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            role,
            tenant_name: tenantName || `${email}'s Organization`,
          },
        },
      })
      
      console.log('Supabase signUp response:', { data, error })
      
      if (error) {
        console.error('❌ Supabase auth error:', error)
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          code: error.code || error.name,
          fullError: error,
        })
        
        // Provide user-friendly error messages
        if (error.status === 429) {
          throw new Error('Too many signup attempts. Please wait a few minutes and try again.')
        }
        
        throw error
      }
      
      console.log('✅ Supabase signUp successful, user data:', data.user)
    } catch (err) {
      console.error('❌ Exception in signUp:', err)
      throw err
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

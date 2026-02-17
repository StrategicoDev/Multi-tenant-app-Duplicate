import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function VerifyEmail() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Check for recovery type FIRST before any async operations
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')
    
    // Immediately redirect recovery to reset-password page
    if (type === 'recovery') {
      console.log('🔑 Recovery type detected, redirecting...')
      // Use replace to prevent back button loop
      navigate('/reset-password' + window.location.hash, { replace: true })
      return
    }
    
    // Only handle email verification if not recovery
    handleEmailVerification()
  }, [navigate])

  const handleEmailVerification = async () => {
    try {
      console.log('🔍 Full URL:', window.location.href)
      console.log('🔍 Hash:', window.location.hash)
      
      // Supabase uses hash fragments for auth tokens
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')
      const error_code = hashParams.get('error_code')
      const error_description = hashParams.get('error_description')

      console.log('📦 Parsed params:', { 
        hasAccessToken: !!access_token, 
        hasRefreshToken: !!refresh_token, 
        error_code,
        error_description 
      })

      // Check for errors in URL
      if (error_code || error_description) {
        console.error('❌ Error in URL:', error_description)
        setErrorMessage(error_description || 'Verification failed')
        setStatus('error')
        return
      }

      // If we have tokens from email verification (signup)
      if (access_token && refresh_token) {
        console.log('✅ Tokens found, setting session...')
        
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token
        })

        if (error) {
          console.error('❌ Error setting session:', error)
          setErrorMessage(error.message)
          setStatus('error')
          return
        }

        console.log('✅ Session set! User:', data.user?.email)
        console.log('✅ Email confirmed at:', data.user?.email_confirmed_at)
        
        setStatus('success')
        
        // Wait a moment then redirect to dashboard
        setTimeout(() => {
          console.log('🚀 Redirecting to dashboard...')
          navigate('/dashboard', { replace: true })
        }, 1500)
        
      } else {
        console.warn('⚠️ No tokens in URL')
        setErrorMessage('Invalid verification link - no authentication tokens found')
        setStatus('error')
      }
    } catch (err: any) {
      console.error('❌ Exception during verification:', err)
      setErrorMessage(err.message || 'An unexpected error occurred')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-16 w-16 object-contain"
          />
        </div>

        {status === 'verifying' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-md bg-green-50 p-4">
            <h3 className="text-lg font-medium text-green-800 mb-2">
              ✅ Email verified successfully!
            </h3>
            <p className="text-sm text-green-700 mb-2">
              Your email has been verified and you're now logged in.
            </p>
            <p className="text-sm text-green-600">
              Redirecting to dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md bg-red-50 p-4">
            <h3 className="text-lg font-medium text-red-800 mb-2">
              ❌ Verification failed
            </h3>
            <p className="text-sm text-red-700 mb-4">
              {errorMessage || 'The verification link is invalid or has expired.'}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/register')}
                className="btn-primary w-full"
              >
                Register again
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn-link w-full text-sm"
              >
                Go to login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

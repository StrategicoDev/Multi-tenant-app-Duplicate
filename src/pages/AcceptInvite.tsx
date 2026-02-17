import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Invitation } from '../types/auth'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    fetchInvitation()
  }, [token])

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, tenants(name)')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (error) throw error

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired')
        setLoading(false)
        return
      }

      setInvitation(data)
    } catch (error: any) {
      console.error('Error fetching invitation:', error)
      setError('Invalid or expired invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!invitation) return

    setAccepting(true)

    try {
      // Sign up the user
      const { error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            role: invitation.role,
            tenant_id: invitation.tenant_id,
          },
        },
      })

      if (signUpError) throw signUpError

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id)

      if (updateError) console.error('Error updating invitation:', updateError)

      // Show success message
      alert('Account created! Please check your email to verify your account.')
      navigate('/login')
    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      setError(error.message || 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-md bg-red-50 p-4">
            <h3 className="text-lg font-medium text-red-800 mb-2">Invalid Invitation</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <Link
            to="/login"
            className="btn-primary w-full flex justify-center"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Invitation not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-16 w-16 object-contain"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Accept Invitation
          </h2>
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-900">
              You've been invited to join <strong>{(invitation as any).tenants?.name}</strong> as a <strong className="capitalize">{invitation.role}</strong>
            </p>
            <p className="text-sm text-blue-800 mt-2">
              Email: <strong>{invitation.email}</strong>
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAcceptInvite}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Set Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={accepting}
              className="btn-primary w-full flex justify-center"
            >
              {accepting ? 'Creating Account...' : 'Accept & Create Account'}
            </button>
          </div>

          <div className="text-center text-sm">
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

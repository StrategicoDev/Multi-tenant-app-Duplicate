import { useState, FormEvent, ChangeEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types/auth'
import { supabase } from '../lib/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<UserRole>('member') // Default to member
  const [tenantName, setTenantName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checkingTenant, setCheckingTenant] = useState(true)
  const [tenantExists, setTenantExists] = useState(false)
  const [existingTenantName, setExistingTenantName] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  // Check if tenant exists on component mount
  useEffect(() => {
    checkTenantExistence()
  }, [])

  const checkTenantExistence = async () => {
    try {
      console.log('🔍 Checking if tenant exists...')
      const { data, error } = await supabase.rpc('check_tenant_exists')
      
      if (error) {
        console.error('Error checking tenant:', error)
        return
      }
      
      console.log('Tenant check result:', data)
      
      if (data && data.length > 0) {
        const result = data[0]
        setTenantExists(result.tenant_exists)
        setExistingTenantName(result.tenant_name || '')
        
        if (result.tenant_exists) {
          console.log('✅ Tenant exists:', result.tenant_name)
          setRole('member') // Default to member for additional users
        } else {
          console.log('✅ No tenant exists - first user will be owner')
          setRole('owner') // First user is owner
        }
      }
    } catch (err) {
      console.error('Exception checking tenant:', err)
    } finally {
      setCheckingTenant(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    console.log('🚀 Registration started')
    console.log('Registration details:', { email, role, tenantName })
    
    setError('')
    setLoading(true)

    if (password !== confirmPassword) {
      console.error('❌ Validation failed: Passwords do not match')
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      console.error('❌ Validation failed: Password too short')
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    console.log('✅ Validation passed, calling signUp...')
    try {
      await signUp(email, password, role, tenantName || undefined)
      console.log('✅ Registration successful!')
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      console.error('❌ Registration error:', err)
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        code: err.code,
        fullError: JSON.stringify(err, null, 2)
      })
      
      // Check for rate limiting
      if (err.message?.includes('429') || err.message?.includes('rate limit') || err.message?.toLowerCase().includes('too many requests')) {
        setError('Too many signup attempts. Please wait a few minutes and try again.')
      } 
      // Generic error
      else {
        setError(err.message || 'Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="rounded-md bg-green-50 p-4">
            <h3 className="text-lg font-medium text-green-800 mb-2">
              Registration successful!
            </h3>
            <p className="text-sm text-green-700 mb-2">
              Your account has been created{tenantExists ? ` and you've been added to ${existingTenantName}` : ' as the organization owner'}.
            </p>
            <p className="text-sm text-green-700 mb-4">
              Please check your email for a verification link. Once you click the link, you'll be automatically logged in and redirected to your dashboard.
            </p>
            <p className="text-sm text-green-600">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (checkingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {tenantExists ? `Join ${existingTenantName}` : 'Create your account'}
          </h2>
          {tenantExists && (
            <p className="mt-2 text-center text-sm text-gray-600">
              You're signing up to join an existing organization
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            {!tenantExists && (
              <div>
                <label htmlFor="tenant-name" className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <input
                  id="tenant-name"
                  name="tenant-name"
                  type="text"
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="My Organization"
                  value={tenantName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTenantName(e.target.value)}
                />
              </div>
            )}

            {tenantExists && (
              <div>
                <label htmlFor="existing-tenant" className="block text-sm font-medium text-gray-700">
                  Organization
                </label>
                <input
                  id="existing-tenant"
                  name="existing-tenant"
                  type="text"
                  disabled
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600 sm:text-sm"
                  value={existingTenantName}
                />
                <p className="mt-1 text-xs text-gray-500">
                  You will be added to this existing organization
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-600"
                value={role}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setRole(e.target.value as UserRole)}
                disabled={!tenantExists}
              >
                {!tenantExists ? (
                  <option value="owner">Owner (First User)</option>
                ) : (
                  <>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </>
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {!tenantExists 
                  ? 'Note: The first user automatically becomes the Owner and creates the organization.'
                  : 'Select your role. Additional owners cannot be created during signup.'}
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState, FormEvent, ChangeEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    console.log('🚀 Registration started')
    console.log('Registration details:', { email, tenantName })
    
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

    if (!tenantName || tenantName.trim() === '') {
      console.error('❌ Validation failed: Organization name required')
      setError('Organization name is required')
      setLoading(false)
      return
    }

    // Check if email domain already has an organization
    try {
      console.log('🔍 Checking if email domain already has an organization...')
      const { data: domainCheck, error: domainError } = await supabase.rpc('check_domain_has_organization', {
        user_email: email
      })

      if (domainError) {
        console.error('Error checking domain:', domainError)
        // Continue with registration if check fails (fail open)
      } else if (domainCheck && domainCheck.length > 0 && domainCheck[0].has_organization) {
        const { tenant_name, owner_email } = domainCheck[0]
        console.error('❌ Domain already has organization:', tenant_name)
        setError(
          `An organization with your email domain already exists${tenant_name ? ` (${tenant_name})` : ''}. ` +
          `Please contact your organization owner${owner_email ? ` (${owner_email})` : ''} for an invitation.`
        )
        setLoading(false)
        return
      }
    } catch (domainCheckErr) {
      console.error('Exception checking domain:', domainCheckErr)
      // Continue with registration if check fails (fail open)
    }

    console.log('✅ Validation passed, calling signUp...')
    try {
      // Always register as owner with tenant name for new tenants
      await signUp(email, password, 'owner', tenantName)
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
              Your organization "{tenantName}" has been created and you are the owner.
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
          <h1 className="text-center text-3xl font-bold text-gray-900 mb-2">
            Multi-Tenant-App
          </h1>
          <p className="text-center text-gray-900 mb-2">
            Create your organization
          </p>
          <p className="text-center text-sm text-gray-600">
            Start your own organization and invite team members
          </p>
          <p className="text-center text-xs text-gray-500">
            Already have an invitation? Check your email for the invite link
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="tenant-name" className="block text-sm font-medium text-gray-700">
                Organization Name *
              </label>
              <input
                id="tenant-name"
                name="tenant-name"
                type="text"
                required
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="My Organization"
                value={tenantName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTenantName(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                You will be the owner of this organization
              </p>
            </div>

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
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Note:</strong> You will be the owner of "{tenantName || 'your organization'}". 
              After registration, you can invite team members as admins or members.
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex justify-center"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link
              to="/login"
              className="btn-link"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'

function AuthCallbackHandler() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Don't redirect if already on verify-email or reset-password pages
    if (location.pathname === '/verify-email' || location.pathname === '/reset-password') {
      return
    }
    
    // If landing on any OTHER page with verification tokens, redirect to verify-email
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      console.log('🔗 Verification tokens detected, redirecting to /verify-email')
      navigate('/verify-email' + hash, { replace: true })
    }
  }, [location, navigate])

  return null
}

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthCallbackHandler />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

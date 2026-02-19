import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import { useAuth } from '@/hooks/useAuth'

// Lazy-loaded pages
const Home = lazy(() => import('@/pages/Home'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const Features = lazy(() => import('@/pages/Features'))
const HowItWorks = lazy(() => import('@/pages/HowItWorks'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Learn = lazy(() => import('@/pages/Learn'))
const Contact = lazy(() => import('@/pages/Contact'))
const Blog = lazy(() => import('@/pages/Blog'))
const BlogPost = lazy(() => import('@/pages/BlogPost'))
const UserDashboard = lazy(() => import('@/pages/UserDashboard'))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-surface-base)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-sans)',
    }}>
      Loading...
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}

function AppRedirect() {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (profile?.account_type === 'admin') {
    return <Navigate to={`/admin/${profile.id}`} replace />
  }

  return <Navigate to={`/dashboard/${profile?.id || ''}`} replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/features" element={<Features />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          {/* App redirect */}
          <Route path="/app" element={
            <ProtectedRoute><AppRedirect /></ProtectedRoute>
          } />

          {/* User dashboard */}
          <Route path="/dashboard/:userId/*" element={
            <ProtectedRoute><UserDashboard /></ProtectedRoute>
          } />

          {/* Admin dashboard */}
          <Route path="/admin/:userId/*" element={
            <AdminRoute><AdminDashboard /></AdminRoute>
          } />

          {/* Preview routes (no auth required — remove after Supabase setup) */}
          <Route path="/preview/dashboard" element={<UserDashboard />} />
          <Route path="/preview/admin" element={<AdminDashboard />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ThemeProvider>
  )
}

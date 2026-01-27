import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { StoreProvider } from '@/providers/store-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { NetworkProvider } from '@/providers/network-provider'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppShell } from '@/components/layout/app-shell'
import { ErrorBoundary } from '@/components/error-boundary'
import { Loader2 } from 'lucide-react'

// Lazy load pages for code splitting
const SignIn = lazy(() =>
  import('@/pages/auth/sign-in').then((m) => ({ default: m.SignIn }))
)
const SignUp = lazy(() =>
  import('@/pages/auth/sign-up').then((m) => ({ default: m.SignUp }))
)
const ForgotPassword = lazy(() =>
  import('@/pages/auth/forgot-password').then((m) => ({ default: m.ForgotPassword }))
)
const ResetPassword = lazy(() =>
  import('@/pages/auth/reset-password').then((m) => ({ default: m.ResetPassword }))
)
const NewStore = lazy(() =>
  import('@/pages/stores/new').then((m) => ({ default: m.NewStore }))
)
const Dashboard = lazy(() =>
  import('@/pages/dashboard').then((m) => ({ default: m.Dashboard }))
)
const Settings = lazy(() =>
  import('@/pages/settings').then((m) => ({ default: m.Settings }))
)

function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth Routes */}
        <Route path="/auth/sign-in" element={<SignIn />} />
        <Route path="/auth/sign-up" element={<SignUp />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Store creation (outside AppShell for first-time users) */}
          <Route path="/stores/new" element={<NewStore />} />

          {/* Main App with Store Context */}
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <BrowserRouter>
          <QueryProvider>
            <AuthProvider>
              <StoreProvider>
                <NetworkProvider>
                  <AppRoutes />
                  <Toaster position="bottom-right" richColors closeButton />
                </NetworkProvider>
              </StoreProvider>
            </AuthProvider>
          </QueryProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

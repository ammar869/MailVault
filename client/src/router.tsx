import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'
import { useMe } from './hooks/useAuth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken, user } = useAuthStore()
  const { mutate: fetchMe } = useMe()

  useEffect(() => {
    if (isAuthenticated && accessToken && !user) {
      fetchMe()
    }
  }, [isAuthenticated, accessToken, user, fetchMe])

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'inboxes/:inboxId', element: <InboxDetailPage /> },
      { path: 'aliases', element: <AliasesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicOnlyRoute>
        <RegisterPage />
      </PublicOnlyRoute>
    ),
  },
])

// Lazy imports to avoid circular deps
import { MainLayout } from './layouts/MainLayout'
import { DashboardPage } from './pages/DashboardPage'
import { InboxDetailPage } from './pages/InboxDetailPage'
import { AliasesPage } from './pages/AliasesPage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'

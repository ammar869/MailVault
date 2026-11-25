import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'

interface AuthResponse {
  user: {
    id: string
    email: string
    name: string | null
    createdAt: string
  }
  accessToken: string
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth)
  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name?: string }) =>
      api.auth.register(email, password, name),
    onSuccess: (data: AuthResponse) => {
      setAuth(data.user, data.accessToken)
    },
  })
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.auth.login(email, password),
    onSuccess: (data: AuthResponse) => {
      setAuth(data.user, data.accessToken)
    },
  })
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      clearAuth()
    },
  })
}

export function useMe() {
  const { isAuthenticated, accessToken, setAuth } = useAuthStore()
  
  return useMutation({
    mutationFn: () => api.auth.me(),
    onSuccess: (data: { user: AuthResponse['user'] }) => {
      setAuth(data.user, accessToken!)
    },
    onError: () => {
      useAuthStore.getState().clearAuth()
    },
    enabled: isAuthenticated && !!accessToken,
  })
}
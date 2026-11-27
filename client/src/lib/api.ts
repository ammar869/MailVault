import { useAuthStore } from '../stores/authStore'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function apiUrl(path: string) {
  const prefix = API_BASE.endsWith('/api/v1') ? API_BASE : `${API_BASE}/api/v1`
  return `${prefix}${path}`
}

let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const currentAuth = useAuthStore.getState()
  if (!currentAuth.isAuthenticated || !currentAuth.accessToken) return null
  if (!refreshInFlight) {
    refreshInFlight = fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }).then(async (response) => {
      if (!response.ok) return null
      const body = await response.json() as { data?: { accessToken?: string } }
      const token = body.data?.accessToken
      const latest = useAuthStore.getState()
      if (!token || !latest.user) return null
      latest.setAuth(latest.user, token)
      return token
    }).catch(() => null).finally(() => {
      refreshInFlight = null
    })
  }
  const token = await refreshInFlight
  if (!token) useAuthStore.getState().clearAuth()
  return token
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const send = (token: string | null) => fetch(apiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
    })
  let res = await send(useAuthStore.getState().accessToken)
  if (res.status === 401 && !['/auth/refresh', '/auth/login', '/auth/register'].includes(path)) {
    const token = await refreshAccessToken()
    if (token) res = await send(token)
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.error?.message || error.message || 'Request failed')
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}

export const api = {
  auth: {
    register: (email: string, password: string, name?: string) =>
      request<{ data: { user: any; accessToken: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }).then((response) => response.data),
    login: (email: string, password: string) =>
      request<{ data: { user: any; accessToken: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }).then((response) => response.data),
    logout: () =>
      request<void>('/auth/logout', { method: 'POST' }),
    me: () =>
      request<{ data: { user: any } }>('/auth/me').then((response) => response.data),
    updateProfile: (name: string) =>
      request<{ data: { user: any } }>('/auth/me', { method: 'PATCH', body: JSON.stringify({ name }) }).then((response) => response.data),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<void>('/auth/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) }),
    revokeSessions: () =>
      request<void>('/auth/sessions/revoke', { method: 'POST' }),
    refresh: () =>
      request<{ data: { accessToken: string } }>('/auth/refresh', { method: 'POST' }).then((response) => response.data),
  },

  inboxes: {
    list: (params?: { isActive?: boolean; limit?: number; offset?: number }) => {
      const search = new URLSearchParams()
      if (params?.isActive !== undefined) search.set('isActive', String(params.isActive))
      if (params?.limit) search.set('limit', String(params.limit))
      if (params?.offset) search.set('offset', String(params.offset))
      return request<{ data: any[]; meta: any }>(`/inboxes?${search}`)
    },
    create: (localPart: string, domain: string, capacity?: number, ttlDays?: number) =>
      request<{ data: any }>('/inboxes', {
        method: 'POST',
        body: JSON.stringify({ localPart, domain, capacity, ttlDays }),
      }).then((response) => response.data),
    get: (id: string) =>
      request<{ data: any }>(`/inboxes/${id}`).then((response) => response.data),
    update: (id: string, data: { capacity?: number; ttlDays?: number; isActive?: boolean }) =>
      request<{ data: any }>(`/inboxes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then((response) => response.data),
    delete: (id: string) =>
      request<void>(`/inboxes/${id}`, { method: 'DELETE' }),
  },

  aliases: {
    list: (params?: { isActive?: boolean; targetInboxId?: string; limit?: number; offset?: number }) => {
      const search = new URLSearchParams()
      if (params?.isActive !== undefined) search.set('isActive', String(params.isActive))
      if (params?.targetInboxId) search.set('targetInboxId', params.targetInboxId)
      if (params?.limit) search.set('limit', String(params.limit))
      if (params?.offset) search.set('offset', String(params.offset))
      return request<{ data: any[]; meta: any }>(`/aliases?${search}`)
    },
    create: (localPart: string, domain: string, targetInboxId: string, expiresAt?: string, isActive?: boolean) =>
      request<{ data: any }>('/aliases', {
        method: 'POST',
        body: JSON.stringify({ localPart, domain, targetInboxId, expiresAt, isActive }),
      }).then((response) => response.data),
    get: (id: string) =>
      request<{ data: any }>(`/aliases/${id}`).then((response) => response.data),
    update: (id: string, data: { targetInboxId?: string; isActive?: boolean; expiresAt?: string | null }) =>
      request<{ data: any }>(`/aliases/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then((response) => response.data),
    delete: (id: string) =>
      request<void>(`/aliases/${id}`, { method: 'DELETE' }),
  },

  apiKeys: {
    list: () => request<{ data: any[]; meta: any }>('/api-keys'),
    create: (name: string, scopes: string[]) =>
      request<{ data: any }>('/api-keys', { method: 'POST', body: JSON.stringify({ name, scopes }) })
        .then((response) => response.data),
    delete: (id: string) => request<void>(`/api-keys/${id}`, { method: 'DELETE' }),
  },

  webhooks: {
    list: () => request<{ data: any[]; meta: any }>('/webhooks'),
    create: (name: string, url: string, events: string[]) =>
      request<{ data: any }>('/webhooks', { method: 'POST', body: JSON.stringify({ name, url, events }) })
        .then((response) => response.data),
    delete: (id: string) => request<void>(`/webhooks/${id}`, { method: 'DELETE' }),
  },

  emails: {
    list: (params?: {
      inboxId?: string
      status?: string
      hasAttachment?: boolean
      from?: string
      to?: string
      subject?: string
      search?: string
      dateFrom?: string
      dateTo?: string
      limit?: number
      offset?: number
    }) => {
      const search = new URLSearchParams()
      if (params?.inboxId) search.set('inboxId', params.inboxId)
      if (params?.status) search.set('status', params.status)
      if (params?.hasAttachment !== undefined) search.set('hasAttachment', String(params.hasAttachment))
      if (params?.from) search.set('from', params.from)
      if (params?.to) search.set('to', params.to)
      if (params?.subject) search.set('subject', params.subject)
      if (params?.search) search.set('search', params.search)
      if (params?.dateFrom) search.set('dateFrom', params.dateFrom)
      if (params?.dateTo) search.set('dateTo', params.dateTo)
      if (params?.limit) search.set('limit', String(params.limit))
      if (params?.offset) search.set('offset', String(params.offset))
      return request<{ data: any[]; meta: any }>(`/emails?${search}`)
    },
    get: (id: string) =>
      request<{ data: { email: any; attachments: any[]; otpRecords: any[] } }>(`/emails/${id}`).then((response) => response.data),
    update: (id: string, status: string) =>
      request<{ data: any }>(`/emails/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }).then((response) => response.data),
    delete: (id: string) =>
      request<void>(`/emails/${id}`, { method: 'DELETE' }),
    getAttachmentUrl: (emailId: string, attachmentId: string) =>
      request<{ data: { url: string; filename: string; mimeType: string; size: number } }>(
        `/emails/${emailId}/attachments/${attachmentId}/url`
      ),
  },
}

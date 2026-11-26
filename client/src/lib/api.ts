const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function apiUrl(path: string) {
  const prefix = API_BASE.endsWith('/api/v1') ? API_BASE : `${API_BASE}/api/v1`
  return `${prefix}${path}`
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  })

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
      }),
    get: (id: string) =>
      request<{ data: any }>(`/inboxes/${id}`),
    update: (id: string, data: { capacity?: number; ttlDays?: number; isActive?: boolean }) =>
      request<{ data: any }>(`/inboxes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
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
      }),
    get: (id: string) =>
      request<{ data: any }>(`/aliases/${id}`),
    update: (id: string, data: { targetInboxId?: string; isActive?: boolean; expiresAt?: string | null }) =>
      request<{ data: any }>(`/aliases/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/aliases/${id}`, { method: 'DELETE' }),
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
      request<{ data: { email: any; attachments: any[]; otpRecords: any[] } }>(`/emails/${id}`),
    update: (id: string, status: string) =>
      request<{ data: any }>(`/emails/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) =>
      request<void>(`/emails/${id}`, { method: 'DELETE' }),
    getAttachmentUrl: (emailId: string, attachmentId: string) =>
      request<{ data: { url: string; filename: string; mimeType: string; size: number } }>(
        `/emails/${emailId}/attachments/${attachmentId}/url`
      ),
  },
}

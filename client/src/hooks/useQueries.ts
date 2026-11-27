import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface ApiResponse<T> {
  data: T
  meta?: Record<string, any>
}

interface Inbox {
  _id: string
  address: string
  capacity: number
  ttlDays: number
  expiresAt: string
  isActive: boolean
  usageCount: number
  createdAt: string
}

interface Alias {
  _id: string
  address: string
  targetInboxId: string
  isActive: boolean
  expiresAt: string | null
  usageCount: number
  createdAt: string
}

interface Email {
  _id: string
  messageId: string
  from: string
  to: string[]
  subject: string
  bodyText: string
  bodyHtml: string | null
  status: string
  hasAttachment: boolean
  receivedAt: string
  inboxId: string
  otpCodes: string[]
}

interface Attachment {
  _id: string
  filename: string
  mimeType: string
  size: number
  s3Bucket: string
  s3Key: string
}

interface OtpRecord {
  _id: string
  code: string
  context: string | null
  emailId: string
  createdAt: string
}

export function useInboxes(params?: { isActive?: boolean }) {
  return useQuery<ApiResponse<Inbox[]>, Error>({
    queryKey: ['inboxes', params],
    queryFn: () => api.inboxes.list(params),
    select: (res) => res.data,
  })
}

export function useInbox(id: string) {
  return useQuery<Inbox, Error>({
    queryKey: ['inbox', id],
    queryFn: () => api.inboxes.get(id),
    enabled: !!id,
  })
}

export function useCreateInbox() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ localPart, domain, capacity, ttlDays }: { localPart: string; domain: string; capacity?: number; ttlDays?: number }) =>
      api.inboxes.create(localPart, domain, capacity, ttlDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inboxes'] })
    },
  })
}

export function useUpdateInbox() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { capacity?: number; ttlDays?: number; isActive?: boolean } }) =>
      api.inboxes.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['inboxes'] })
      queryClient.invalidateQueries({ queryKey: ['inbox', id] })
    },
  })
}

export function useDeleteInbox() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.inboxes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inboxes'] })
    },
  })
}

export function useAliases(params?: { isActive?: boolean; targetInboxId?: string }) {
  return useQuery<ApiResponse<Alias[]>, Error>({
    queryKey: ['aliases', params],
    queryFn: () => api.aliases.list(params),
    select: (res) => res.data,
  })
}

export function useAlias(id: string) {
  return useQuery<Alias, Error>({
    queryKey: ['alias', id],
    queryFn: () => api.aliases.get(id),
    enabled: !!id,
  })
}

export function useCreateAlias() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ localPart, domain, targetInboxId, expiresAt, isActive }: {
      localPart: string
      domain: string
      targetInboxId: string
      expiresAt?: string
      isActive?: boolean
    }) => api.aliases.create(localPart, domain, targetInboxId, expiresAt, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliases'] })
    },
  })
}

export function useUpdateAlias() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { targetInboxId?: string; isActive?: boolean; expiresAt?: string | null } }) =>
      api.aliases.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['aliases'] })
      queryClient.invalidateQueries({ queryKey: ['alias', id] })
    },
  })
}

export function useDeleteAlias() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.aliases.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliases'] })
    },
  })
}

export function useEmails(params?: {
  inboxId?: string
  status?: string
  hasAttachment?: boolean
  search?: string
  limit?: number
  offset?: number
}) {
  return useQuery<ApiResponse<Email[]>, Error>({
    queryKey: ['emails', params],
    queryFn: () => api.emails.list(params),
    select: (res) => res.data,
  })
}

export function useEmail(id: string) {
  return useQuery<{ email: Email; attachments: Attachment[]; otpRecords: OtpRecord[] }, Error>({
    queryKey: ['email', id],
    queryFn: () => api.emails.get(id),
    enabled: !!id,
  })
}

export function useUpdateEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.emails.update(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      queryClient.invalidateQueries({ queryKey: ['email', id] })
    },
  })
}

export function useDeleteEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.emails.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    },
  })
}

export function useAttachmentUrl(emailId: string, attachmentId: string) {
  return useQuery<ApiResponse<{ url: string; filename: string; mimeType: string; size: number }>, Error>({
    queryKey: ['attachment-url', emailId, attachmentId],
    queryFn: () => api.emails.getAttachmentUrl(emailId, attachmentId),
    select: (res) => res.data,
    enabled: !!emailId && !!attachmentId,
  })
}

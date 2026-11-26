import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'

export interface EmailNewEvent {
  id: string
  messageId: string
  from: string
  subject: string
  receivedAt: string
  otpCodes: string[]
}

export interface EmailReadEvent {
  emailId: string
}

export interface EmailDeletedEvent {
  emailId: string
}

export interface OtpExtractedEvent {
  otp: {
    code: string
    context: string
    emailId: string
  }
}
export interface AICompletedEvent { emailId: string; status: string }

type EmailNewHandler = (event: EmailNewEvent) => void
type EmailReadHandler = (event: EmailReadEvent) => void
type EmailDeletedHandler = (event: EmailDeletedEvent) => void
type OtpExtractedHandler = (event: OtpExtractedEvent) => void
type AICompletedHandler = (event: AICompletedEvent) => void

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  onEmailNew: (handler: EmailNewHandler) => () => void
  onEmailRead: (handler: EmailReadHandler) => () => void
  onEmailDeleted: (handler: EmailDeletedHandler) => () => void
  onOtpExtracted: (handler: OtpExtractedHandler) => () => void
  onAICompleted: (handler: AICompletedHandler) => () => void
  joinInbox: (inboxId: string) => void
  leaveInbox: (inboxId: string) => void
  joinUser: () => void
  leaveUser: () => void
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { accessToken } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/api\/v1\/?$/, '')
    const newSocket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Socket connected')
    })

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false)
      console.log('Socket disconnected:', reason)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message)
    })

    newSocket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data)
    })

    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.close()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
    }
  }, [accessToken])

  const onEmailNew = useCallback((handler: EmailNewHandler) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('email.new', handler)
    return () => s.off('email.new', handler)
  }, [])

  const onEmailRead = useCallback((handler: EmailReadHandler) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('email.read', handler)
    return () => s.off('email.read', handler)
  }, [])

  const onEmailDeleted = useCallback((handler: EmailDeletedHandler) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('email.deleted', handler)
    return () => s.off('email.deleted', handler)
  }, [])

  const onOtpExtracted = useCallback((handler: OtpExtractedHandler) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('otp.extracted', handler)
    return () => s.off('otp.extracted', handler)
  }, [])

  const onAICompleted = useCallback((handler: AICompletedHandler) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('ai.completed', handler)
    return () => s.off('ai.completed', handler)
  }, [])

  const joinInbox = useCallback((inboxId: string) => {
    socketRef.current?.emit('join:inbox', inboxId)
  }, [])

  const leaveInbox = useCallback((inboxId: string) => {
    socketRef.current?.emit('leave:inbox', inboxId)
  }, [])

  const joinUser = useCallback(() => {
    socketRef.current?.emit('join:user')
  }, [])

  const leaveUser = useCallback(() => {
    socketRef.current?.emit('leave:user')
  }, [])

  return {
    socket,
    isConnected,
    onEmailNew,
    onEmailRead,
    onEmailDeleted,
    onOtpExtracted,
    onAICompleted,
    joinInbox,
    leaveInbox,
    joinUser,
    leaveUser,
  }
}

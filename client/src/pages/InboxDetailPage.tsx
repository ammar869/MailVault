import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEmails, useEmail, useUpdateEmail, useDeleteEmail } from '../hooks/useQueries'
import { useSocket } from '../hooks/useSocket'
import { EmailList, EmailViewer, OtpDisplay } from '../components/emails'
import { Mail, ArrowLeft, RefreshCw, Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { clsx } from 'clsx'

function StatusBadge({ status }: { status: string }) {
  const styles = {
    new: 'bg-blue-100 text-blue-800',
    read: 'bg-gray-100 text-gray-600',
    archived: 'bg-green-100 text-green-800',
    deleted: 'bg-red-100 text-red-800',
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-600')}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function InboxDetailPage() {
  const { inboxId } = useParams()
  const navigate = useNavigate()
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'list' | 'split' | 'detail'>('split')

  const { data: emails, isLoading, refetch } = useEmails({ inboxId, limit: 50 })
  const { data: emailData, isLoading: emailLoading, refetch: refetchEmail } = useEmail(selectedEmail?.id || '')
  const updateEmail = useUpdateEmail()
  const deleteEmail = useDeleteEmail()

  const { isConnected, onEmailNew, onEmailRead, onEmailDeleted, onAICompleted, joinInbox, leaveInbox, joinUser, leaveUser } = useSocket()

  // Socket.IO real-time integration
  useEffect(() => {
    if (inboxId) {
      joinInbox(inboxId)
      joinUser()
    }
    return () => {
      if (inboxId) {
        leaveInbox(inboxId)
        leaveUser()
      }
    }
  }, [inboxId, joinInbox, leaveInbox, joinUser, leaveUser])

  useEffect(() => {
    const unsubscribe = onEmailNew((event) => {
      // New email received - refetch list
      refetch()
      // Optionally auto-select if in list view
      if (!selectedEmail) {
        // The list will update automatically via refetch
      }
    })
    return unsubscribe
  }, [onEmailNew, refetch, selectedEmail])

  useEffect(() => onEmailRead((event) => {
    refetch()
    if (event.emailId === selectedEmail?.id) refetchEmail()
  }), [onEmailRead, refetch, refetchEmail, selectedEmail?.id])

  useEffect(() => onEmailDeleted((event) => {
    refetch()
    if (event.emailId === selectedEmail?.id) setSelectedEmail(null)
  }), [onEmailDeleted, refetch, selectedEmail?.id])

  useEffect(() => onAICompleted((event) => {
    if (event.emailId === selectedEmail?.id) refetchEmail()
  }), [onAICompleted, refetchEmail, selectedEmail?.id])

  const handleEmailSelect = (email: any) => {
    setSelectedEmail(email)
    if (email.status === 'new') {
      updateEmail.mutate({ id: email.id, status: 'read' }, {
        onSuccess: () => refetch(),
      })
    }
  }

  const handleDeleteEmail = (id: string) => {
    if (confirm('Delete this email?')) {
      deleteEmail.mutate(id, {
        onSuccess: () => {
          setSelectedEmail(null)
          refetch()
        },
      })
    }
  }

  const handleMarkRead = (id: string) => {
    updateEmail.mutate({ id, status: 'read' }, { onSuccess: () => refetch() })
  }

  const handleCloseViewer = () => {
    setSelectedEmail(null)
  }

  if (!inboxId) return null

  const inboxAddress = emails?.[0]?.inboxId // We'd need to fetch inbox separately for address

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
            <p className="text-sm text-gray-500">Real-time email monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={clsx('flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium', isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
            {isConnected ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Connected
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Disconnected
              </>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={clsx('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Email List - Left Panel */}
        <div className={clsx(
          'flex-shrink-0 border-r border-gray-200 bg-white flex flex-col',
          viewMode === 'detail' ? 'w-0 overflow-hidden' : 'w-96'
        )}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Emails</h2>
            <p className="text-sm text-gray-500 mt-1">{emails?.length || 0} messages</p>
          </div>
          <div className="flex-1 overflow-auto">
            <EmailList
              emails={emails || []}
              onSelect={handleEmailSelect}
              selectedId={selectedEmail?.id}
              loading={isLoading}
              emptyMessage="No emails in this inbox"
            />
          </div>
        </div>

        {/* Email Viewer - Right Panel */}
        <div className={clsx(
          'flex-1 flex flex-col min-w-0',
          viewMode === 'list' && 'hidden'
        )}>
          {selectedEmail && emailData ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <EmailViewer
                email={emailData.email}
                attachments={emailData.attachments}
                otpRecords={emailData.otpRecords}
                onClose={handleCloseViewer}
                onDelete={handleDeleteEmail}
                onMarkRead={handleMarkRead}
              />
              {emailData.otpRecords.length > 0 && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <OtpDisplay otpRecords={emailData.otpRecords} emailOtpCodes={emailData.email.otpCodes} />
                </div>
              )}
            </div>
          ) : selectedEmail && emailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-pulse space-y-4 w-3/4">
                <div className="h-8 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-32 bg-gray-200 rounded" />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Mail className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an email</h3>
                <p className="text-gray-500">Choose an email from the list to view its contents</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

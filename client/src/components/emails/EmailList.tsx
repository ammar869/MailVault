import { formatDistanceToNow } from 'date-fns'
import { Mail, Paperclip, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { clsx } from 'clsx'

interface Email {
  id: string
  messageId: string
  from: string
  to: string[]
  subject: string
  bodyText: string
  bodyHtml: string | null
  status: 'new' | 'read' | 'archived' | 'deleted'
  hasAttachment: boolean
  receivedAt: string
  inboxId: string
  otpCodes: string[]
}

interface EmailListProps {
  emails: Email[]
  onSelect: (email: Email) => void
  selectedId?: string
  loading?: boolean
  emptyMessage?: string
}

export function EmailList({ emails, onSelect, selectedId, loading, emptyMessage = 'No emails yet' }: EmailListProps) {
  if (loading) {
    return (
      <div className="space-y-3" role="list" aria-label="Emails loading">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Mail className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <p className="text-lg">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2" role="list" aria-label="Email list">
      {emails.map((email) => (
        <EmailListItem
          key={email.id}
          email={email}
          isSelected={selectedId === email.id}
          onClick={() => onSelect(email)}
        />
      ))}
    </div>
  )
}

interface EmailListItemProps {
  email: Email
  isSelected: boolean
  onClick: () => void
}

function EmailListItem({ email, isSelected, onClick }: EmailListItemProps) {
  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    read: 'bg-gray-100 text-gray-600',
    archived: 'bg-green-100 text-green-800',
    deleted: 'bg-red-100 text-red-800',
  }

  const statusIcons = {
    new: <CheckCircle className="h-3 w-3" />,
    read: <Mail className="h-3 w-3" />,
    archived: <CheckCircle className="h-3 w-3" />,
    deleted: <AlertCircle className="h-3 w-3" />,
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full p-4 text-left rounded-lg border transition-all duration-150',
        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
        isSelected
          ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500'
          : 'bg-white border-gray-200 hover:border-gray-300'
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
          {email.hasAttachment ? (
            <Paperclip className="h-5 w-5 text-gray-500" />
          ) : (
            <Mail className="h-5 w-5 text-gray-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={clsx('font-medium truncate', email.status === 'new' ? 'text-gray-900' : 'text-gray-700')}>
                {email.subject || '(No subject)'}
              </p>
              <p className="text-sm text-gray-500 truncate mt-1">
                {email.from}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {email.otpCodes.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <Clock className="h-3 w-3" />
                  {email.otpCodes.length} OTP
                </span>
              )}
              <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusColors[email.status])}>
                {statusIcons[email.status]}
                {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
              </span>
            </div>
          </div>
          
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
            </p>
            {email.hasAttachment && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                Attachments
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
import { useState } from 'react'
import { Download, Paperclip, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useAttachmentUrl } from '../../hooks/useQueries'

interface Attachment {
  id: string
  filename: string
  mimeType: string
  size: number
  s3Bucket: string
  s3Key: string
}

interface OtpRecord {
  id: string
  code: string
  context: string | null
  emailId: string
  createdAt: string
}

interface EmailViewerProps {
  email: {
    id: string
    messageId: string
    from: string
    to: string[]
    cc: string[] | null
    bcc: string[] | null
    subject: string
    bodyText: string
    bodyHtml: string | null
    status: string
    hasAttachment: boolean
    receivedAt: string
    inboxId: string
    otpCodes: string[]
  }
  attachments: Attachment[]
  otpRecords: OtpRecord[]
  onClose?: () => void
  onDelete?: (id: string) => void
  onMarkRead?: (id: string) => void
}

export function EmailViewer({ email, attachments, otpRecords, onClose, onDelete, onMarkRead }: EmailViewerProps) {
  const [activeTab, setActiveTab] = useState<'html' | 'text' | 'headers'>('html')
  const [copiedAttachmentId, setCopiedAttachmentId] = useState<string | null>(null)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getMimeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('application/pdf')) return '📄'
    if (mimeType.startsWith('text/')) return '📝'
    if (mimeType.startsWith('application/')) return '⚙️'
    return '📎'
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data } = await useAttachmentUrl(email.id, attachment.id)
      if (data?.url) {
        const a = document.createElement('a')
        a.href = data.url
        a.download = attachment.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to download attachment:', error)
    }
  }

  const handleCopyUrl = async (attachment: Attachment) => {
    try {
      const { data } = await useAttachmentUrl(email.id, attachment.id)
      if (data?.url) {
        await navigator.clipboard.writeText(data.url)
        setCopiedAttachmentId(attachment.id)
        setTimeout(() => setCopiedAttachmentId(null), 2000)
      }
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const handleOpenInNewTab = async (attachment: Attachment) => {
    try {
      const { data } = await useAttachmentUrl(email.id, attachment.id)
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.error('Failed to open attachment:', error)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{email.subject || '(No subject)'}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <strong className="text-gray-900">From:</strong> {email.from}
              </span>
              <span className="flex items-center gap-1">
                <strong className="text-gray-900">To:</strong> {email.to.join(', ')}
              </span>
              {email.cc?.length && (
                <span className="flex items-center gap-1">
                  <strong className="text-gray-900">CC:</strong> {email.cc.join(', ')}
                </span>
              )}
              <span className="flex items-center gap-1 text-gray-500">
                {formatDate(email.receivedAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {email.status === 'new' && onMarkRead && (
              <button
                onClick={() => onMarkRead(email.id)}
                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Mark as Read
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(email.id)}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                Delete
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close email"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* OTP Codes Banner */}
      {(email.otpCodes.length > 0 || otpRecords.length > 0) && (
        <div className="bg-amber-50 border-b border-amber-200 p-4">
          <div className="flex items-center gap-2 text-amber-800 mb-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">OTP Codes Detected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {email.otpCodes.map((code) => (
              <div key={code} className="flex items-center gap-2 px-3 py-2 bg-amber-100 rounded-lg">
                <code className="font-mono text-lg font-bold text-amber-900 tracking-widest">{code}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="text-amber-700 hover:text-amber-900"
                  aria-label="Copy OTP"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            ))}
            {otpRecords.map((otp) => (
              <div key={otp.id} className="flex items-center gap-2 px-3 py-2 bg-amber-100 rounded-lg">
                <code className="font-mono text-lg font-bold text-amber-900 tracking-widest">{otp.code}</code>
                {otp.context && (
                  <span className="text-xs text-amber-700 max-w-xs truncate">{otp.context}</span>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(otp.code)}
                  className="text-amber-700 hover:text-amber-900"
                  aria-label="Copy OTP"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px" aria-label="Email content tabs">
          <button
            onClick={() => setActiveTab('html')}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'html'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
            role="tab"
            aria-selected={activeTab === 'html'}
          >
            HTML
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'text'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
            role="tab"
            aria-selected={activeTab === 'text'}
          >
            Text
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'headers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
            role="tab"
            aria-selected={activeTab === 'headers'}
          >
            Headers
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'html' && email.bodyHtml && (
          <div className="prose prose-sm max-w-none">
            <div
              className="email-html-content"
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            />
          </div>
        )}

        {activeTab === 'text' && (
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
            {email.bodyText || '(No text content)'}
          </pre>
        )}

        {activeTab === 'headers' && (
          <div className="font-mono text-sm text-gray-700 space-y-2">
            <div className="bg-gray-50 p-4 rounded-lg space-y-1">
              <div><strong>Message-ID:</strong> {email.messageId}</div>
              <div><strong>From:</strong> {email.from}</div>
              <div><strong>To:</strong> {email.to.join(', ')}</div>
              {email.cc?.length && <div><strong>CC:</strong> {email.cc.join(', ')}</div>}
              {email.bcc?.length && <div><strong>BCC:</strong> {email.bcc.join(', ')}</div>}
              <div><strong>Subject:</strong> {email.subject || '(No subject)'}</div>
              <div><strong>Date:</strong> {formatDate(email.receivedAt)}</div>
              <div><strong>Status:</strong> {email.status}</div>
              <div><strong>Inbox ID:</strong> {email.inboxId}</div>
              <div><strong>Has Attachments:</strong> {email.hasAttachment ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments ({attachments.length})
          </h3>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{getMimeIcon(attachment.mimeType)}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{attachment.filename}</p>
                    <p className="text-xs text-gray-500">
                      {attachment.mimeType} • {formatSize(attachment.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label={`Download ${attachment.filename}`}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleOpenInNewTab(attachment)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label={`Open ${attachment.filename} in new tab`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCopyUrl(attachment)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label={`Copy ${attachment.filename} URL`}
                  >
                    {copiedAttachmentId === attachment.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
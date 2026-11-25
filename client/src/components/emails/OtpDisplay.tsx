import { useState } from 'react'
import { Copy, Check, Clock, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

interface OtpRecord {
  id: string
  code: string
  context: string | null
  emailId: string
  createdAt: string
}

interface OtpDisplayProps {
  otpRecords: OtpRecord[]
  emailOtpCodes?: string[]
  className?: string
}

export function OtpDisplay({ otpRecords, emailOtpCodes = [], className }: OtpDisplayProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const allCodes = [
    ...emailOtpCodes.map((code) => ({ code, context: null, id: `email-${code}`, createdAt: new Date().toISOString() })),
    ...otpRecords,
  ]

  if (allCodes.length === 0) {
    return null
  }

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <AlertCircle className="h-5 w-5" />
        <span>OTP Codes Found ({allCodes.length})</span>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {allCodes.map((otp) => (
          <div
            key={otp.id}
            className={clsx(
              'relative p-4 bg-amber-50 border border-amber-200 rounded-xl',
              copiedCode === otp.code && 'ring-2 ring-amber-400'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <code className="font-mono text-2xl font-bold tracking-widest text-amber-900 break-all">
                  {otp.code}
                </code>
                {otp.context && (
                  <p className="mt-2 text-xs text-amber-700 line-clamp-2">{otp.context}</p>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(otp.code)}
                className={clsx(
                  'p-2 rounded-lg transition-colors flex-shrink-0',
                  copiedCode === otp.code
                    ? 'bg-green-100 text-green-700'
                    : 'bg-white text-amber-600 hover:bg-amber-100 hover:text-amber-800'
                )}
                aria-label={copiedCode === otp.code ? 'Copied!' : 'Copy OTP'}
              >
                {copiedCode === otp.code ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
              <Clock className="h-3 w-3" />
              <span>Received {new Date(otp.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
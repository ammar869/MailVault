const OTP_PATTERNS = [
  /\b(\d{6})\b/g,
  /\b(\d{4})\b/g,
  /\b([A-Z0-9]{6,8})\b/g,
]

const OTP_CONTEXT_KEYWORDS = [
  'code',
  'verification',
  'verify',
  'otp',
  'one-time',
  'one time',
  'passcode',
  'pin',
  'security code',
  'auth code',
  'confirm',
  'validate',
]

export function extractOtpCodes(text: string): string[] {
  if (!text) return []

  const codes = new Set<string>()
  const lowerText = text.toLowerCase()

  const hasOtpContext = OTP_CONTEXT_KEYWORDS.some(keyword => lowerText.includes(keyword))

  for (const pattern of OTP_PATTERNS) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const code = match[1]
      if (isLikelyOtp(code, hasOtpContext, text, match.index)) {
        codes.add(code)
      }
    }
  }

  return Array.from(codes)
}

function isLikelyOtp(code: string, hasContext: boolean, fullText: string, index: number): boolean {
  if (code.length < 4 || code.length > 8) return false

  const surroundingText = fullText.substring(Math.max(0, index - 100), index + code.length + 100).toLowerCase()

  if (hasContext) return true

  const contextKeywords = ['code', 'verify', 'otp', 'pin', 'passcode', 'security', 'auth', 'confirm']
  return contextKeywords.some(kw => surroundingText.includes(kw))
}

export function extractLinks(text: string): string[] {
  if (!text) return []

  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches = text.match(urlRegex) || []
  return [...new Set(matches)]
}
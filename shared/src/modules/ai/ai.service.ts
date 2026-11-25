import { AIResult } from './aiResult.model.js'
import { Inbox } from '../inboxes/inbox.model.js'
import { logger } from '../../utils/logger.js'
import { env } from '../../config/env.js'

interface LLMResponse {
  summary: string
  category: string
  subCategory: string
  links: string[]
  phishingScore: number
  phishingReasons: string[]
  tokensUsed: number
}

const SYSTEM_PROMPT = `You are an email analysis AI. Analyze the email and return a JSON object with:
{
  "summary": "2-3 sentence summary of the email content",
  "category": "one of: transactional, marketing, notification, personal, spam, security, finance, social, other",
  "subCategory": "more specific category like: order-confirmation, password-reset, newsletter, promotional, 2fa-code, bank-alert, shipping-update, etc.",
  "links": ["array of all URLs found in the email"],
  "phishingScore": 0-100 (likelihood this is phishing/malicious),
  "phishingReasons": ["reasons for phishing score"],
  "tokensUsed": estimated token count
}

Categories: transactional, marketing, notification, personal, spam, security, finance, social, other
Phishing indicators: suspicious sender, urgency language, credential requests, mismatched URLs, poor grammar, unexpected attachments`

const USER_PROMPT_TEMPLATE = `Analyze this email:

From: {from}
To: {to}
Subject: {subject}
Body (text): {bodyText}
Body (HTML): {bodyHtml}
Attachments: {attachmentCount} file(s)
Detected OTPs: {otpCodes}

Return only valid JSON matching the schema.`

class AIService {
  private async callLLM(prompt: string): Promise<LLMResponse> {
    if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) {
      // Mock response for development
      return this.mockResponse()
    }

    if (env.OPENAI_API_KEY) {
      return this.callOpenAI(prompt)
    }

    if (env.ANTHROPIC_API_KEY) {
      return this.callAnthropic(prompt)
    }

    throw new Error('No LLM provider configured')
  }

  private async callOpenAI(prompt: string): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${error}`)
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }>; usage?: { total_tokens: number } }
    const content = data.choices[0]?.message?.content
    const tokensUsed = data.usage?.total_tokens || 0

    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const parsed = JSON.parse(content)
    return { ...parsed, tokensUsed }
  }

  private async callAnthropic(prompt: string): Promise<LLMResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.AI_MODEL || 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} ${error}`)
    }

    const data = await response.json() as { content: Array<{ text: string }>; usage?: { input_tokens: number; output_tokens: number } }
    const content = data.content[0]?.text
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)

    if (!content) {
      throw new Error('Empty response from Anthropic')
    }

    const parsed = JSON.parse(content)
    return { ...parsed, tokensUsed }
  }

  private mockResponse(): LLMResponse {
    return {
      summary: 'This is a mock AI summary for development purposes.',
      category: 'notification',
      subCategory: 'system-alert',
      links: ['https://example.com'],
      phishingScore: 10,
      phishingReasons: ['Mock analysis - low risk'],
      tokensUsed: 150,
    }
  }

  async processEmail(email: {
    _id: string
    inboxId: string
    userId: string
    from: string
    to: string[]
    subject: string
    bodyText: string
    bodyHtml: string | null
    hasAttachment: boolean
    otpCodes: string[]
  }): Promise<void> {
    const inbox = await Inbox.findById(email.inboxId).exec()
    if (!inbox || !inbox.aiEnabled) {
      logger.debug({ emailId: email._id }, 'AI disabled for inbox, skipping')
      return
    }

    const prompt = USER_PROMPT_TEMPLATE
      .replace('{from}', email.from)
      .replace('{to}', email.to.join(', '))
      .replace('{subject}', email.subject || '(No subject)')
      .replace('{bodyText}', email.bodyText?.slice(0, 3000) || '')
      .replace('{bodyHtml}', email.bodyHtml?.slice(0, 3000) || '')
      .replace('{attachmentCount}', email.hasAttachment ? '1+' : '0')
      .replace('{otpCodes}', email.otpCodes.join(', ') || 'none')

    try {
      const result = await this.callLLM(prompt)

      await AIResult.findOneAndUpdate(
        { emailId: email._id },
        {
          $set: {
            emailId: email._id,
            inboxId: email.inboxId,
            userId: email.userId,
            summary: result.summary,
            category: result.category,
            subCategory: result.subCategory,
            links: result.links,
            phishingScore: result.phishingScore,
            phishingReasons: result.phishingReasons,
            tokensUsed: result.tokensUsed,
            llmModel: env.AI_MODEL || 'gpt-4o-mini',
            status: 'completed',
            error: null,
          },
        },
        { upsert: true, new: true }
      ).exec()

      logger.info({ emailId: email._id, category: result.category, phishingScore: result.phishingScore }, 'AI analysis completed')
    } catch (error: any) {
      logger.error({ err: error, emailId: email._id }, 'AI analysis failed')

      await AIResult.findOneAndUpdate(
        { emailId: email._id },
        {
          $set: {
            emailId: email._id,
            inboxId: email.inboxId,
            userId: email.userId,
            status: 'failed',
            error: error.message,
          },
        },
        { upsert: true, new: true }
      ).exec()
    }
  }

  async getResult(emailId: string) {
    return AIResult.findOne({ emailId }).exec()
  }

  async getResultsByInbox(inboxId: string, limit = 50, offset = 0) {
    const [results, total] = await Promise.all([
      AIResult.find({ inboxId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      AIResult.countDocuments({ inboxId }),
    ])
    return { results, total }
  }

  async getResultsByUser(userId: string, limit = 50, offset = 0) {
    const [results, total] = await Promise.all([
      AIResult.find({ userId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      AIResult.countDocuments({ userId }),
    ])
    return { results, total }
  }

  async getTokenUsage(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const results = await AIResult.find({
      userId,
      createdAt: { $gte: since },
      status: 'completed',
    }).exec()

    return results.reduce((acc, r) => acc + (r.tokensUsed || 0), 0)
  }
}

export const aiService = new AIService()
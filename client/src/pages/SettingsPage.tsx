import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Bell, Shield, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'

const API_KEY_SCOPES = ['emails:read', 'emails:write', 'inboxes:read', 'inboxes:write', 'aliases:read', 'aliases:write', 'analytics:read', 'webhooks:read', 'webhooks:write']

export function SettingsPage() {
  const { user, setUser, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications' | 'danger'>('account')
  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [revokingSessions, setRevokingSessions] = useState(false)
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [apiKeyName, setApiKeyName] = useState('')
  const [apiKeyScopes, setApiKeyScopes] = useState<string[]>(['emails:read', 'inboxes:read'])
  const [newApiKey, setNewApiKey] = useState('')
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [webhookName, setWebhookName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')

  const loadApiKeys = useCallback(async () => {
    try {
      const result = await api.apiKeys.list()
      setApiKeys(result.data)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not load API keys.')
    }
  }, [])

  const loadWebhooks = useCallback(async () => {
    try {
      const result = await api.webhooks.list()
      setWebhooks(result.data)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not load webhook endpoints.')
    }
  }, [])

  useEffect(() => {
    void loadApiKeys()
    void loadWebhooks()
  }, [loadApiKeys, loadWebhooks])

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ]

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setNotice('')
    try {
      const result = await api.auth.updateProfile(name)
      setUser(result.user)
      setNotice('Profile updated.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not update profile.')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setNotice('')
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    try {
      await api.auth.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      clearAuth()
      navigate('/login', { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not change password.')
    }
  }

  const handleRevokeSessions = async () => {
    if (!confirm('Sign out all devices, including this one?')) return
    setFormError('')
    setRevokingSessions(true)
    try {
      await api.auth.revokeSessions()
      clearAuth()
      navigate('/login', { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not revoke sessions.')
      setRevokingSessions(false)
    }
  }

  const handleCreateApiKey = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    setNewApiKey('')
    try {
      const result = await api.apiKeys.create(apiKeyName, apiKeyScopes)
      setNewApiKey(result.key)
      setApiKeyName('')
      await loadApiKeys()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not create API key.')
    }
  }

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Revoke this API key? Applications using it will lose access.')) return
    try {
      await api.apiKeys.delete(id)
      await loadApiKeys()
      setNotice('API key revoked.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not revoke API key.')
    }
  }

  const handleCreateWebhook = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    try {
      await api.webhooks.create(webhookName, webhookUrl, ['email.new'])
      setWebhookName('')
      setWebhookUrl('')
      await loadWebhooks()
      setNotice('Webhook endpoint created.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not create webhook endpoint.')
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook endpoint?')) return
    try {
      await api.webhooks.delete(id)
      await loadWebhooks()
      setNotice('Webhook endpoint deleted.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not delete webhook endpoint.')
    }
  }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      setFormError('Account deletion is not available yet.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>
      {(formError || notice) && (
        <div className={clsx('rounded-lg p-3 text-sm', formError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')} role={formError ? 'alert' : 'status'}>
          {formError || notice}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px" aria-label="Settings tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input-field bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Your name"
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">API Access</h2>
            <form onSubmit={handleCreateApiKey} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700" htmlFor="apiKeyName">New key name</label>
              <div className="flex gap-2">
                <input id="apiKeyName" value={apiKeyName} onChange={(event) => setApiKeyName(event.target.value)} className="input-field" maxLength={100} required placeholder="My integration" />
                <button type="submit" disabled={!apiKeyScopes.length} className="btn-primary whitespace-nowrap">Create key</button>
              </div>
              <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
                <legend className="mb-2 text-sm font-medium text-gray-700">Permissions</legend>
                {API_KEY_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={apiKeyScopes.includes(scope)} onChange={(event) => setApiKeyScopes((current) => event.target.checked ? [...current, scope] : current.filter((item) => item !== scope))} />
                    {scope}
                  </label>
                ))}
              </fieldset>
            </form>
            {newApiKey && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm" role="status">
              <p className="font-medium text-amber-900">Copy this key now. It will not be shown again.</p>
              <code className="mt-2 block break-all text-amber-950">{newApiKey}</code>
              <button type="button" onClick={() => navigator.clipboard.writeText(newApiKey)} className="mt-2 underline">Copy key</button>
            </div>}
            <ul className="mt-4 divide-y divide-gray-100">
              {apiKeys.map((key) => <li key={key._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div><p className="font-medium text-gray-800">{key.name}</p><p className="font-mono text-xs text-gray-500">{key.keyPrefix}••••••</p></div>
                <button type="button" onClick={() => handleDeleteApiKey(key._id)} className="text-red-600 hover:underline">Revoke</button>
              </li>)}
              {!apiKeys.length && <li className="py-3 text-sm text-gray-500">No API keys yet.</li>}
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Outgoing webhooks</h2>
            <p className="text-sm text-gray-600 mb-4">Send an <code>email.new</code> event to your service.</p>
            <form onSubmit={handleCreateWebhook} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <input value={webhookName} onChange={(event) => setWebhookName(event.target.value)} className="input-field" placeholder="Endpoint name" maxLength={100} required />
              <input type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} className="input-field" placeholder="https://example.com/webhooks" required />
              <button type="submit" className="btn-primary">Add endpoint</button>
            </form>
            <ul className="mt-4 divide-y divide-gray-100">
              {webhooks.map((webhook) => <li key={webhook._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0"><p className="font-medium text-gray-800">{webhook.name}</p><p className="truncate text-xs text-gray-500">{webhook.url}</p></div>
                <button type="button" onClick={() => handleDeleteWebhook(webhook._id)} className="text-red-600 hover:underline">Delete</button>
              </li>)}
              {!webhooks.length && <li className="py-3 text-sm text-gray-500">No webhook endpoints yet.</li>}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary">Update Password</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h2>
            <p className="text-gray-600 mb-4">2FA coming soon. Secure your account with authenticator apps.</p>
            <button className="btn-secondary" disabled>Enable 2FA (Coming Soon)</button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h2>
            <p className="text-gray-600 mb-4">Revoke access tokens and refresh cookies on all devices.</p>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Current Session</p>
                    <p className="text-sm text-gray-500">This browser • Active now</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Current</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h2>
            <p className="text-gray-600 mb-4">Configure when you receive notifications.</p>
            <div className="space-y-4">
              {[
                { id: 'newEmail', label: 'New email received', description: 'Get notified when a new email arrives in any inbox' },
                { id: 'otpDetected', label: 'OTP code detected', description: 'Get notified when an OTP code is extracted from an email' },
                { id: 'inboxExpiring', label: 'Inbox expiring soon', description: 'Get notified 24 hours before an inbox expires' },
                { id: 'weeklyDigest', label: 'Weekly digest', description: 'Receive a weekly summary of your email activity' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={item.id !== 'weeklyDigest'} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'danger' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Danger Zone</h2>
                <p className="text-gray-600">Irreversible and destructive actions</p>
              </div>
            </div>
            <div className="border-t border-red-200 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Delete Account</p>
                  <p className="text-sm text-gray-500">Permanently delete your account and all associated data</p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Sign Out Everywhere</p>
                <p className="text-sm text-gray-500">Sign out all devices, including this one</p>
              </div>
              <button onClick={handleRevokeSessions} disabled={revokingSessions} className="btn-secondary">
                {revokingSessions ? 'Signing out…' : 'Sign out everywhere'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Global styles
const btnStyles = 'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
const btnPrimary = `${btnStyles} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`
const btnSecondary = `${btnStyles} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500`
const inputStyles = 'w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm'

if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    .btn-primary { ${btnPrimary} }
    .btn-secondary { ${btnSecondary} }
    .input-field { ${inputStyles} }
  `
  document.head.appendChild(style)
}

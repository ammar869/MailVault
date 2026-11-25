import { useState } from 'react'
import { useAliases, useCreateAlias, useDeleteAlias, useUpdateAlias } from '../hooks/useQueries'
import { useInboxes } from '../hooks/useQueries'
import { Plus, Shield, Trash2, Copy, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { clsx } from 'clsx'

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600')}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AliasesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAliasData, setNewAliasData] = useState({
    localPart: '',
    domain: '',
    targetInboxId: '',
    expiresAt: '',
    isActive: true,
  })

  const { data: aliases, isLoading, refetch } = useAliases()
  const { data: inboxes } = useInboxes({ isActive: true })
  const createAlias = useCreateAlias()
  const deleteAlias = useDeleteAlias()
  const updateAlias = useUpdateAlias()

  const domains = ['mailvault.app', 'tempmail.io', 'disposable.email']

  const handleCreateAlias = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAliasData.localPart || !newAliasData.domain || !newAliasData.targetInboxId) return

    createAlias.mutate(newAliasData, {
      onSuccess: () => {
        setShowCreateModal(false)
        setNewAliasData({ localPart: '', domain: '', targetInboxId: '', expiresAt: '', isActive: true })
        refetch()
      },
    })
  }

  const handleDeleteAlias = (id: string) => {
    if (confirm('Delete this alias?')) {
      deleteAlias.mutate(id, { onSuccess: () => refetch() })
    }
  }

  const handleToggleActive = (alias: any) => {
    updateAlias.mutate({ id: alias._id, data: { isActive: !alias.isActive } }, { onSuccess: () => refetch() })
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aliases</h1>
          <p className="text-gray-600 mt-1">Forward emails to your inboxes without revealing your real address</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!inboxes?.length}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Alias
        </button>
      </div>

      {/* Empty State */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : aliases?.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Shield className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No aliases yet</h3>
          <p className="text-gray-500 mb-6">Create aliases to protect your real email address</p>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!inboxes?.length}
            className="btn-primary"
          >
            Create Alias
          </button>
          {!inboxes?.length && (
            <p className="text-sm text-gray-500 mt-4">Create an inbox first to use aliases</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alias</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Inbox</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {aliases?.map((alias: any) => (
                <tr key={alias._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{alias.address}</p>
                        <p className="text-sm text-gray-500">{alias.usageCount || 0} emails forwarded</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{alias.targetInboxId?.address || 'Unknown'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge isActive={alias.isActive} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{formatDate(alias.expiresAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{alias.usageCount || 0}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCopyAddress(alias.address)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copy address"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(alias)}
                        disabled={updateAlias.isPending}
                        className={clsx(
                          'p-2 rounded-lg transition-colors',
                          alias.isActive
                            ? 'text-yellow-600 hover:bg-yellow-100'
                            : 'text-green-600 hover:bg-green-100'
                        )}
                        title={alias.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {alias.isActive ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteAlias(alias._id)}
                        disabled={deleteAlias.isPending}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete alias"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Alias Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Alias</h2>
            <form onSubmit={handleCreateAlias} className="space-y-4">
              {!inboxes?.length && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Create an inbox first before creating aliases
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alias Address</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAliasData.localPart}
                    onChange={(e) => setNewAliasData({ ...newAliasData, localPart: e.target.value })}
                    placeholder="my-alias"
                    className="flex-1 input-field"
                    required
                    maxLength={64}
                    disabled={!inboxes?.length}
                  />
                  <span className="text-gray-500">@</span>
                  <select
                    value={newAliasData.domain}
                    onChange={(e) => setNewAliasData({ ...newAliasData, domain: e.target.value })}
                    className="input-field w-48"
                    required
                    disabled={!inboxes?.length}
                  >
                    {domains.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Inbox</label>
                <select
                  value={newAliasData.targetInboxId}
                  onChange={(e) => setNewAliasData({ ...newAliasData, targetInboxId: e.target.value })}
                  className="input-field"
                  required
                  disabled={!inboxes?.length}
                >
                  <option value="">Select inbox...</option>
                  {inboxes?.map((inbox: any) => (
                    <option key={inbox._id} value={inbox._id}>{inbox.address}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires (optional)</label>
                <input
                  type="datetime-local"
                  value={newAliasData.expiresAt}
                  onChange={(e) => setNewAliasData({ ...newAliasData, expiresAt: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newAliasData.isActive}
                  onChange={(e) => setNewAliasData({ ...newAliasData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Active immediately
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAlias.isPending || !inboxes?.length}
                  className="btn-primary"
                >
                  {createAlias.isPending ? 'Creating...' : 'Create Alias'}
                </button>
              </div>
            </form>
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
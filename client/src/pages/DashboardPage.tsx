import { useState } from 'react'
import { Plus, Mail, Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { useInboxes, useCreateInbox, useDeleteInbox } from '../hooks/useQueries'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { clsx } from 'clsx'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

export function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newInboxData, setNewInboxData] = useState({ localPart: '', domain: '', capacity: 100, ttlDays: 7 })
  const [selectedDomain, setSelectedDomain] = useState('')

  const { data: inboxes, isLoading, error, refetch } = useInboxes()
  const createInbox = useCreateInbox()
  const deleteInbox = useDeleteInbox()

  const domains = ['mailvault.app', 'tempmail.io', 'disposable.email']

  const handleCreateInbox = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newInboxData.localPart || !newInboxData.domain) return
    
    createInbox.mutate(
      { ...newInboxData, domain: newInboxData.domain },
      {
        onSuccess: () => {
          setShowCreateModal(false)
          setNewInboxData({ localPart: '', domain: '', capacity: 100, ttlDays: 7 })
          refetch()
        },
      }
    )
  }

  const handleDeleteInbox = (id: string) => {
    if (confirm('Delete this inbox? All emails will be removed.')) {
      deleteInbox.mutate(id, { onSuccess: () => refetch() })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your temporary inboxes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Inbox
        </button>
      </div>

      {/* Inboxes Grid */}
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
      ) : inboxes?.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Mail className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No inboxes yet</h3>
          <p className="text-gray-500 mb-6">Create your first temporary inbox to start receiving emails</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Create Inbox
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inboxes?.map((inbox: any) => (
            <div key={inbox._id} className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{inbox.address}</p>
                    <p className="text-sm text-gray-500">{inbox.capacity} emails • {inbox.ttlDays} days TTL</p>
                  </div>
                </div>
                <StatusBadge status={inbox.isActive ? 'new' : 'deleted'} />
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Expires {formatDate(inbox.expiresAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{inbox.usageCount || 0} emails received</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <a
                  href={`/inboxes/${inbox._id}`}
                  className="flex-1 btn-secondary text-center"
                >
                  Open Inbox
                </a>
                <button
                  onClick={() => handleDeleteInbox(inbox._id)}
                  disabled={deleteInbox.isPending}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete inbox"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Inbox Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Inbox</h2>
            <form onSubmit={handleCreateInbox} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newInboxData.localPart}
                    onChange={(e) => setNewInboxData({ ...newInboxData, localPart: e.target.value })}
                    placeholder="my-temp-inbox"
                    className="flex-1 input-field"
                    required
                    maxLength={64}
                  />
                  <span className="text-gray-500">@</span>
                  <select
                    value={newInboxData.domain}
                    onChange={(e) => setNewInboxData({ ...newInboxData, domain: e.target.value })}
                    className="input-field w-48"
                    required
                  >
                    {domains.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={newInboxData.capacity}
                    onChange={(e) => setNewInboxData({ ...newInboxData, capacity: parseInt(e.target.value) || 100 })}
                    min={1}
                    max={1000}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TTL (days)</label>
                  <input
                    type="number"
                    value={newInboxData.ttlDays}
                    onChange={(e) => setNewInboxData({ ...newInboxData, ttlDays: parseInt(e.target.value) || 7 })}
                    min={1}
                    max={365}
                    className="input-field"
                  />
                </div>
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
                  disabled={createInbox.isPending}
                  className="btn-primary"
                >
                  {createInbox.isPending ? 'Creating...' : 'Create Inbox'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Button styles
const btnStyles = 'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
const btnPrimary = `${btnStyles} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`
const btnSecondary = `${btnStyles} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500`
const inputStyles = 'w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm'

// Add global styles
const style = document.createElement('style')
style.textContent = `
  .btn-primary { ${btnPrimary} }
  .btn-secondary { ${btnSecondary} }
  .input-field { ${inputStyles} }
`
document.head.appendChild(style)
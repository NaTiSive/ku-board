// client/src/pages/admin/AccountManagement.tsx
// Admin account management page for listing users, banning/unbanning,
// and viewing admin logs. Requires admin access.

import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import type { AdminLogItem, AdminUser } from '../../lib/adminApi'
import { fetchAdminLogs, fetchAdminUsers, setUserBanned } from '../../lib/adminApi'
import { serverBase } from '../../lib/serverBase'

function formatLog(item: AdminLogItem) {
  const suffix = item.reason ? ` (${item.reason})` : ''
  const target = item.target_handle || item.target_id

  switch (item.action_type) {
    case 'ban_user':
      return `${item.admin_name} banned ${target}${suffix}`
    case 'unban_user':
      return `${item.admin_name} unbanned ${target}${suffix}`
    case 'delete_post':
      return `${item.admin_name} deleted post ${target}${suffix}`
    case 'delete_comment':
      return `${item.admin_name} deleted comment ${target}${suffix}`
    default:
      return `${item.admin_name} ${item.action_type} ${target}${suffix}`
  }
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

export default function AccountManagement() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [logs, setLogs] = useState<AdminLogItem[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsModalOpen, setLogsModalOpen] = useState(false)
  const [logsPage, setLogsPage] = useState(1)
  const [allLogs, setAllLogs] = useState<AdminLogItem[]>([])
  const [allLogsLoading, setAllLogsLoading] = useState(false)
  const [allLogsTotal, setAllLogsTotal] = useState(0)

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAdmin) {
      setLoading(false)
      setError('')
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setLoading(true)
      setError('')

      fetchAdminUsers(serverBase, query, 1, 50, controller.signal)
        .then((data) => setUsers(data.users))
        .catch((loadError) => {
          if (!controller.signal.aborted) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load users')
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false)
          }
        })
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [authLoading, isAdmin, query])

  useEffect(() => {
    if (authLoading || !isAdmin) {
      setLogs([])
      setLogsLoading(false)
      return
    }

    const controller = new AbortController()
    setLogsLoading(true)
    fetchAdminLogs(serverBase, 1, 5, controller.signal)
      .then((data) => setLogs(data.logs))
      .catch(() => setLogs([]))
      .finally(() => {
        if (!controller.signal.aborted) {
          setLogsLoading(false)
        }
      })

    return () => controller.abort()
  }, [authLoading, isAdmin])

  useEffect(() => {
    if (!logsModalOpen || authLoading || !isAdmin) {
      return
    }

    const controller = new AbortController()
    setAllLogsLoading(true)

    fetchAdminLogs(serverBase, logsPage, 20, controller.signal)
      .then((data) => {
        setAllLogs(data.logs)
        setAllLogsTotal(data.total)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAllLogs([])
          setAllLogsTotal(0)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAllLogsLoading(false)
        }
      })

    return () => controller.abort()
  }, [authLoading, isAdmin, logsModalOpen, logsPage])

  const handleToggleBan = async (target: AdminUser) => {
    if (updatingId) {
      return
    }

    const nextBanned = target.status !== 'banned'
    const reason = nextBanned
      ? window.prompt(`Reason for banning ${target.displayName}:`, target.banReason ?? '')?.trim() ?? ''
      : window.prompt(`Reason for unbanning ${target.displayName} (optional):`, '')?.trim() ?? ''

    if (nextBanned && !reason) {
      setError('Ban reason is required.')
      return
    }

    setUpdatingId(target.id)
    setError('')

    try {
      await setUserBanned(serverBase, target.id, nextBanned, reason || undefined)
      setUsers((current) =>
        current.map((item) =>
          item.id === target.id
            ? {
                ...item,
                status: nextBanned ? 'banned' : 'active',
                banReason: nextBanned ? reason : null,
                bannedAt: nextBanned ? new Date().toISOString() : null,
              }
            : item,
        ),
      )

      const latest = await fetchAdminLogs(serverBase, 1, 5)
      setLogs(latest.logs)

      if (logsModalOpen) {
        const pagedLogs = await fetchAdminLogs(serverBase, logsPage, 20)
        setAllLogs(pagedLogs.logs)
        setAllLogsTotal(pagedLogs.total)
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update user')
    } finally {
      setUpdatingId(null)
    }
  }

  const totalLogPages = Math.max(1, Math.ceil(allLogsTotal / 20))

  if (!authLoading && !isAdmin) {
    return (
      <section className="page">
        <div className="card">
          <h2>Not allowed</h2>
          <p className="muted">Admin access is required to manage accounts.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="admin-layout">
        <div className="card admin-card">
          <div className="card-header-simple">
            <span className="icon-circle">A</span>
            <h2>Account Management</h2>
          </div>
          <div className="admin-tools">
            <input
              className="text-input"
              placeholder="Search user id or name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={loading || updatingId !== null}
            />
            <button className="button button-outline button-mini" type="button" disabled>
              Export log
            </button>
          </div>
          {error && <div className="login-error">{error}</div>}
          <div className="table">
            <div className="table-row header">
              <span>Member</span>
              <span>Handle</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {loading && (
              <div className="table-row">
                <span className="muted">Loading...</span>
                <span />
                <span />
                <span />
              </div>
            )}
            {!loading && users.length === 0 && (
              <div className="table-row">
                <span className="muted">No users found.</span>
                <span />
                <span />
                <span />
              </div>
            )}
            {users.map((user) => (
              <div className="table-row" key={user.id}>
                <span>
                  {user.displayName}
                  {user.status === 'banned' && user.banReason ? (
                    <span className="table-meta">Reason: {user.banReason}</span>
                  ) : null}
                </span>
                <span className="muted">@{user.handle}</span>
                <span>
                  <span className={`status-pill ${user.status}`}>{user.status}</span>
                  {user.status === 'banned' && user.bannedAt ? (
                    <span className="table-meta">Since {formatDate(user.bannedAt)}</span>
                  ) : null}
                </span>
                <button
                  className="button button-outline button-mini"
                  type="button"
                  onClick={() => handleToggleBan(user)}
                  disabled={loading || updatingId === user.id}
                >
                  {user.status === 'banned' ? 'Unban' : 'Ban'}
                </button>
              </div>
            ))}
          </div>
          <div className="admin-logs">
            <div className="admin-logs-header">
              <h3>Recent admin logs</h3>
              <button
                className="button button-outline button-mini"
                type="button"
                onClick={() => {
                  setLogsPage(1)
                  setLogsModalOpen(true)
                }}
              >
                View all logs
              </button>
            </div>
            <ul>
              {logsLoading && <li>Loading...</li>}
              {!logsLoading && logs.length === 0 && <li>No logs yet.</li>}
              {!logsLoading &&
                logs.map((log) => (
                  <li key={log.id}>
                    {formatLog(log)} · <span className="muted">{formatDate(log.created_at)}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
      {logsModalOpen && (
        <div className="image-cropper-overlay" role="dialog" aria-modal="true" aria-label="Admin logs">
          <div className="admin-log-modal">
            <div className="admin-log-modal-header">
              <div>
                <h3>All admin logs</h3>
                <p className="muted">Sorted from newest to oldest. Showing 20 logs per page.</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close logs" onClick={() => setLogsModalOpen(false)}>
                x
              </button>
            </div>
            <div className="admin-log-modal-body">
              <ul className="admin-log-list">
                {allLogsLoading && <li>Loading logs...</li>}
                {!allLogsLoading && allLogs.length === 0 && <li>No logs yet.</li>}
                {!allLogsLoading &&
                  allLogs.map((log) => (
                    <li key={log.id}>
                      {formatLog(log)} · <span className="muted">{formatDate(log.created_at)}</span>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="admin-log-pagination">
              <button
                className="button button-outline button-mini"
                type="button"
                onClick={() => setLogsPage((current) => Math.max(1, current - 1))}
                disabled={allLogsLoading || logsPage === 1}
              >
                Previous
              </button>
              <span className="muted">
                Page {logsPage} of {totalLogPages}
              </span>
              <button
                className="button button-outline button-mini"
                type="button"
                onClick={() => setLogsPage((current) => Math.min(totalLogPages, current + 1))}
                disabled={allLogsLoading || logsPage >= totalLogPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

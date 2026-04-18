// client/src/pages/admin/AccountManagement.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin account management page for listing users, banning/unbanning,
// and viewing admin logs. Requires admin access.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import type { AdminLogItem, AdminUser } from '../../lib/adminApi'
import { fetchAdminLogs, fetchAdminUsers, setUserBanned } from '../../lib/adminApi'
import { serverBase } from '../../lib/serverBase'

function formatLog(item: AdminLogItem) {
  switch (item.action_type) {
    case 'ban_user':
      return `${item.admin_name} banned ${item.target_id}`
    case 'unban_user':
      return `${item.admin_name} unbanned ${item.target_id}`
    case 'delete_post':
      return `${item.admin_name} deleted post ${item.target_id}`
    case 'delete_comment':
      return `${item.admin_name} deleted comment ${item.target_id}`
    default:
      return `${item.admin_name} ${item.action_type} ${item.target_id}`
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
    fetchAdminLogs(serverBase, 1, 10, controller.signal)
      .then((data) => setLogs(data.logs))
      .catch(() => setLogs([]))
      .finally(() => {
        if (!controller.signal.aborted) {
          setLogsLoading(false)
        }
      })

    return () => controller.abort()
  }, [authLoading, isAdmin])

  const handleToggleBan = async (target: AdminUser) => {
    if (updatingId) {
      return
    }

    const nextBanned = target.status !== 'banned'
    setUpdatingId(target.id)
    setError('')

    try {
      await setUserBanned(serverBase, target.id, nextBanned)
      setUsers((current) =>
        current.map((item) => (item.id === target.id ? { ...item, status: nextBanned ? 'banned' : 'active' } : item)),
      )
      const latest = await fetchAdminLogs(serverBase, 1, 10)
      setLogs(latest.logs)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update user')
    } finally {
      setUpdatingId(null)
    }
  }

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
      <div className="feed-layout">
        <div className="feed-main">
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
                  <span className="muted">Loading…</span>
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
                  <span>{user.displayName}</span>
                  <span className="muted">@{user.handle}</span>
                  <span className={`status-pill ${user.status}`}>{user.status}</span>
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
              <h3>Recent admin logs</h3>
              <ul>
                {logsLoading && <li>Loading…</li>}
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
        <aside className="feed-side">
          <div className="side-header">Admin Checklist</div>
          <div className="side-list">
            <div className="side-item">Review ban appeals</div>
            <div className="side-item">Audit deleted posts</div>
            <div className="side-item">Check report queue</div>
          </div>
        </aside>
      </div>
    </section>
  )
}


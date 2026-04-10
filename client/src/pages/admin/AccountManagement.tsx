import { useMemo, useState } from 'react'
import { mockUsers } from '../../data/mockFeed'

interface AdminLog {
  id: string
  action: string
  createdAt: string
}

const mockLogs: AdminLog[] = [
  { id: 'log-1', action: 'Removed post-2 for policy violation', createdAt: '2026-04-10 09:20' },
  { id: 'log-2', action: 'Banned user ku-20260112 for spam', createdAt: '2026-04-10 08:12' },
]

export default function AccountManagement() {
  const [query, setQuery] = useState('')
  const filteredUsers = useMemo(() => {
    if (!query.trim()) return mockUsers
    const lower = query.toLowerCase()
    return mockUsers.filter((user) =>
      [user.displayName, user.handle, user.id].some((value) => value.toLowerCase().includes(lower)),
    )
  }, [query])

  return (
    <section className="page">
      <div className="feed-layout">
        <div className="feed-main">
          <div className="card admin-card">
            <div className="card-header-simple">
              <span className="icon-circle">A</span>
              <h2>Account Management</h2>
            </div>
            <p className="muted">
              Admins can ban KU members and remove posts. All actions are logged in admin_logs.
            </p>
            <div className="info-banner">Mock preview: admin tools are visible to everyone.</div>
            <div className="admin-tools">
              <input
                className="text-input"
                placeholder="Search KU ID, name, or handle"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button className="button button-outline button-mini" type="button">
                Export log
              </button>
            </div>
            <div className="table">
              <div className="table-row header">
                <span>Member</span>
                <span>Handle</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {filteredUsers.map((user) => (
                <div className="table-row" key={user.id}>
                  <span>{user.displayName}</span>
                  <span className="muted">@{user.handle}</span>
                  <span className={`status-pill ${user.status}`}>{user.status}</span>
                  <button className="button button-outline button-mini" type="button">
                    {user.status === 'banned' ? 'Unban' : 'Ban'}
                  </button>
                </div>
              ))}
            </div>
            <div className="admin-logs">
              <h3>Recent admin logs</h3>
              <ul>
                {mockLogs.map((log) => (
                  <li key={log.id}>
                    {log.action} · <span className="muted">{log.createdAt}</span>
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

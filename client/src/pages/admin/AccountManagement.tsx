import { mockUsers } from '../../data/mockFeed'
import { useAuth } from '../../hooks/useAuth'

export default function AccountManagement() {
  const { isAdmin } = useAuth()

  return (
    <section className="page">
      <div className="card admin-card">
        <p className="eyebrow">admin.user.ban</p>
        <h1>Member access control</h1>
        <p className="muted">
          Only admins can ban or unban users. All actions are logged in admin_logs.
        </p>
        {!isAdmin && (
          <div className="info-banner warning">
            You need Admin role to manage member access.
          </div>
        )}
        <div className="table">
          <div className="table-row header">
            <span>Member</span>
            <span>Handle</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {mockUsers.map((user) => (
            <div className="table-row" key={user.id}>
              <span>{user.displayName}</span>
              <span className="muted">@{user.handle}</span>
              <span className={`status-pill ${user.status}`}>{user.status}</span>
              <button className="button button-outline" type="button" disabled={!isAdmin}>
                {user.status === 'banned' ? 'Unban' : 'Ban'}
              </button>
            </div>
          ))}
        </div>
        <div className="admin-logs">
          <h3>Recent admin logs</h3>
          <ul>
            <li>Admin removed post-2 for policy violation.</li>
            <li>User ku-20260112 was banned for spam.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

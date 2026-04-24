// Banned landing page
// หน้านี้ตั้งใจให้เหลือ action หลักแค่ logout เพื่อกันการวนกลับเข้า route อื่น
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function BannedPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <section className="banned-shell">
      <div className="banned-card">
        <p className="banned-eyebrow">Account Suspended</p>
        <h1>Your account has been banned.</h1>
        <p className="muted">
          This account cannot access KUBoard pages, create posts, or interact with other users until an admin removes the ban.
        </p>
        <div className="banned-note">
          If you think this is a mistake, please contact the system administrator or KU IT support.
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
        >
          Logout
        </button>
      </div>
    </section>
  )
}

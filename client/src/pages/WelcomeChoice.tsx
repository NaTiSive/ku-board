// Visitor choice page
// ใช้เป็น gate ก่อนเข้า guest mode เพื่อจำ redirect เดิมและกัน open redirect
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import KULogo from '../assets/ku-logo.svg'
import { grantGuestAccess } from '../lib/guestAccess'

function sanitizeRedirect(value: string | null) {
  // อนุญาตเฉพาะ internal path ที่ขึ้นต้นด้วย /
  if (!value || !value.startsWith('/')) {
    return '/feed'
  }

  return value
}

export default function WelcomeChoice() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTarget = useMemo(() => sanitizeRedirect(searchParams.get('redirect')), [searchParams])

  const handleGuestMode = () => {
    grantGuestAccess()
    navigate(redirectTarget)
  }

  return (
    <section className="visitor-shell">
      <header className="login-top">
        <div className="login-brand">
          <img src={KULogo} alt="KU Logo" />
          <div>
            <strong>มหาวิทยาลัยเกษตรศาสตร์</strong>
            <span>KUBoard visitor access</span>
          </div>
        </div>
        <span className="login-lang">Guest entry</span>
      </header>

      <div className="visitor-card">
        <div className="login-logo">
          <img src={KULogo} alt="KU Logo" />
        </div>
        <p className="visitor-eyebrow">Welcome to KUBoard</p>
        <h1>Choose how you want to continue</h1>
        <p className="muted">
          If you opened a shared link from outside the system, you can create an account now or continue in guest mode first.
        </p>

        <div className="visitor-actions">
          <button className="button button-primary login-action-button" type="button" onClick={() => navigate(`/create-account?redirect=${encodeURIComponent(redirectTarget)}`)}>
            Create account
          </button>
          <button className="button button-outline login-action-button" type="button" onClick={handleGuestMode}>
            Continue as guest
          </button>
        </div>

        <div className="visitor-note">
          <h3>About guest mode</h3>
          <p className="muted">
            Guest mode lets you read the board first, including shared posts and comments, without creating an account yet.
          </p>
          <ul className="visitor-list">
            <li>You can open public board pages and read content.</li>
            <li>You can comment anonymously as a guest.</li>
            <li>You cannot create posts, like posts, or access member-only features.</li>
          </ul>
        </div>

        <div className="login-help">
          Already have an account?
          <span onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirectTarget)}`)}>Login</span>
        </div>
      </div>
    </section>
  )
}

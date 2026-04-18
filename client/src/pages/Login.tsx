// client/src/pages/Login.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Login page for KUBoard authentication.
// Handles email/password sign-in and Google OAuth flow.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import KULogo from '../assets/ku-logo.svg'
import { serverBase } from '../lib/serverBase'

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4 20c1.8-3.5 5-5 8-5s6.2 1.5 8 5" fill="currentColor" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

function IconGoogle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21.81 12.23c0-.72-.06-1.25-.19-1.8H12.2v3.56h5.53c-.11.89-.7 2.24-2.02 3.14l-.02.12 2.91 2.21.2.02c1.84-1.66 3-4.1 3-7.25Z"
        fill="#4285F4"
      />
      <path
        d="M12.2 21.9c2.71 0 4.98-.87 6.64-2.37l-3.09-2.35c-.83.57-1.95.97-3.55.97-2.66 0-4.91-1.73-5.72-4.12l-.12.01-3.03 2.29-.04.11c1.65 3.2 5.04 5.46 8.91 5.46Z"
        fill="#34A853"
      />
      <path
        d="M6.48 14.03a5.78 5.78 0 0 1-.34-1.95c0-.68.13-1.33.33-1.95l-.01-.13-3.08-2.33-.1.05A9.78 9.78 0 0 0 2.2 12.08c0 1.56.38 3.04 1.08 4.36l3.2-2.41Z"
        fill="#FBBC05"
      />
      <path
        d="M12.2 5.99c2.03 0 3.4.86 4.18 1.58l3.05-2.91C17.17 2.61 14.91 1.5 12.2 1.5c-3.87 0-7.26 2.26-8.91 5.46l3.2 2.41c.82-2.39 3.07-4.12 5.71-4.12Z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const { loading, login, refreshUser } = useAuth()
  const navigate = useNavigate()

  const startOAuth = () => {
    setRedirecting(true)
    window.location.href = `${serverBase}/api/auth/google?redirect=/feed`
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    setSubmitting(true)

    const result = await login({ email, password })
    if (!result.success) {
      setError(result.message || 'เข้าสู่ระบบไม่สำเร็จ')
      setSubmitting(false)
      return
    }

    refreshUser()
    navigate('/feed')
  }

  return (
    <section className="login-shell">
      <header className="login-top">
        <div className="login-brand">
          <img src={KULogo} alt="KU Logo" />
          <div>
            <strong>มหาวิทยาลัยเกษตรศาสตร์</strong>
            <span>คณะวิทยาศาสตร์</span>
          </div>
        </div>
        <span className="login-lang">ภาษาไทย</span>
      </header>

      <div className="login-card">
        <div className="login-logo">
          <img src={KULogo} alt="KU Logo" />
        </div>
        <h1>KUBoard</h1>
        <p className="muted">เข้าสู่ระบบด้วย KU SSO หรือ รหัสผ่าน</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email">อีเมล KU</label>
            <div className="login-input">
              <span className="login-icon">
                <IconUser />
              </span>
              <input
                id="email"
                type="email"
                placeholder="เช่น example@ku.ac.th"
                className="text-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading || redirecting || submitting}
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">รหัสผ่าน</label>
            <div className="login-input">
              <span className="login-icon">
                <IconLock />
              </span>
              <input
                id="password"
                type="password"
                placeholder="กรอกรหัสผ่าน"
                className="text-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading || redirecting || submitting}
              />
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="button button-primary login-action-button" type="submit" disabled={loading || redirecting || submitting}>
            {submitting ? 'กำลังเข้าสู่ระบบ...' : redirecting ? 'กำลังพาไปยัง KU SSO...' : 'เข้าสู่ระบบ'}
          </button>

          <div className="login-alt-actions">
            <button className="button button-outline login-action-button" type="button" onClick={() => navigate('/feed')}>
              Continue as guest
            </button>

            <button
              className="button login-action-button login-google login-google-prominent"
              type="button"
              onClick={startOAuth}
              disabled={loading || redirecting || submitting}
            >
              <span className="login-google-badge" aria-hidden="true">
                <IconGoogle />
              </span>
              <span className="login-google-copy">
                <strong>Continue with Google</strong>
                <small>KU email only</small>
              </span>
            </button>
          </div>
        </form>

        <button className="button button-ghost login-action-button" type="button" onClick={() => navigate('/create-account')}>
          สมัครสมาชิกนิสิต
        </button>

        <div className="login-help">
          ต้องการความช่วยเหลือในการเข้าสู่ระบบ?
          <span>ติดต่อฝ่ายไอที</span>
        </div>
      </div>

      <footer className="login-bottom">© 2024 มหาวิทยาลัยเกษตรศาสตร์ สงวนลิขสิทธิ์</footer>
    </section>
  )
}

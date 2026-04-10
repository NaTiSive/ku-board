import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import KULogo from '../assets/ku-logo.svg'

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
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 7a5 5 0 0 1 4.6 2.4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M17 12h-5v5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M7.2 9.4A5 5 0 0 1 12 7" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M7 12a5 5 0 0 0 5 5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    const result = await login(email, password)
    if (result.success) {
      navigate(result.redirect ?? '/')
      return
    }

    setError(result.message || 'เข้าสู่ระบบไม่สำเร็จ')
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>

          <button
            className="button button-outline"
            type="button"
            onClick={() => navigate('/feed')}
            disabled={loading}
          >
            Continue as guest
          </button>

          <button
            className="button button-outline login-google"
            type="button"
            onClick={() => {
              try {
                window.location.href = `/api/auth/google-login?redirect=${encodeURIComponent(
                  '/auth/google-callback',
                )}`
              } catch (oauthError) {
                console.error('Google OAuth redirect failed:', oauthError)
                alert('ไม่สามารถเปลี่ยนเส้นทางไปยัง Google OAuth ได้ กรุณาลองใหม่')
              }
            }}
          >
            <span className="login-icon google">
              <IconGoogle />
            </span>
            เข้าสู่ระบบด้วย Google (เฉพาะอีเมล KU)
          </button>
        </form>
      </div>
    </section>
  )
}

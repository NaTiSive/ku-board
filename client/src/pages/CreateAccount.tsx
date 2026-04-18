// client/src/pages/CreateAccount.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Account creation page for new KUBoard users.
// Handles registration with KU email, full name, and password.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import KULogo from '../assets/ku-logo.svg'

interface RegisterForm {
  email: string
  password: string
  fullname: string
}

export default function CreateAccount() {
  const [form, setForm] = useState<RegisterForm>({
    email: '',
    password: '',
    fullname: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const { register, loading } = useAuth()

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.email || !form.password || !form.fullname) {
      setError('Please enter your full name, KU email, and password.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    const result = await register(form)
    if (result.success) {
      setSuccess(result.message || 'Account created. Redirecting to login...')
      setTimeout(() => navigate('/login'), 1500)
      return
    }

    setError(result.message || 'Could not create account.')
  }

  return (
    <section className="login-shell">
      <header className="login-top">
        <div className="login-brand">
          <img src={KULogo} alt="KU Logo" />
          <div>
            <strong>Kasetsart University</strong>
            <span>KUBoard account access</span>
          </div>
        </div>
        <span className="login-lang">Email signup</span>
      </header>

      <div className="login-card">
        <h1>Create account</h1>
        <p className="muted">Use your KU email and password to create a KUBoard account.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="fullname">Full name</label>
            <input
              id="fullname"
              name="fullname"
              type="text"
              placeholder="Your full name"
              value={form.fullname}
              onChange={handleChange}
              className="text-input"
              required
              disabled={loading}
            />
          </div>
          <div className="login-field">
            <label htmlFor="email">KU email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="example@ku.ac.th"
              value={form.email}
              onChange={handleChange}
              className="text-input"
              required
              disabled={loading}
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              className="text-input"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="login-help">
          Already have an account?
          <span onClick={() => navigate('/login')}>Login</span>
        </div>
      </div>

      <footer className="login-bottom">KUBoard access is limited to KU email holders.</footer>
    </section>
  )
}

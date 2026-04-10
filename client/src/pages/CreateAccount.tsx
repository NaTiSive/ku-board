import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import KULogo from '../assets/ku-logo.svg'
import FacultyDepartmentSelector from '../components/FacultyDepartmentSelector'

interface RegisterForm {
  email: string
  password: string
  fullname: string
  ku_id: string
  department: string
  faculty: string
}

export default function CreateAccount() {
  const [form, setForm] = useState<RegisterForm>({
    email: '',
    password: '',
    fullname: '',
    ku_id: '',
    department: '',
    faculty: '',
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
      setError('กรุณากรอกอีเมล รหัสผ่าน และชื่อ-นามสกุล')
      return
    }

    if (form.password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }

    if (!form.faculty) {
      setError('กรุณาเลือกคณะ')
      return
    }

    if (!form.department) {
      setError('กรุณาเลือกภาควิชา')
      return
    }

    const result = await register(form)
    if (result.success) {
      setSuccess('สมัครสมาชิกสำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ')
      setTimeout(() => navigate('/login'), 1500)
      return
    }

    setError(result.message || 'สมัครสมาชิกไม่สำเร็จ')
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
        <h1>สมัครสมาชิกนิสิต</h1>
        <p className="muted">สร้างบัญชีผู้ใช้งานสำหรับ KUBoard</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="fullname">ชื่อ-นามสกุล</label>
            <input
              id="fullname"
              name="fullname"
              type="text"
              placeholder="ชื่อ-นามสกุล"
              value={form.fullname}
              onChange={handleChange}
              className="text-input"
              required
              disabled={loading}
            />
          </div>
          <div className="login-field">
            <label htmlFor="email">อีเมล KU</label>
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
            <label htmlFor="ku_id">รหัสนิสิต KU</label>
            <input
              id="ku_id"
              name="ku_id"
              type="text"
              placeholder="รหัสนิสิต KU"
              value={form.ku_id}
              onChange={handleChange}
              className="text-input"
              disabled={loading}
            />
          </div>
          <FacultyDepartmentSelector
            selectedFaculty={form.faculty}
            selectedDepartment={form.department}
            onFacultyChange={(faculty) => setForm((prev) => ({ ...prev, faculty }))}
            onDepartmentChange={(department) => setForm((prev) => ({ ...prev, department }))}
            facultyError={error && !form.faculty ? 'กรุณาเลือกคณะ' : ''}
            departmentError={error && !form.department ? 'กรุณาเลือกภาควิชา' : ''}
          />
          <div className="login-field">
            <label htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="รหัสผ่าน"
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
            {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
          </button>
        </form>

        <div className="login-help">
          มีบัญชีอยู่แล้ว?
          <span onClick={() => navigate('/login')}>เข้าสู่ระบบ</span>
        </div>
      </div>

      <footer className="login-bottom">© 2024 มหาวิทยาลัยเกษตรศาสตร์ สงวนลิขสิทธิ์</footer>
    </section>
  )
}

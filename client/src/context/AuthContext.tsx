import { createContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role, UserProfile } from '../types'

const MOCK_GUEST_MODE = true

interface AuthContextValue {
  user: UserProfile
  isGuest: boolean
  isMember: boolean
  isAdmin: boolean
  isBanned: boolean
  loading: boolean
  mockMode: boolean
  setRole: (role: Role) => void
  login: (email: string, password: string) => Promise<{ success: boolean; redirect?: string; message?: string }>
  register: (payload: {
    email: string
    password: string
    fullname: string
    ku_id: string
    department: string
    faculty: string
  }) => Promise<{ success: boolean; message?: string }>
  logout: () => void
}

const guestProfile: UserProfile = {
  id: 'guest',
  displayName: 'Guest',
  handle: 'guest',
  role: 'guest',
  status: 'active',
}

const memberProfile: UserProfile = {
  id: 'ku-20260001',
  displayName: 'Praewa S.',
  handle: 'praewa.ku',
  role: 'member',
  status: 'active',
}

const adminProfile: UserProfile = {
  id: 'admin-0001',
  displayName: 'KU Admin',
  handle: 'admin.ku',
  role: 'admin',
  status: 'active',
}

const profiles: Record<Role, UserProfile> = {
  guest: guestProfile,
  member: memberProfile,
  admin: adminProfile,
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(guestProfile)
  const [loading, setLoading] = useState(false)

  const setRole = (role: Role) => {
    if (MOCK_GUEST_MODE) {
      setUser(guestProfile)
      return
    }
    setUser(profiles[role])
  }

  const login = async (email: string, _password: string) => {
    setLoading(true)
    try {
      if (MOCK_GUEST_MODE) {
        setUser(guestProfile)
        return { success: true, redirect: '/' }
      }
      const normalized = email.trim().toLowerCase()
      if (!normalized.endsWith('@ku.ac.th') && !normalized.endsWith('@ku.th')) {
        return { success: false, message: 'Please use a KU email address (@ku.ac.th).' }
      }
      const handle = normalized.split('@')[0]
      setUser({
        ...memberProfile,
        handle,
        displayName: handle.replace('.', ' ').replace('-', ' '),
      })
      return { success: true, redirect: '/' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (payload: {
    email: string
    password: string
    fullname: string
    ku_id: string
    department: string
    faculty: string
  }) => {
    setLoading(true)
    try {
      if (MOCK_GUEST_MODE) {
        return { success: true }
      }
      const normalized = payload.email.trim().toLowerCase()
      if (!normalized.endsWith('@ku.ac.th') && !normalized.endsWith('@ku.th')) {
        return { success: false, message: 'กรุณาใช้อีเมล KU (@ku.ac.th)' }
      }
      if (payload.password.length < 8) {
        return { success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }
      }
      if (!payload.fullname.trim()) {
        return { success: false, message: 'กรุณากรอกชื่อ-นามสกุล' }
      }
      return { success: true }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => setUser(guestProfile)

  const value = useMemo(() => {
    const isBanned = user.status === 'banned'
    const isGuest = user.role === 'guest' || isBanned
    return {
      user,
      isGuest,
      isMember: user.role === 'member' && !isBanned,
      isAdmin: user.role === 'admin' && !isBanned,
      isBanned,
      loading,
      mockMode: MOCK_GUEST_MODE,
      setRole,
      login,
      register,
      logout,
    }
  }, [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

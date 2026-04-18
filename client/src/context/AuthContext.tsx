import { createContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { UserProfile } from '../types'
import { loginWithPassword, logoutSession, registerWithPassword } from '../lib/authApi'
import { serverBase } from '../lib/serverBase'
import { readSupabaseSession } from '../lib/supabaseSession'

interface RegisterPayload {
  email: string
  password: string
  fullname: string
}

interface RegisterResult {
  success: boolean
  message?: string
}

interface AuthContextValue {
  user: UserProfile
  loading: boolean
  isGuest: boolean
  isIncognito: boolean
  isAdmin: boolean
  enterIncognito: () => void
  exitIncognito: () => void
  login: (_payload: LoginPayload) => Promise<RegisterResult>
  logout: () => Promise<void>
  refreshUser: () => void
  register: (_payload: RegisterPayload) => Promise<RegisterResult>
  updateCurrentUserDisplayName: (_displayName: string) => void
}

interface LoginPayload {
  email: string
  password: string
}

const guestUser: UserProfile = {
  id: 'guest',
  displayName: 'Guest',
  handle: 'guest',
  role: 'guest',
  status: 'active',
  avatarUrl: null,
  coverUrl: null,
}

const INCOGNITO_STORAGE_KEY = 'kuboard.incognito'

function readIncognitoState() {
  try {
    return window.localStorage.getItem(INCOGNITO_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeIncognitoState(value: boolean) {
  try {
    if (value) {
      window.localStorage.setItem(INCOGNITO_STORAGE_KEY, '1')
    } else {
      window.localStorage.removeItem(INCOGNITO_STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

function toHandle(value: string, fallback: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^[.]+|[.]+$)/g, '')

  return slug || fallback
}

function withUpdatedDisplayName(user: UserProfile, displayName: string): UserProfile {
  return {
    ...user,
    displayName,
    handle: toHandle(displayName, user.id.slice(0, 8)),
  }
}

function resolveSessionUser(): UserProfile | null {
  const session = readSupabaseSession()
  const sessionUser = session?.user
  const userId = sessionUser?.id

  if (!userId) {
    return null
  }

  const emailHandle = sessionUser.email?.split('@')[0]?.toLowerCase()
  const displayName =
    sessionUser.user_metadata?.full_name ||
    sessionUser.user_metadata?.display_name ||
    sessionUser.user_metadata?.name ||
    emailHandle ||
    'KU Member'

  const role = sessionUser.app_metadata?.role === 'admin' ? 'admin' : 'member'

  return {
    id: userId,
    displayName,
    handle: toHandle(displayName, emailHandle || userId.slice(0, 8)),
    role,
    status: 'active',
    avatarUrl: null,
    coverUrl: null,
  } satisfies UserProfile
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(guestUser)
  const [loading, setLoading] = useState(true)
  const [isIncognito, setIsIncognito] = useState(() => readIncognitoState())

  const recomputeUser = (nextIncognito: boolean) => {
    const sessionUser = resolveSessionUser()
    setUser(nextIncognito ? guestUser : sessionUser ?? guestUser)
    setLoading(false)
  }

  const refreshUser = () => {
    recomputeUser(isIncognito)
  }

  const enterIncognito = () => {
    writeIncognitoState(true)
    setIsIncognito(true)
    recomputeUser(true)
  }

  const exitIncognito = () => {
    writeIncognitoState(false)
    setIsIncognito(false)
    recomputeUser(false)
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isGuest: user.role === 'guest',
      isIncognito,
      isAdmin: user.role === 'admin',
      enterIncognito,
      exitIncognito,
      login: async (payload) => {
        setLoading(true)
        try {
          const response = await loginWithPassword(serverBase, payload)
          writeIncognitoState(false)
          setIsIncognito(false)
          recomputeUser(false)
          return {
            success: true,
            message: response?.message,
          }
        } catch (error) {
          setLoading(false)
          return {
            success: false,
            message: error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ',
          }
        }
      },
      logout: async () => {
        try {
          await logoutSession(serverBase)
        } catch {
          // Fall back to local reset even if the API call fails.
        }
        writeIncognitoState(false)
        setIsIncognito(false)
        setUser(guestUser)
        setLoading(false)
      },
      refreshUser,
      updateCurrentUserDisplayName: (displayName) => {
        setUser((current) => withUpdatedDisplayName(current, displayName))
      },
      register: async (payload) => {
        setLoading(true)
        try {
          const response = await registerWithPassword(serverBase, payload)
          writeIncognitoState(false)
          setIsIncognito(false)
          recomputeUser(false)
          return {
            success: true,
            message: response?.message,
          }
        } catch (error) {
          setLoading(false)
          return {
            success: false,
            message: error instanceof Error ? error.message : 'สมัครสมาชิกไม่สำเร็จ',
          }
        }
      },
    }),
    [isIncognito, loading, serverBase, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

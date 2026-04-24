import { createContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { UserProfile } from '../types'
import { loginWithPassword, logoutSession, registerWithPassword } from '../lib/authApi'
import { serverBase } from '../lib/serverBase'
import { readSupabaseSession } from '../lib/supabaseSession'
import { clearGuestAccess } from '../lib/guestAccess'
import type { Role } from '../types'

interface RegisterPayload {
  email: string
  password: string
  fullname: string
}

interface RegisterResult {
  success: boolean
  message?: string
  user?: UserProfile
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

interface RecomputeOptions {
  silent?: boolean
}

interface LoginPayload {
  email: string
  password: string
}

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

interface ProfileSnapshot {
  id: string
  display_name: string
  role: string
  status?: 'active' | 'banned'
  avatar_url?: string | null
  cover_url?: string | null
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

function normalizeRole(role?: string): Role {
  return role === 'admin' ? 'admin' : 'member'
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

  const role = normalizeRole(sessionUser.app_metadata?.role)

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

async function resolveUserFromProfile(baseUser: UserProfile): Promise<UserProfile> {
  try {
    const response = await fetch(`${serverBase}/api/profile/${baseUser.id}`, {
      credentials: 'include',
    })

    const body = (await response.json()) as ApiEnvelope<ProfileSnapshot>
    if (!response.ok || !body.success || !body.data) {
      return baseUser
    }

    return {
      ...baseUser,
      displayName: body.data.display_name || baseUser.displayName,
      handle: toHandle(body.data.display_name || baseUser.displayName, baseUser.id.slice(0, 8)),
      role: normalizeRole(body.data.role),
      status: body.data.status ?? baseUser.status,
      avatarUrl: body.data.avatar_url ?? null,
      coverUrl: body.data.cover_url ?? null,
    }
  } catch {
    return baseUser
  }
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(guestUser)
  const [loading, setLoading] = useState(true)
  const [isIncognito, setIsIncognito] = useState(() => readIncognitoState())

  const recomputeUser = async (nextIncognito: boolean, options?: RecomputeOptions): Promise<UserProfile> => {
    if (nextIncognito) {
      setUser(guestUser)
      setLoading(false)
      return guestUser
    }

    if (!options?.silent) {
      setLoading(true)
    }

    const sessionUser = resolveSessionUser()
    if (!sessionUser) {
      setUser(guestUser)
      setLoading(false)
      return guestUser
    }

    const resolvedUser = await resolveUserFromProfile(sessionUser)
    setUser(resolvedUser)
    setLoading(false)
    return resolvedUser
  }

  const refreshUser = () => {
    void recomputeUser(isIncognito)
  }

  const enterIncognito = () => {
    writeIncognitoState(true)
    setIsIncognito(true)
    void recomputeUser(true)
  }

  const exitIncognito = () => {
    writeIncognitoState(false)
    setIsIncognito(false)
    void recomputeUser(false)
  }

  useEffect(() => {
    refreshUser()
  }, [])

  useEffect(() => {
    if (loading || isIncognito || user.role === 'guest') {
      return
    }

    const refreshSessionStatus = () => {
      void recomputeUser(false, { silent: true })
    }

    const intervalId = window.setInterval(refreshSessionStatus, 15000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSessionStatus()
      }
    }

    window.addEventListener('focus', refreshSessionStatus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshSessionStatus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isIncognito, loading, user.id, user.role])

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
          const resolvedUser = await recomputeUser(false)
          return {
            success: true,
            message: response?.message,
            user: resolvedUser,
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
        clearGuestAccess()
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
          const resolvedUser = await recomputeUser(false)
          return {
            success: true,
            message: response?.message,
            user: resolvedUser,
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

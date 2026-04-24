import type { Role, UserProfile } from '../types'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

interface AdminUserRecord {
  id: string
  display_name: string
  role: Role
  status: 'active' | 'banned'
  created_at: string
  ban_reason?: string | null
  banned_at?: string | null
}

export interface AdminUser extends UserProfile {
  createdAt: string
  banReason?: string | null
  bannedAt?: string | null
}

export interface AdminUsersResponse {
  users: AdminUserRecord[]
  total: number
  page: number
  limit: number
}

export interface AdminLogItem {
  id: string
  action_type: string
  target_id: string
  target_handle?: string | null
  reason?: string | null
  created_at: string
  admin_name: string
}

export interface AdminLogsResponse {
  logs: AdminLogItem[]
  total: number
  page: number
  limit: number
}

function createHandle(displayName: string, id: string) {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^[.]+|[.]+$)/g, '')

  return slug || id.slice(0, 8).toLowerCase()
}

function toAdminUser(record: AdminUserRecord): AdminUser {
  return {
    id: record.id,
    displayName: record.display_name,
    handle: createHandle(record.display_name, record.id),
    role: record.role === 'admin' ? 'admin' : 'member',
    status: record.status,
    createdAt: record.created_at,
    banReason: record.ban_reason ?? null,
    bannedAt: record.banned_at ?? null,
  }
}

async function readJson<T>(response: Response) {
  const body = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Request failed')
  }

  return body.data
}

export async function fetchAdminUsers(
  serverBase: string,
  q: string,
  page = 1,
  limit = 20,
  signal?: AbortSignal,
): Promise<{ users: AdminUser[]; total: number; page: number; limit: number }> {
  const url = new URL('/api/admin/users', serverBase)
  if (q.trim()) {
    url.searchParams.set('q', q.trim())
  }
  url.searchParams.set('page', String(page))
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url.toString(), { credentials: 'include', signal })
  const data = await readJson<AdminUsersResponse>(response)

  return {
    users: data.users.map(toAdminUser),
    total: data.total,
    page: data.page,
    limit: data.limit,
  }
}

export async function setUserBanned(
  serverBase: string,
  userId: string,
  banned: boolean,
  reason?: string,
): Promise<{ user_id: string; banned: boolean; reason?: string | null }> {
  const response = await fetch(`${serverBase}/api/admin/users/${userId}/ban`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ banned, reason }),
  })

  return readJson<{ user_id: string; banned: boolean; reason?: string | null }>(response)
}

export async function fetchAdminLogs(
  serverBase: string,
  page = 1,
  limit = 10,
  signal?: AbortSignal,
): Promise<AdminLogsResponse> {
  const url = new URL('/api/admin/logs', serverBase)
  url.searchParams.set('page', String(page))
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url.toString(), { credentials: 'include', signal })
  return readJson<AdminLogsResponse>(response)
}

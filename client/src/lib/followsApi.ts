// Follow API helpers
// ใช้แปลง response ของระบบติดตามให้เป็น shape เดียวกันฝั่ง client
interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

interface FollowProfileRecord {
  id: string
  display_name: string
  avatar_url?: string | null
}

interface FollowEdgeRecord {
  follower_id?: string
  following_id?: string
  created_at: string
  profiles?: FollowProfileRecord | FollowProfileRecord[] | null
}

export interface FollowUser {
  id: string
  displayName: string
  handle: string
  avatarUrl?: string | null
  createdAt: string
}

function createHandle(displayName: string, id: string) {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^[.]+|[.]+$)/g, '')

  return slug || id.slice(0, 8).toLowerCase()
}

function normalizeSingle<T>(value?: T | T[] | null) {
  if (!value) {
    return null
  }

  // Supabase relation อาจคืน object เดี่ยวหรือ array 1 รายการ
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function toFollowUser(record: FollowEdgeRecord): FollowUser {
  const profile = normalizeSingle(record.profiles)
  const id = profile?.id ?? record.follower_id ?? record.following_id ?? 'unknown'
  const displayName = profile?.display_name ?? 'KU Member'

  return {
    id,
    displayName,
    handle: createHandle(displayName, id),
    avatarUrl: profile?.avatar_url ?? null,
    createdAt: record.created_at,
  }
}

async function readJson<T>(response: Response) {
  const body = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Request failed')
  }

  return body.data
}

export async function fetchFollowers(serverBase: string, userId: string): Promise<FollowUser[]> {
  const response = await fetch(`${serverBase}/api/follows/${userId}/followers`, {
    credentials: 'include',
  })

  const data = await readJson<{ followers: FollowEdgeRecord[] }>(response)
  return (data.followers ?? []).map(toFollowUser)
}

export async function fetchFollowing(serverBase: string, userId: string): Promise<FollowUser[]> {
  const response = await fetch(`${serverBase}/api/follows/${userId}/following`, {
    credentials: 'include',
  })

  const data = await readJson<{ following: FollowEdgeRecord[] }>(response)
  return (data.following ?? []).map(toFollowUser)
}

export async function fetchFollowStatus(serverBase: string, userId: string): Promise<boolean> {
  const response = await fetch(`${serverBase}/api/follows/${userId}/status`, {
    credentials: 'include',
  })

  const data = await readJson<{ is_following: boolean }>(response)
  return data.is_following
}

export async function followUser(serverBase: string, userId: string): Promise<void> {
  const response = await fetch(`${serverBase}/api/follows/${userId}`, {
    method: 'POST',
    credentials: 'include',
  })

  await readJson<{ following: boolean }>(response)
}

export async function unfollowUser(serverBase: string, userId: string): Promise<void> {
  const response = await fetch(`${serverBase}/api/follows/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  await readJson<{ following: boolean }>(response)
}

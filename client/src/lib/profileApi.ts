import type { Post, Role, UserProfile } from '../types'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

interface ProfileApiRecord {
  id: string
  display_name: string
  role: string
  created_at: string
  avatar_url?: string | null
  cover_url?: string | null
  follower_count?: number
  following_count?: number
  post_count?: number
  status?: 'active' | 'banned'
}

interface CountRecord {
  count: number
}

interface ProfilePostRecord {
  id: string
  content: string
  image_url: string | null
  created_at: string
  updated_at: string | null
  likes?: CountRecord[]
  comments?: CountRecord[]
}

interface ProfilePostsApiRecord {
  profile: ProfileApiRecord
  posts: ProfilePostRecord[]
  total: number
  page: number
  limit: number
}

export interface ProfilePageData {
  profile: UserProfile
  joinedAt: string
  postCount: number
  followerCount: number
  followingCount: number
  posts: Post[]
}

function normalizeRole(role: string): Role {
  return role === 'admin' ? 'admin' : 'member'
}

function createHandle(displayName: string, id: string) {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^[.]+|[.]+$)/g, '')

  return slug || id.slice(0, 8).toLowerCase()
}

function toCount(value?: CountRecord[]) {
  return value?.[0]?.count ?? 0
}

function toUserProfile(profile: ProfileApiRecord): UserProfile {
  return {
    id: profile.id,
    displayName: profile.display_name,
    handle: createHandle(profile.display_name, profile.id),
    role: normalizeRole(profile.role),
    status: profile.status ?? 'active',
    avatarUrl: profile.avatar_url ?? null,
    coverUrl: profile.cover_url ?? null,
  }
}

function toPost(post: ProfilePostRecord, profile: UserProfile): Post {
  return {
    id: post.id,
    author: {
      id: profile.id,
      name: profile.displayName,
      handle: profile.handle,
      role: profile.role,
      avatarUrl: profile.avatarUrl ?? null,
    },
    content: post.content,
    image: post.image_url ?? undefined,
    createdAt: post.created_at,
    updatedAt: post.updated_at ?? undefined,
    likes: toCount(post.likes),
    comments: toCount(post.comments),
    shares: 0,
  }
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    credentials: 'include',
  })

  const body = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Request failed')
  }

  return body.data
}

export async function fetchProfilePageData(serverBase: string, userId: string): Promise<ProfilePageData> {
  const [profileData, postsData] = await Promise.all([
    fetchJson<ProfileApiRecord>(`${serverBase}/api/profile/${userId}`),
    fetchJson<ProfilePostsApiRecord>(`${serverBase}/api/profile/${userId}/posts`),
  ])

  const profile = toUserProfile(profileData)

  return {
    profile,
    joinedAt: profileData.created_at,
    postCount: profileData.post_count ?? postsData.total ?? 0,
    followerCount: profileData.follower_count ?? 0,
    followingCount: profileData.following_count ?? 0,
    posts: postsData.posts.map((post) => toPost(post, profile)),
  }
}

export async function updateProfileDisplayName(
  serverBase: string,
  userId: string,
  displayName: string,
): Promise<UserProfile> {
  const response = await fetch(`${serverBase}/api/profile/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ display_name: displayName }),
  })

  const body = (await response.json()) as ApiEnvelope<ProfileApiRecord>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Failed to update profile')
  }

  return toUserProfile(body.data)
}

export async function updateProfileImages(
  serverBase: string,
  userId: string,
  payload: {
    avatar_base64?: string
    avatar_type?: string
    cover_base64?: string
    cover_type?: string
    remove_avatar?: boolean
    remove_cover?: boolean
  },
): Promise<UserProfile> {
  const response = await fetch(`${serverBase}/api/profile/${userId}/images`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const body = (await response.json()) as ApiEnvelope<ProfileApiRecord>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Failed to update profile images')
  }

  return toUserProfile(body.data)
}

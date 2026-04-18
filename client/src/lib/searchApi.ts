import type { Post, Role, UserProfile } from '../types'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

interface CountRecord {
  count?: number | null
}

interface ProfileRecord {
  id: string
  display_name: string
  avatar_url?: string | null
  role?: Role
  created_at?: string
}

interface PostRecord {
  id: string
  title: string | null
  content: string
  image_url: string | null
  created_at: string
  profiles?: ProfileRecord | ProfileRecord[] | null
  likes?: CountRecord[] | null
  comments?: CountRecord[] | null
}

export type SearchType = 'posts' | 'hashtag' | 'users'

export interface SearchResults<T> {
  type: SearchType
  query: string
  results: T[]
  total: number
  page: number
  limit: number
}

function normalizeProfile(value?: ProfileRecord | ProfileRecord[] | null) {
  if (!value) {
    return null
  }

  return Array.isArray(value) ? (value[0] ?? null) : value
}

function readCount(value?: CountRecord[] | null) {
  return value?.[0]?.count ?? 0
}

function createHandle(displayName: string, id: string) {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^[.]+|[.]+$)/g, '')

  return slug || id.slice(0, 8).toLowerCase()
}

function toPost(record: PostRecord): Post {
  const profile = normalizeProfile(record.profiles)
  const authorId = profile?.id ?? 'unknown'
  const authorName = profile?.display_name ?? 'KU Member'

  return {
    id: record.id,
    title: record.title ?? undefined,
    author: {
      id: authorId,
      name: authorName,
      handle: createHandle(authorName, authorId),
      role: 'member',
      avatarUrl: profile?.avatar_url ?? null,
    },
    content: record.content,
    image: record.image_url ?? undefined,
    createdAt: record.created_at,
    likes: readCount(record.likes),
    comments: readCount(record.comments),
    shares: 0,
    likedByMe: false,
  }
}

function toUser(record: ProfileRecord): UserProfile {
  const displayName = record.display_name
  const userId = record.id
  const role: Role = record.role === 'admin' ? 'admin' : 'member'

  return {
    id: userId,
    displayName,
    handle: createHandle(displayName, userId),
    role,
    status: 'active',
    avatarUrl: record.avatar_url ?? null,
  }
}

async function readJson<T>(response: Response) {
  const body = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Request failed')
  }

  return body.data
}

export async function searchPosts(
  serverBase: string,
  query: string,
  type: SearchType,
  page = 1,
  limit = 20,
  signal?: AbortSignal,
): Promise<SearchResults<Post> | SearchResults<UserProfile>> {
  const url = new URL('/api/search', serverBase)
  url.searchParams.set('q', query)
  url.searchParams.set('type', type)
  url.searchParams.set('page', String(page))
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url.toString(), {
    credentials: 'include',
    signal,
  })

  if (type === 'users') {
    const data = await readJson<SearchResults<ProfileRecord>>(response)
    return {
      ...data,
      results: data.results.map(toUser),
    }
  }

  const data = await readJson<SearchResults<PostRecord>>(response)
  return {
    ...data,
    results: data.results.map(toPost),
  }
}

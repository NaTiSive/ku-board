import type { Post } from '../types'

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
}

interface BoardPostRecord {
  id: string
  title: string | null
  content: string
  image_url: string | null
  created_at: string
  updated_at: string | null
  profiles?: ProfileRecord | ProfileRecord[] | null
  likes?: CountRecord[] | null
  comments?: CountRecord[] | null
}

interface BoardApiData {
  posts: BoardPostRecord[]
  total: number
  page: number
  limit: number
}

export interface FeedPageData {
  posts: Post[]
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

function normalizeProfile(value?: ProfileRecord | ProfileRecord[] | null) {
  if (!value) {
    return null
  }

  return Array.isArray(value) ? (value[0] ?? null) : value
}

function readCount(value?: CountRecord[] | null) {
  return value?.[0]?.count ?? 0
}

function toPost(record: BoardPostRecord): Post {
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
    updatedAt: record.updated_at ?? undefined,
    likes: readCount(record.likes),
    comments: readCount(record.comments),
    shares: 0,
    likedByMe: false,
  }
}

export async function fetchFeedPage(serverBase: string, page = 1, limit = 20): Promise<FeedPageData> {
  const url = new URL('/api/board', serverBase)
  url.searchParams.set('page', String(page))
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url.toString(), {
    credentials: 'include',
  })

  const body = (await response.json()) as ApiEnvelope<BoardApiData>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Failed to load feed')
  }

  return {
    posts: body.data.posts.map(toPost),
    total: body.data.total,
    page: body.data.page,
    limit: body.data.limit,
  }
}

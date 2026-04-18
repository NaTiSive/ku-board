import type { Comment, Post } from '../types'

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

interface CommentRecord {
  id: string
  content: string
  guest_name: string | null
  created_at: string
  profiles?: ProfileRecord | ProfileRecord[] | null
}

interface PostRecord {
  id: string
  title: string | null
  content: string
  image_url: string | null
  created_at: string
  updated_at: string | null
  profiles?: ProfileRecord | ProfileRecord[] | null
  likes?: CountRecord[] | null
  comments?: CommentRecord[] | null
}

interface LikeStateRecord {
  like_count: number
  is_liked: boolean
}

interface ShareStateRecord {
  share_count: number
}

interface ShareResponseRecord {
  share_url: string
  share_count: number
}

export interface ViewPostData {
  post: Post
  comments: Comment[]
}

export interface LikeState {
  count: number
  isLiked: boolean
}

export interface ShareState {
  count: number
}

export interface ShareResult {
  shareUrl: string
  count: number
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

function toPost(record: PostRecord): Post {
  const profile = normalizeProfile(record.profiles)
  const authorId = profile?.id ?? 'unknown'
  const authorName = profile?.display_name ?? 'KU Member'
  const comments = record.comments ?? []

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
    comments: comments.length,
    shares: 0,
    likedByMe: false,
  }
}

export function toComment(record: CommentRecord): Comment {
  const profile = normalizeProfile(record.profiles)
  const authorId = profile?.id ?? null
  const authorName = profile?.display_name ?? record.guest_name ?? 'Anonymous'

  return {
    id: record.id,
    authorId,
    authorName,
    authorHandle: profile ? createHandle(authorName, authorId ?? 'anonymous') : null,
    authorAvatarUrl: profile?.avatar_url ?? null,
    isAnonymous: !profile,
    createdAt: record.created_at,
    content: record.content,
    role: profile ? 'member' : 'guest',
  }
}

export async function fetchLikeState(serverBase: string, postId: string): Promise<LikeState> {
  const response = await fetch(`${serverBase}/api/posts/${postId}/likes`, {
    credentials: 'include',
  })

  const body = (await response.json()) as ApiEnvelope<LikeStateRecord>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Failed to load like state')
  }

  return {
    count: body.data.like_count,
    isLiked: body.data.is_liked,
  }
}

export async function toggleLike(serverBase: string, postId: string): Promise<LikeState> {
  const response = await fetch(`${serverBase}/api/posts/${postId}/likes`, {
    method: 'POST',
    credentials: 'include',
  })

  const body = (await response.json()) as ApiEnvelope<LikeStateRecord>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Failed to update like')
  }

  return {
    count: body.data.like_count,
    isLiked: body.data.is_liked,
  }
}

export async function createComment(
  serverBase: string,
  postId: string,
  payload: { content: string; guest_name?: string },
): Promise<Comment> {
  const response = await fetch(`${serverBase}/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const body = (await response.json()) as ApiEnvelope<CommentRecord>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Failed to add comment')
  }

  return toComment(body.data)
}

export async function fetchShareState(serverBase: string, postId: string): Promise<ShareState> {
  const response = await fetch(`${serverBase}/api/posts/${postId}/shares`, {
    credentials: 'include',
  })

  const body = (await response.json()) as ApiEnvelope<ShareStateRecord>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Failed to load share count')
  }

  return {
    count: body.data.share_count,
  }
}

export async function recordShare(
  serverBase: string,
  postId: string,
  platform: 'copy_link' | 'web_share' | 'other',
): Promise<ShareResult> {
  const response = await fetch(`${serverBase}/api/posts/${postId}/shares`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ platform }),
  })

  const body = (await response.json()) as ApiEnvelope<ShareResponseRecord>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Failed to share post')
  }

  return {
    shareUrl: body.data.share_url,
    count: body.data.share_count,
  }
}

export async function updatePost(
  serverBase: string,
  postId: string,
  payload: {
    title?: string
    content: string
    image_base64?: string
    image_type?: string
    remove_image?: boolean
  },
): Promise<void> {
  const response = await fetch(`${serverBase}/api/posts/${postId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const body = (await response.json()) as ApiEnvelope<unknown>

  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to update post')
  }
}

export async function deletePost(serverBase: string, postId: string): Promise<void> {
  const response = await fetch(`${serverBase}/api/posts/${postId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  const body = (await response.json()) as ApiEnvelope<unknown>

  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to delete post')
  }
}

export async function fetchPostById(serverBase: string, postId: string): Promise<ViewPostData> {
  const response = await fetch(`${serverBase}/api/posts/${postId}`, {
    credentials: 'include',
  })

  const body = (await response.json()) as ApiEnvelope<PostRecord>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Failed to load post')
  }

  return {
    post: toPost(body.data),
    comments: (body.data.comments ?? []).map(toComment),
  }
}

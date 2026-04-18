export type Role = 'guest' | 'member' | 'admin'

export interface UserProfile {
  id: string
  displayName: string
  handle: string
  role: Role
  status: 'active' | 'banned'
  avatarUrl?: string | null
  coverUrl?: string | null
}

export interface Post {
  id: string
  title?: string
  author: {
    id: string
    name: string
    handle: string
    role: Role
    avatarUrl?: string | null
  }
  content: string
  image?: string
  createdAt: string
  updatedAt?: string
  likes: number
  comments: number
  shares: number
  likedByMe?: boolean
  tags?: string[]
}

export interface Comment {
  id: string
  authorId?: string | null
  authorName: string
  authorHandle?: string | null
  authorAvatarUrl?: string | null
  isAnonymous?: boolean
  createdAt: string
  content: string
  role?: Role
}

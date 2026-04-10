export type Role = 'guest' | 'member' | 'admin'

export interface UserProfile {
  id: string
  displayName: string
  handle: string
  role: Role
  status: 'active' | 'banned'
}

export interface Post {
  id: string
  author: {
    id: string
    name: string
    handle: string
    role: Role
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
  authorName: string
  isAnonymous?: boolean
  createdAt: string
  content: string
  role?: Role
}

import { Link } from 'react-router-dom'
import type { Post } from '../types'
import { useAuth } from '../hooks/useAuth'
import LikeButton from './LikeButton'
import ShareButton from './ShareButton'

interface PostCardProps {
  post: Post
  index?: number
  showReport?: boolean
  showBack?: boolean
}

function formatDate(value: string) {
  const date = new Date(value)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function IconComment() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6h14v9H8l-3 3V6Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h6l9-9-6-6-9 9v6Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconFlag() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3v18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 4h12l-2 4 2 4H6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function PostCard({ post, index = 0, showReport = false, showBack = false }: PostCardProps) {
  const { user, isAdmin, isGuest } = useAuth()
  const isAuthor = user.id === post.author.id
  const canEdit = isAuthor
  const canDelete = isAdmin || isAuthor

  return (
    <article className="card post-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <header className="post-header">
        {showBack && (
          <Link className="icon-button post-back" to="/feed" aria-label="Back">
            <IconBack />
          </Link>
        )}
        <div className="avatar">{post.author.name.slice(0, 1).toUpperCase()}</div>
        <div className="post-meta">
          <strong>{post.author.name}</strong>
          <span className="muted">@{post.author.handle}</span>
        </div>
        <span className="post-time">{formatDate(post.createdAt)}</span>
        {canDelete && (
          <button className="button button-outline button-mini" type="button">
            Delete
          </button>
        )}
      </header>
      <Link className="post-content" to={`/post/${post.id}`}>
        {post.content}
      </Link>
      {post.image && (
        <div className="post-image">
          <img src={post.image} alt="Post visual" />
        </div>
      )}
      <div className="post-actions">
        <LikeButton
          initialCount={post.likes}
          initiallyLiked={post.likedByMe}
          disabledHint={isGuest ? 'Guest like saved to session only' : undefined}
        />
        <Link className="action-button" to={`/post/${post.id}`}>
          <IconComment />
          <span className="action-text">comment</span>
          <span className="action-count">{post.comments}</span>
        </Link>
        <ShareButton shareUrl={new URL(`/post/${post.id}`, window.location.origin).toString()} initialCount={post.shares} />
        {showReport && (
          <button className="action-button" type="button">
            <IconFlag />
            <span className="action-text">report</span>
          </button>
        )}
        {canEdit && (
          <button className="action-button" type="button">
            <IconEdit />
            <span className="action-text">edit</span>
          </button>
        )}
      </div>
      {isGuest && <div className="post-note">Guest actions are limited to session only.</div>}
    </article>
  )
}

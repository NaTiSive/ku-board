import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { Post } from '../types'
import { useAuth } from '../hooks/useAuth'
import { deletePost } from '../lib/postApi'
import { serverBase } from '../lib/serverBase'
import LikeButton from './LikeButton'
import ShareButton from './ShareButton'
import Avatar from './Avatar'

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

function IconMore() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" />
    </svg>
  )
}

export default function PostCard({ post, index = 0, showReport = false, showBack = false }: PostCardProps) {
  const { user, isGuest, isIncognito } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isAuthor = user.id === post.author.id
  const isAdmin = user.role === 'admin'
  const canEditPost = isAuthor
  const canDeletePost = isAuthor || isAdmin
  const authorProfileUrl = post.author.role !== 'guest' && post.author.id !== 'unknown' ? `/profile/${post.author.id}` : null

  const handleEdit = () => {
    setMenuOpen(false)
    navigate(`/post/${post.id}/edit`)
  }

  const handleDelete = async () => {
    if (deleting) {
      return
    }

    let adminReason = ''
    if (isAdmin && !isAuthor) {
      adminReason = window.prompt('Reason for deleting this post as admin:', '')?.trim() ?? ''
      if (!adminReason) {
        return
      }
    }

    const confirmed = window.confirm(
      isAdmin && !isAuthor
        ? 'Delete this post as admin? This action cannot be undone.'
        : 'Delete this post? This action cannot be undone.',
    )
    if (!confirmed) {
      return
    }

    setDeleting(true)
    setMenuOpen(false)

    try {
      await deletePost(serverBase, post.id, adminReason || undefined)

      if (location.pathname === '/feed') {
        navigate(0)
        return
      }

      navigate('/feed')
    } catch {
      setDeleting(false)
    }
  }

  return (
    <article className="card post-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <header className="post-header">
        {showBack && (
          <Link className="icon-button post-back" to="/feed" aria-label="Back">
            <IconBack />
          </Link>
        )}
        {authorProfileUrl ? (
          <Link className="author-link" to={authorProfileUrl} aria-label={`View ${post.author.name}'s profile`}>
            <Avatar name={post.author.name} imageUrl={post.author.avatarUrl} />
          </Link>
        ) : (
          <Avatar name={post.author.name} imageUrl={post.author.avatarUrl} />
        )}
        {authorProfileUrl ? (
          <Link className="post-meta author-meta-link" to={authorProfileUrl}>
            <strong>{post.author.name}</strong>
            <span className="muted">@{post.author.handle}</span>
          </Link>
        ) : (
          <div className="post-meta">
            <strong>{post.author.name}</strong>
            <span className="muted">@{post.author.handle}</span>
          </div>
        )}
        <span className="post-time">{formatDate(post.createdAt)}</span>
        {canDeletePost && (
          <div className="post-menu">
            <button
              className="icon-button"
              type="button"
              aria-label="Post actions"
              onClick={() => setMenuOpen((prev) => !prev)}
              disabled={deleting}
            >
              <IconMore />
            </button>
            {menuOpen && (
              <div className="post-menu-panel">
                {canEditPost && (
                  <button className="post-menu-item" type="button" onClick={handleEdit}>
                    Edit
                  </button>
                )}
                <button className="post-menu-item is-danger" type="button" onClick={handleDelete}>
                  {deleting ? 'Deleting...' : isAdmin && !isAuthor ? 'Delete as Admin' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        )}
      </header>
      {post.title && (
        <Link className="post-title" to={`/post/${post.id}`}>
          {post.title}
        </Link>
      )}
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
          postId={post.id}
          initialCount={post.likes}
          initiallyLiked={post.likedByMe}
          disabled={isGuest}
          disabledHint={isGuest ? 'Sign in with KU mail to like posts.' : undefined}
        />
        <Link className="action-button" to={`/post/${post.id}`}>
          <IconComment />
          <span className="action-text">comment</span>
          <span className="action-count">{post.comments}</span>
        </Link>
        <ShareButton
          postId={post.id}
          shareUrl={new URL(`/post/${post.id}`, window.location.origin).toString()}
          initialCount={post.shares}
        />
        {showReport && !isAuthor && (
          <button className="action-button" type="button">
            <IconFlag />
            <span className="action-text">report</span>
          </button>
        )}
      </div>
      {isGuest && !isIncognito && <div className="post-note">Guest actions are limited to session only.</div>}
    </article>
  )
}

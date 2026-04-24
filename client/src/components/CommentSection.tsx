import { useEffect, useMemo, useState } from 'react'
import type { Comment } from '../types'
import { useAuth } from '../hooks/useAuth'
import { createComment } from '../lib/postApi'
import { serverBase } from '../lib/serverBase'
import Avatar from './Avatar'
import { Link } from 'react-router-dom'

interface CommentSectionProps {
  postId: string
  initialComments: Comment[]
  onCommentAdded?: (_comment: Comment) => void
}

export default function CommentSection({ postId, initialComments, onCommentAdded }: CommentSectionProps) {
  const { isGuest, isIncognito, user } = useAuth()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isAnonymousMode = isGuest || isIncognito
  const label = useMemo(() => {
    if (isIncognito) {
      return 'Incognito User'
    }

    if (isGuest) {
      return 'Anonymous'
    }

    return user.displayName
  }, [isGuest, isIncognito, user.displayName])

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  const handleSubmit = async () => {
    const content = value.trim()

    if (!content || submitting) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const comment = await createComment(serverBase, postId, {
        content,
        ...(isAnonymousMode ? { guest_name: label } : {}),
        ...(isIncognito ? { incognito: true } : {}),
      })

      setComments((prev) => [...prev, comment])
      onCommentAdded?.(comment)
      setValue('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not post comment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="card comment-section">
      <div className="card-header-simple">
        <span className="icon-circle">C</span>
        <h3>Comments</h3>
      </div>
      {isAnonymousMode && (
        <div className="info-banner">
          {isIncognito ? 'Incognito comments appear as ' : 'Guest comments appear as '}
          <strong>{label}</strong>.
        </div>
      )}
      <div className="comment-input">
        <textarea
          rows={3}
          className="text-input"
          placeholder="Write a reply"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={submitting}
        />
        <div className="comment-actions">
          <span className="muted">Posting as {label}</span>
          <button className="button button-primary button-mini" type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Posting...' : 'Comment'}
          </button>
        </div>
        {error && <div className="login-error">{error}</div>}
      </div>
      <div className="comment-list">
        {comments.map((comment) => (
          <div className="comment-item" key={comment.id}>
            {comment.authorId ? (
              <Link className="author-link" to={`/profile/${comment.authorId}`} aria-label={`View ${comment.authorName}'s profile`}>
                <Avatar name={comment.authorName} imageUrl={comment.authorAvatarUrl} className="comment-avatar" />
              </Link>
            ) : (
              <Avatar name={comment.authorName} imageUrl={comment.authorAvatarUrl} className="comment-avatar" />
            )}
            <div className="comment-body">
              <div className="comment-head">
                {comment.authorId ? (
                  <Link className="comment-author-link" to={`/profile/${comment.authorId}`}>
                    <strong>{comment.authorName}</strong>
                    {comment.authorHandle ? <span className="muted">@{comment.authorHandle}</span> : null}
                  </Link>
                ) : (
                  <strong>{comment.authorName}</strong>
                )}
                <span className="muted">{new Date(comment.createdAt).toLocaleString('en-US')}</span>
              </div>
              <p>{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

import { useMemo, useState } from 'react'
import type { Comment } from '../types'
import { useAuth } from '../hooks/useAuth'

interface CommentSectionProps {
  initialComments: Comment[]
}

export default function CommentSection({ initialComments }: CommentSectionProps) {
  const { isGuest, user } = useAuth()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [value, setValue] = useState('')

  const label = useMemo(() => (isGuest ? 'Anonymous' : user.displayName), [isGuest, user.displayName])

  const handleSubmit = () => {
    if (!value.trim()) return
    const newComment: Comment = {
      id: `comment-${comments.length + 1}`,
      authorName: label,
      isAnonymous: isGuest,
      createdAt: new Date().toISOString(),
      content: value.trim(),
    }
    setComments((prev) => [newComment, ...prev])
    setValue('')
  }

  return (
    <section className="card comment-section">
      <div className="card-header-simple">
        <span className="icon-circle">C</span>
        <h3>Comments</h3>
      </div>
      {isGuest && (
        <div className="info-banner">
          Guest comments appear as <strong>Anonymous</strong>.
        </div>
      )}
      <div className="comment-input">
        <textarea
          rows={3}
          className="text-input"
          placeholder="Write a reply"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="comment-actions">
          <span className="muted">Posting as {label}</span>
          <button className="button button-primary button-mini" type="button" onClick={handleSubmit}>
            Comment
          </button>
        </div>
      </div>
      <div className="comment-list">
        {comments.map((comment) => (
          <div className="comment-item" key={comment.id}>
            <div className="comment-head">
              <strong>{comment.authorName}</strong>
              <span className="muted">{new Date(comment.createdAt).toLocaleString('en-US')}</span>
            </div>
            <p>{comment.content}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

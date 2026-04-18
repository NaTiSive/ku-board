import { useEffect, useState } from 'react'
import { fetchLikeState, toggleLike } from '../lib/postApi'
import { serverBase } from '../lib/serverBase'

interface LikeButtonProps {
  postId: string
  initialCount: number
  initiallyLiked?: boolean
  disabled?: boolean
  disabledHint?: string
}

function IconLike() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 11v8h10l2-6-6-6-2 4H7Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 11H4v8h3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export default function LikeButton({
  postId,
  initialCount,
  initiallyLiked = false,
  disabled = false,
  disabledHint,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initiallyLiked)
  const [count, setCount] = useState(initialCount)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadLikeState = async () => {
      try {
        const state = await fetchLikeState(serverBase, postId)

        if (cancelled) {
          return
        }

        setLiked(state.isLiked)
        setCount(state.count)
      } catch {
        // Keep the incoming values if the live sync fails.
      }
    }

    void loadLikeState()

    return () => {
      cancelled = true
    }
  }, [initialCount, initiallyLiked, postId])

  const handleToggleLike = async () => {
    if (disabled || submitting) {
      return
    }

    setSubmitting(true)

    try {
      const state = await toggleLike(serverBase, postId)
      setLiked(state.isLiked)
      setCount(state.count)
    } catch {
      // Keep the current UI state if the request fails.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <button
      className={`action-button ${liked ? 'is-active' : ''}`}
      onClick={handleToggleLike}
      type="button"
      title={disabledHint}
      disabled={disabled || submitting}
    >
      <IconLike />
      <span className="action-text">like</span>
      <span className="action-count">{count}</span>
    </button>
  )
}

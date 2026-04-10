import { useState } from 'react'

interface LikeButtonProps {
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
  initialCount,
  initiallyLiked = false,
  disabled = false,
  disabledHint,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initiallyLiked)
  const [count, setCount] = useState(initialCount)

  const toggleLike = () => {
    if (disabled) {
      return
    }
    setLiked((prev) => {
      setCount((countValue) => countValue + (prev ? -1 : 1))
      return !prev
    })
  }

  return (
    <button
      className={`action-button ${liked ? 'is-active' : ''}`}
      onClick={toggleLike}
      type="button"
      title={disabledHint}
      disabled={disabled}
    >
      <IconLike />
      <span className="action-text">like</span>
      <span className="action-count">{count}</span>
    </button>
  )
}

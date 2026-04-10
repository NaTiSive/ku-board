import { useState } from 'react'

interface ShareButtonProps {
  shareUrl: string
  initialCount: number
}

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v10" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8 9 4-4 4 4" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M5 13v6h14v-6" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  )
}

export default function ShareButton({ shareUrl, initialCount }: ShareButtonProps) {
  const [count, setCount] = useState(initialCount)
  const [status, setStatus] = useState('')

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'KUBoard',
          text: 'Campus-only updates on KUBoard',
          url: shareUrl,
        })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        setStatus('Link copied')
        setTimeout(() => setStatus(''), 2000)
      }
      setCount((prev) => prev + 1)
    } catch {
      setStatus('Share canceled')
      setTimeout(() => setStatus(''), 2000)
    }
  }

  return (
    <button className="action-button" onClick={handleShare} type="button">
      <IconShare />
      <span className="action-text">share</span>
      <span className="action-count">{count}</span>
      {status && <span className="action-status">{status}</span>}
    </button>
  )
}

import { useEffect, useState } from 'react'
import { fetchShareState, recordShare } from '../lib/postApi'
import { serverBase } from '../lib/serverBase'

interface ShareButtonProps {
  postId: string
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

export default function ShareButton({ postId, shareUrl, initialCount }: ShareButtonProps) {
  const [count, setCount] = useState(initialCount)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadShareCount = async () => {
      try {
        const data = await fetchShareState(serverBase, postId)
        if (!cancelled) {
          setCount(data.count)
        }
      } catch {
        if (!cancelled) {
          setCount(initialCount)
        }
      }
    }

    void loadShareCount()

    return () => {
      cancelled = true
    }
  }, [initialCount, postId])

  const clearStatusLater = () => {
    window.setTimeout(() => setStatus(''), 2000)
  }

  const handleShare = async () => {
    if (loading) {
      return
    }

    setLoading(true)

    try {
      const platform = ('share' in navigator) ? 'web_share' : ('clipboard' in navigator) ? 'copy_link' : 'other'
      const result = await recordShare(serverBase, postId, platform)
      const resolvedShareUrl = result.shareUrl || shareUrl

      if (navigator.share) {
        await navigator.share({
          title: 'KUBoard',
          text: 'Campus-only updates on KUBoard',
          url: resolvedShareUrl,
        })
        setStatus('Shared')
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(resolvedShareUrl)
        setStatus('Link copied')
      } else {
        window.prompt('Copy this link', resolvedShareUrl)
        setStatus('Link ready')
      }

      setCount(result.count)
      clearStatusLater()
    } catch {
      setStatus('Share canceled')
      clearStatusLater()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button className="action-button" onClick={handleShare} type="button" disabled={loading}>
      <IconShare />
      <span className="action-text">share</span>
      <span className="action-count">{count}</span>
      {status && <span className="action-status">{status}</span>}
    </button>
  )
}

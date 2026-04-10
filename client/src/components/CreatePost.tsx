import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function CreatePost() {
  const { isGuest } = useAuth()
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const remaining = useMemo(() => 280 - content.length, [content.length])
  const isLocked = isGuest

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  return (
    <section className={`card create-post ${isLocked ? 'is-locked' : ''}`}>
      <div className="create-post-header">
        <button className="icon-button" type="button" aria-label="Close" onClick={() => navigate('/feed')}>
          <span className="icon-dot">x</span>
        </button>
        <h2>Create Post</h2>
        <span className="muted">{remaining}</span>
      </div>
      <textarea
        className="text-input create-post-input"
        rows={4}
        value={content}
        placeholder="Write post content here"
        onChange={(event) => setContent(event.target.value)}
        disabled={isLocked}
      />
      <label className="upload-box">
        {preview ? <img src={preview} alt="Preview" /> : <span>Click to insert pictures</span>}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          disabled={isLocked}
        />
      </label>
      {isLocked && (
        <div className="info-banner">
          Guest mode: sign in with KU mail to create posts and upload images.
        </div>
      )}
      <div className="create-post-footer">
        <button className="button button-primary" type="button" disabled={isLocked || !content.trim()}>
          Post
        </button>
        <button className="button button-outline" type="button" onClick={() => setContent('')}>
          Clear
        </button>
      </div>
    </section>
  )
}

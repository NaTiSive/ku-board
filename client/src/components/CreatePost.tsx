import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { serverBase } from '../lib/serverBase'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

interface CreatedPostResponse {
  id: string
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Could not read the selected image'))
    }
    reader.onerror = () => reject(new Error('Could not read the selected image'))
    reader.readAsDataURL(file)
  })
}

export default function CreatePost() {
  const { isGuest } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const remaining = useMemo(() => 5000 - content.length, [content.length])
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

    if (preview) {
      URL.revokeObjectURL(preview)
    }

    if (!file) {
      setImageFile(null)
      setPreview(null)
      return
    }

    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      setError('Please add some content before posting.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload: {
        title?: string
        content: string
        image_base64?: string
        image_type?: string
      } = {
        content: trimmedContent,
      }

      if (trimmedTitle) {
        payload.title = trimmedTitle
      }

      if (imageFile) {
        payload.image_base64 = await readFileAsDataUrl(imageFile)
        payload.image_type = imageFile.type
      }

      const response = await fetch(`${serverBase}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const body = (await response.json()) as ApiEnvelope<CreatedPostResponse>

      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error || 'Failed to create post')
      }

      navigate('/feed')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create post')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClear = () => {
    if (preview) {
      URL.revokeObjectURL(preview)
    }

    setTitle('')
    setContent('')
    setImageFile(null)
    setPreview(null)
    setError('')
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
      <input
        className="text-input"
        type="text"
        value={title}
        placeholder="Add a title"
        onChange={(event) => setTitle(event.target.value)}
        disabled={isLocked || submitting}
      />
      <textarea
        className="text-input create-post-input"
        rows={4}
        value={content}
        placeholder="Write post content here"
        onChange={(event) => setContent(event.target.value)}
        disabled={isLocked || submitting}
      />
      <label className="upload-box">
        {preview ? <img src={preview} alt="Preview" /> : <span>Click to insert pictures</span>}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          disabled={isLocked || submitting}
        />
      </label>
      {error && <div className="login-error">{error}</div>}
      {isLocked && (
        <div className="info-banner">
          Guest mode: sign in with KU mail to create posts and upload images.
        </div>
      )}
      <div className="create-post-footer">
        <button
          className="button button-primary"
          type="button"
          onClick={handleSubmit}
          disabled={isLocked || submitting || !content.trim()}
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
        <button
          className="button button-outline"
          type="button"
          onClick={handleClear}
          disabled={submitting}
        >
          Clear
        </button>
      </div>
    </section>
  )
}

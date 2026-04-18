import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePost } from '../lib/postApi'
import { serverBase } from '../lib/serverBase'

interface EditPostProps {
  postId: string
  initialTitle?: string
  initialContent: string
  initialImage?: string
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

export default function EditPost({ postId, initialTitle, initialContent, initialImage }: EditPostProps) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(initialTitle ?? '')
  const [content, setContent] = useState(initialContent)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initialImage ?? null)
  const [removeImage, setRemoveImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTitle(initialTitle ?? '')
    setContent(initialContent)
    setPreview(initialImage ?? null)
    setImageFile(null)
    setRemoveImage(false)
  }, [initialContent, initialImage, initialTitle])

  useEffect(() => {
    return () => {
      if (imageFile && preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [imageFile, preview])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (imageFile && preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }

    if (!file) {
      setImageFile(null)
      setPreview(initialImage ?? null)
      return
    }

    setImageFile(file)
    setPreview(URL.createObjectURL(file))
    setRemoveImage(false)
  }

  const handleRemoveImage = () => {
    if (imageFile && preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }

    setImageFile(null)
    setPreview(null)
    setRemoveImage(true)
  }

  const handleSave = async () => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      setError('Please add some content before saving.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload: {
        title: string
        content: string
        image_base64?: string
        image_type?: string
        remove_image?: boolean
      } = {
        title: trimmedTitle,
        content: trimmedContent,
      }

      if (imageFile) {
        payload.image_base64 = await readFileAsDataUrl(imageFile)
        payload.image_type = imageFile.type
      } else if (removeImage) {
        payload.remove_image = true
      }

      await updatePost(serverBase, postId, payload)
      navigate(`/post/${postId}`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card edit-post">
      <div className="create-post-header">
        <button className="icon-button" type="button" aria-label="Close" onClick={() => navigate(`/post/${postId}`)}>
          <span className="icon-dot">x</span>
        </button>
        <h2>Edit Post</h2>
        <span className="muted">{content.trim().length}/5000</span>
      </div>
      <input
        className="text-input"
        type="text"
        value={title}
        placeholder="Add a title"
        onChange={(event) => setTitle(event.target.value)}
        disabled={saving}
      />
      <textarea
        rows={5}
        className="text-input create-post-input"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={saving}
      />
      <label className="upload-box">
        {preview ? <img src={preview} alt="Preview" /> : <span>Click to replace picture</span>}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          disabled={saving}
        />
      </label>
      {preview && (
        <div className="edit-post-row">
          <button className="button button-outline" type="button" onClick={handleRemoveImage} disabled={saving}>
            Remove image
          </button>
        </div>
      )}
      {error && <div className="login-error">{error}</div>}
      <div className="create-post-footer">
        <button className="button button-primary" type="button" onClick={handleSave} disabled={saving || !content.trim()}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button className="button button-outline" type="button" onClick={() => navigate(`/post/${postId}`)} disabled={saving}>
          Cancel
        </button>
      </div>
    </section>
  )
}

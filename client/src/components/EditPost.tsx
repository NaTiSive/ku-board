import { useState } from 'react'

interface EditPostProps {
  initialContent: string
  initialImage?: string
  onCancel: () => void
}

export default function EditPost({ initialContent, initialImage, onCancel }: EditPostProps) {
  const [content, setContent] = useState(initialContent)
  const [image, setImage] = useState(initialImage ?? '')

  return (
    <section className="card edit-post">
      <div className="card-header">
        <div>
          <p className="eyebrow">post.edit</p>
          <h3>Edit your post</h3>
        </div>
        <button className="button button-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <textarea
        rows={4}
        className="text-input"
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <div className="edit-post-row">
        <input
          className="text-input"
          placeholder="Image URL (optional)"
          value={image}
          onChange={(event) => setImage(event.target.value)}
        />
        <button className="button button-primary" type="button">
          Save edits
        </button>
      </div>
      <p className="muted">If the image changes, the old file will be removed from Storage.</p>
    </section>
  )
}

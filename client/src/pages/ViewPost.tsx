import { useParams } from 'react-router-dom'
import PostCard from '../components/PostCard'
import CommentSection from '../components/CommentSection'
import { mockComments, mockPosts } from '../data/mockFeed'

export default function ViewPost() {
  const { id } = useParams()
  const post = mockPosts.find((item) => item.id === id)

  if (!post) {
    return (
      <section className="page">
        <div className="card">
          <h2>Post not found</h2>
          <p className="muted">The shareable link may be outdated.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <PostCard post={post} />
      <CommentSection initialComments={mockComments} />
    </section>
  )
}

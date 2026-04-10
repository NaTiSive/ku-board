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
      <div className="feed-layout">
        <div className="feed-main">
          <PostCard post={post} showReport showBack />
          <CommentSection initialComments={mockComments} />
        </div>
        <aside className="feed-side">
          <div className="side-header">Recent Updates</div>
          <div className="side-list">
            <div className="side-item">Dorm swap updates</div>
            <div className="side-item">KU Music Night</div>
            <div className="side-item">Library open late</div>
          </div>
        </aside>
      </div>
    </section>
  )
}

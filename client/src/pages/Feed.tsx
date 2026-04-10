import PostCard from '../components/PostCard'
import { useAuth } from '../hooks/useAuth'
import { mockPosts } from '../data/mockFeed'

export default function FeedPage() {
  const { isGuest } = useAuth()

  return (
    <section className="page">
      {isGuest && (
        <div className="card incognito-banner">
          <strong>You're in Incognito mode</strong>
          <span className="muted">Guest mode disclaimer</span>
        </div>
      )}
      <div className="feed-layout">
        <div className="feed-main">
          {mockPosts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))}
        </div>
        <aside className="feed-side">
          <div className="side-header">Recent Updates</div>
          <div className="side-list">
            <div className="side-item">Dorm swap requests open</div>
            <div className="side-item">KU Music Night tickets</div>
            <div className="side-item">Library hours extended</div>
          </div>
        </aside>
      </div>
    </section>
  )
}

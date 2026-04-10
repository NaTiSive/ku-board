import { useMemo } from 'react'
import PostCard from '../components/PostCard'
import { mockPosts } from '../data/mockFeed'

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4.5 7.5 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  )
}

export default function Profile() {
  const profileUser = useMemo(() => mockPosts[0]?.author, [])
  const profilePosts = useMemo(
    () => mockPosts.filter((post) => post.author.id === profileUser?.id),
    [profileUser],
  )

  if (!profileUser) {
    return (
      <section className="page">
        <div className="card">
          <h2>No profile data</h2>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="feed-layout">
        <div className="feed-main">
          <div className="card profile-frame">
            <div className="profile-cover">
              <span>Cover picture</span>
              <div className="cover-controls">
                <button className="icon-button" type="button" aria-label="Back">
                  <IconBack />
                </button>
                <button className="icon-button" type="button" aria-label="Menu">
                  <IconMenu />
                </button>
              </div>
            </div>
            <div className="profile-row">
              <div className="profile-avatar">{profileUser.name.slice(0, 1)}</div>
              <div className="profile-info">
                <h2>{profileUser.name}</h2>
                <span className="muted">@{profileUser.handle}</span>
              </div>
              <div className="profile-actions">
                <button className="icon-button" type="button" aria-label="Message">
                  <IconMail />
                </button>
                <button className="button button-outline" type="button">
                  Follow
                </button>
              </div>
            </div>
          </div>

          {profilePosts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))}
        </div>
        <aside className="feed-side">
          <div className="side-header">Recent Updates</div>
          <div className="side-list">
            <div className="side-item">Faculty fair this week</div>
            <div className="side-item">New lab openings</div>
            <div className="side-item">Club recruitment open</div>
          </div>
        </aside>
      </div>
    </section>
  )
}

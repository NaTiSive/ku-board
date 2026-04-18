// client/src/pages/CreatePostPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Page for creating a new post. Renders the create post form and sidebar.
// ─────────────────────────────────────────────────────────────────────────────

import CreatePost from '../components/CreatePost'
import RecentUpdatesSidebar from '../components/RecentUpdatesSidebar'

export default function CreatePostPage() {
  return (
    <section className="page">
      <div className="feed-layout">
        <div className="feed-main">
          <CreatePost />
        </div>
        <RecentUpdatesSidebar />
      </div>
    </section>
  )
}

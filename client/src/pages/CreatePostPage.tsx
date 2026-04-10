import CreatePost from '../components/CreatePost'

export default function CreatePostPage() {
  return (
    <section className="page">
      <div className="feed-layout">
        <div className="feed-main">
          <CreatePost />
        </div>
        <aside className="feed-side">
          <div className="side-header">Recent Updates</div>
          <div className="side-list">
            <div className="side-item">Campus market night</div>
            <div className="side-item">New internship posts</div>
            <div className="side-item">Library extended hours</div>
          </div>
        </aside>
      </div>
    </section>
  )
}

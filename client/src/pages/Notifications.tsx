const notifications = [
  'Displayname replied to your comment',
  'Displayname commented on your post',
  'Your post gained 25,500 likes',
  'You have a new message',
]

export default function Notifications() {
  return (
    <section className="page">
      <div className="card">
        <div className="card-header-simple">
          <span className="icon-circle">!</span>
          <h2>Notification</h2>
        </div>
        <div className="list-stack">
          {notifications.map((item) => (
            <div className="list-item" key={item}>
              <span className="list-icon">@</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

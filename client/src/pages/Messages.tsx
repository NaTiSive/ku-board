const messages = [
  'Message from KU Admin',
  'Study group: 7pm at library',
]

export default function Messages() {
  return (
    <section className="page">
      <div className="card">
        <div className="card-header-simple">
          <span className="icon-circle">MSG</span>
          <h2>Messages</h2>
        </div>
        <div className="list-stack">
          {messages.map((item) => (
            <div className="list-item" key={item}>
              <span className="list-icon">MSG</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

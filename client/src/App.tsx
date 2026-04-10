import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import NavigationBar from './components/NavigationBar'
import FeedPage from './pages/Feed'
import Login from './pages/Login'
import CreateAccount from './pages/CreateAccount'
import Profile from './pages/Profile'
import ViewPost from './pages/ViewPost'
import AccountManagement from './pages/admin/AccountManagement'
import CreatePostPage from './pages/CreatePostPage'
import Notifications from './pages/Notifications'
import Messages from './pages/Messages'
import Settings from './pages/Settings'

function NotFound() {
  return (
    <section className="page">
      <div className="card hero-card">
        <p className="eyebrow">Lost in the quad</p>
        <h1>We could not find that page.</h1>
        <p className="muted">Check the link or head back to the main board.</p>
      </div>
    </section>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  )
}

function AppLayout() {
  const location = useLocation()
  const isAuthRoute =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/create-account'

  return (
    <div className={`app-shell ${isAuthRoute ? 'auth-shell' : ''}`}>
      {!isAuthRoute && <NavigationBar />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/create" element={<CreatePostPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/post/:id" element={<ViewPost />} />
          <Route path="/admin/accounts" element={<AccountManagement />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAuthRoute && (
        <footer className="app-footer">
          <div>
            <strong>KUBoard</strong> is a campus-only board. Guests can read. KU members can post.
          </div>
          <div className="footer-links">
            <span>Realtime feed</span>
            <span>Safe sharing</span>
            <span>Admin-ready</span>
          </div>
        </footer>
      )}
    </div>
  )
}

export default App

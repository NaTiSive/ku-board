import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import NavigationBar from './components/NavigationBar'
import { useAuth } from './hooks/useAuth'
import FeedPage from './pages/Feed'
import Login from './pages/Login'
import CreateAccount from './pages/CreateAccount'
import Profile from './pages/Profile'
import ViewPost from './pages/ViewPost'
import EditPostPage from './pages/EditPostPage'
import AccountManagement from './pages/admin/AccountManagement'
import CreatePostPage from './pages/CreatePostPage'
import Notifications from './pages/Notifications'
import SearchPage from './pages/Search'
import BannedPage from './pages/Banned'
import WelcomeChoice from './pages/WelcomeChoice'
import { hasGuestAccessApproval } from './lib/guestAccess'

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
  const { loading, user, isGuest, isIncognito } = useAuth()
  const location = useLocation()
  const isAuthRoute =
    location.pathname === '/' ||
    location.pathname === '/welcome' ||
    location.pathname === '/login' ||
    location.pathname === '/create-account'
  const isBannedRoute = location.pathname === '/banned'
  const isBannedUser = user.status === 'banned'
  const useCompactShell = isAuthRoute || isBannedRoute
  const isApprovedGuest = hasGuestAccessApproval()
  const shouldShowVisitorChoice = !loading && isGuest && !isIncognito && !isAuthRoute && !isBannedRoute && !isApprovedGuest

  if (shouldShowVisitorChoice) {
    const redirect = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/welcome?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  if (!loading && isBannedUser && !isBannedRoute) {
    return <Navigate to="/banned" replace />
  }

  if (!loading && !isBannedUser && isBannedRoute) {
    return <Navigate to="/feed" replace />
  }

  return (
    <div className={`app-shell ${useCompactShell ? 'auth-shell' : ''}`}>
      {!useCompactShell && <NavigationBar />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<WelcomeChoice />} />
          <Route path="/welcome" element={<WelcomeChoice />} />
          <Route path="/banned" element={<BannedPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/create" element={<CreatePostPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/profile/:userId?" element={<Profile />} />
          <Route path="/post/:id" element={<ViewPost />} />
          <Route path="/post/:id/edit" element={<EditPostPage />} />
          <Route path="/admin/accounts" element={<AccountManagement />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!useCompactShell && (
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

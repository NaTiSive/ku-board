// client/src/pages/Search.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Search page for posts, hashtags, and users.
// Uses the search API and renders results in a client-side UI.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PostCard from '../components/PostCard'
import { useAuth } from '../hooks/useAuth'
import { searchPosts, type SearchType } from '../lib/searchApi'
import { serverBase } from '../lib/serverBase'
import type { Post, UserProfile } from '../types'

function normalizeType(value: string | null): SearchType {
  if (value === 'hashtag' || value === 'users' || value === 'posts') {
    return value
  }

  return 'posts'
}

function normalizeQuery(value: string | null) {
  return (value ?? '').trim()
}

export default function SearchPage() {
  const { isGuest } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const type = useMemo(() => normalizeType(searchParams.get('type')), [searchParams])
  const query = useMemo(() => normalizeQuery(searchParams.get('q')), [searchParams])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])

  useEffect(() => {
    if (!query) {
      setPosts([])
      setUsers([])
      setLoading(false)
      setError('')
      return
    }

    const controller = new AbortController()
    let cancelled = false

    async function run() {
      setLoading(true)
      setError('')

      try {
        const result = await searchPosts(serverBase, query, type, 1, 20, controller.signal)

        if (cancelled) {
          return
        }

        if (result.type === 'users') {
          setUsers(result.results as UserProfile[])
          setPosts([])
        } else {
          setPosts(result.results as Post[])
          setUsers([])
        }
      } catch (searchError) {
        if (!cancelled && !controller.signal.aborted) {
          setError(searchError instanceof Error ? searchError.message : 'Search failed')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [query, type])

  const handleSetType = (nextType: SearchType) => {
    const next = new URLSearchParams(searchParams)
    next.set('type', nextType)
    setSearchParams(next)
  }

  return (
    <section className="page">
      <div className="feed-layout">
        <div className="feed-main">
          <div className="card">
            <div className="card-header-simple">
              <span className="icon-circle">S</span>
              <h2>Search</h2>
            </div>

            <div className="admin-tools">
              <span className="muted">
                {query ? `Results for "${query}"` : 'Type in the search box above.'}
              </span>
              <div className="profile-actions">
                <button
                  className={`button button-outline button-mini ${type === 'posts' ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => handleSetType('posts')}
                  disabled={!query}
                >
                  Posts
                </button>
                <button
                  className={`button button-outline button-mini ${type === 'hashtag' ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => handleSetType('hashtag')}
                  disabled={!query}
                >
                  Hashtags
                </button>
                <button
                  className={`button button-outline button-mini ${type === 'users' ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => handleSetType('users')}
                  disabled={!query || isGuest}
                  title={isGuest ? 'Sign in to search users.' : undefined}
                >
                  Users
                </button>
              </div>
            </div>

            {loading && <p className="muted">Searching...</p>}
            {!loading && !!error && <p className="muted">{error}</p>}
            {!loading && !error && query && type === 'users' && users.length === 0 && (
              <p className="muted">No users found.</p>
            )}
            {!loading && !error && query && type !== 'users' && posts.length === 0 && (
              <p className="muted">No posts found.</p>
            )}

            {!loading && !error && type === 'users' && users.length > 0 && (
              <div className="list-stack">
                {users.map((user) => (
                  <Link className="list-item" key={user.id} to={`/profile/${user.id}`}>
                    <span className="list-icon">@</span>
                    <div style={{ flex: 1 }}>
                      <div>{user.displayName}</div>
                      <div className="muted">@{user.handle}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {!loading && !error && type !== 'users' && posts.length > 0
            ? posts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)
            : null}
        </div>
        <aside className="feed-side">
          <div className="side-header">Tips</div>
          <div className="side-list">
            <div className="side-item">Use quotes for exact words (server uses plain search).</div>
            <div className="side-item">Start with # to search hashtags quickly.</div>
            <div className="side-item">Use Users tab to find people by display name.</div>
          </div>
        </aside>
      </div>
    </section>
  )
}


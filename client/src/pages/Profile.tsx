// client/src/pages/Profile.tsx
// ─────────────────────────────────────────────────────────────────────────────
// User profile page for viewing a profile, profile posts, and editing
// personal profile metadata such as display name, avatar, and cover image.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import PostCard from '../components/PostCard'
import RecentUpdatesSidebar from '../components/RecentUpdatesSidebar'
import { useAuth } from '../hooks/useAuth'
import {
  fetchFollowers,
  fetchFollowing,
  fetchFollowStatus,
  followUser,
  unfollowUser,
  type FollowUser,
} from '../lib/followsApi'
import { fetchProfilePageData, updateProfileDisplayName, updateProfileImages } from '../lib/profileApi'
import { serverBase } from '../lib/serverBase'
import type { Post, UserProfile } from '../types'

type PendingImage = { dataUrl: string; mimeType: string }
type CropTarget = 'avatar' | 'cover'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

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

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20h4l11-11a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L4 16v4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M13 6l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 7.5h3l1.2-1.5h6.6l1.2 1.5h3A2 2 0 0 1 22 9.5v9A2 2 0 0 1 20 20.5H4A2 2 0 0 1 2 18.5v-9A2 2 0 0 1 4 7.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ProfileLoadingSkeleton() {
  return (
    <section className="page">
      <div className="feed-layout">
        <div className="feed-main">
          <div className="card profile-frame profile-skeleton-card">
            <div className="profile-cover profile-cover-skeleton">
              <div className="cover-controls">
                <span className="skeleton skeleton-circle-button" />
                <span className="skeleton skeleton-circle-button" />
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-avatar profile-avatar-skeleton">
                <span className="skeleton skeleton-avatar skeleton-avatar-large" />
              </div>

              <div className="profile-info">
                <div className="profile-name-row">
                  <span className="skeleton skeleton-line skeleton-line-title" />
                </div>
                <span className="skeleton skeleton-line skeleton-line-short" />
                <span className="skeleton skeleton-line skeleton-line-medium" />
                <div className="profile-social-row">
                  <span className="skeleton skeleton-chip skeleton-chip-wide" />
                  <span className="skeleton skeleton-chip skeleton-chip-wide" />
                </div>
              </div>

              <div className="profile-actions">
                <span className="skeleton skeleton-button" />
              </div>
            </div>
          </div>

          {Array.from({ length: 2 }, (_, index) => (
            <div className="card post-card-skeleton" key={index}>
              <div className="post-skeleton-header">
                <span className="skeleton skeleton-avatar" />
                <div className="post-skeleton-meta">
                  <span className="skeleton skeleton-line skeleton-line-medium" />
                  <span className="skeleton skeleton-line skeleton-line-short" />
                </div>
                <span className="skeleton skeleton-chip" />
              </div>
              <span className="skeleton skeleton-line skeleton-line-title" />
              <span className="skeleton skeleton-line skeleton-line-full" />
              <span className="skeleton skeleton-line skeleton-line-medium" />
              <div className="skeleton skeleton-block skeleton-post-image" />
            </div>
          ))}
        </div>
        <aside className="feed-side">
          <div className="side-header">Following</div>
          <div className="side-list side-list-tiles">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="follow-tile follow-tile-skeleton" key={index}>
                <span className="skeleton skeleton-avatar" />
                <div className="follow-tile-copy">
                  <span className="skeleton skeleton-line skeleton-line-medium" />
                  <span className="skeleton skeleton-line skeleton-line-short" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, isGuest, loading: authLoading, updateCurrentUserDisplayName } = useAuth()
  const { userId: routeUserId } = useParams()
  const targetUserId = routeUserId ?? (!isGuest ? user.id : null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profilePosts, setProfilePosts] = useState<Post[]>([])
  const [postCount, setPostCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([])
  const [connectionsOpen, setConnectionsOpen] = useState<'followers' | 'following' | null>(null)
  const [joinedAt, setJoinedAt] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [editingProfile, setEditingProfile] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState('')

  const [pendingAvatar, setPendingAvatar] = useState<PendingImage | null>(null)
  const [pendingCover, setPendingCover] = useState<PendingImage | null>(null)

  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null)
  const [cropViewport, setCropViewport] = useState<{ width: number; height: number } | null>(null)
  const coverRef = useRef<HTMLDivElement | null>(null)
  const avatarRef = useRef<HTMLDivElement | null>(null)

  const isOwnProfile = useMemo(
    () => !isGuest && !!targetUserId && targetUserId === user.id,
    [isGuest, targetUserId, user.id],
  )

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current || !(event.target instanceof Node)) return
      if (!menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false)
        setCropTarget(null)
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (!editingName) return
    nameInputRef.current?.focus()
    nameInputRef.current?.select()
  }, [editingName])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!targetUserId) {
      setLoading(false)
      setError('Sign in before opening your profile page.')
      return
    }

    let cancelled = false

    const loadProfile = async () => {
      setLoading(true)
      setError('')

      try {
        const [data, followerList, followingList, followStatus] = await Promise.all([
          fetchProfilePageData(serverBase, targetUserId),
          fetchFollowers(serverBase, targetUserId),
          fetchFollowing(serverBase, targetUserId),
          !isGuest && targetUserId !== user.id ? fetchFollowStatus(serverBase, targetUserId) : Promise.resolve(false),
        ])
        if (cancelled) {
          return
        }

        setProfile(data.profile)
        setProfilePosts(data.posts)
        setPostCount(data.postCount)
        setFollowerCount(data.followerCount)
        setFollowingCount(data.followingCount)
        setFollowers(followerList)
        setFollowingUsers(followingList)
        setJoinedAt(data.joinedAt)
        setDisplayNameDraft(data.profile.displayName)
        setIsFollowing(followStatus)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load profile.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [authLoading, isGuest, serverBase, targetUserId, user.id])

  const handleFollowToggle = async () => {
    if (!targetUserId || isGuest || isOwnProfile || followLoading) {
      return
    }

    setFollowLoading(true)
    setProfileSaveError('')

    try {
      if (isFollowing) {
        await unfollowUser(serverBase, targetUserId)
        setIsFollowing(false)
        setFollowerCount((current) => Math.max(0, current - 1))
        setFollowers((current) => current.filter((item) => item.id !== user.id))
        setSidebarRefreshKey((current) => current + 1)
      } else {
        await followUser(serverBase, targetUserId)
        setIsFollowing(true)
        setFollowerCount((current) => current + 1)
        setFollowers((current) => [
          {
            id: user.id,
            displayName: user.displayName,
            handle: user.handle,
            avatarUrl: user.avatarUrl ?? null,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ])
        setSidebarRefreshKey((current) => current + 1)
      }
    } catch (followError) {
      setProfileSaveError(followError instanceof Error ? followError.message : 'Could not update follow status.')
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading || authLoading) {
    return <ProfileLoadingSkeleton />
  }

  if (error) {
    return (
      <section className="page">
        <div className="card">
          <h2>Profile unavailable</h2>
          <p className="muted">{error}</p>
        </div>
      </section>
    )
  }

  if (!profile) {
    return null
  }

  const joinedLabel = joinedAt
    ? new Date(joinedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown'

  const coverUrl = pendingCover?.dataUrl ?? profile.coverUrl ?? null
  const avatarUrl = pendingAvatar?.dataUrl ?? profile.avatarUrl ?? null

  const openCropper = (target: CropTarget) => {
    const element = target === 'cover' ? coverRef.current : avatarRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const maxWidth = Math.max(140, Math.floor(window.innerWidth - 40))
    const maxHeight = Math.max(140, Math.floor(window.innerHeight - 140))

    setCropViewport({
      width: clamp(Math.floor(rect.width), 140, maxWidth),
      height: clamp(Math.floor(rect.height), 140, maxHeight),
    })
    setCropTarget(target)
    setProfileMenuOpen(false)
  }

  const startEditing = () => {
    setEditingProfile(true)
    setEditingName(false)
    setProfileMenuOpen(false)
    setDisplayNameDraft(profile.displayName)
    setPendingAvatar(null)
    setPendingCover(null)
    setProfileSaveError('')
  }

  const cancelEditing = () => {
    setEditingProfile(false)
    setEditingName(false)
    setDisplayNameDraft(profile.displayName)
    setPendingAvatar(null)
    setPendingCover(null)
    setProfileSaveError('')
    setCropTarget(null)
  }

  const handleConfirmEdits = async () => {
    if (!isOwnProfile || savingProfile) return

    const trimmedName = displayNameDraft.trim()
    if (!trimmedName) {
      setProfileSaveError('Display name is required.')
      return
    }

    setSavingProfile(true)
    setProfileSaveError('')

    try {
      const shouldUpdateName = trimmedName !== profile.displayName
      const shouldUpdateImages = !!pendingAvatar || !!pendingCover

      let updatedProfile: UserProfile = profile

      if (shouldUpdateName) {
        updatedProfile = await updateProfileDisplayName(serverBase, profile.id, trimmedName)
      }

      if (shouldUpdateImages) {
        const payload: {
          avatar_base64?: string
          avatar_type?: string
          cover_base64?: string
          cover_type?: string
          remove_avatar?: boolean
          remove_cover?: boolean
        } = {}

        if (pendingAvatar) {
          payload.avatar_base64 = pendingAvatar.dataUrl
          payload.avatar_type = pendingAvatar.mimeType
        }

        if (pendingCover) {
          payload.cover_base64 = pendingCover.dataUrl
          payload.cover_type = pendingCover.mimeType
        }

        updatedProfile = await updateProfileImages(serverBase, profile.id, payload)
      }

      setProfile(updatedProfile)
      setDisplayNameDraft(updatedProfile.displayName)

      if (shouldUpdateName) {
        setProfilePosts((current) =>
          current.map((post) => ({
            ...post,
            author: {
              ...post.author,
              name: updatedProfile.displayName,
              handle: updatedProfile.handle,
            },
          })),
        )
        updateCurrentUserDisplayName(updatedProfile.displayName)
      }

      setEditingProfile(false)
      setEditingName(false)
      setPendingAvatar(null)
      setPendingCover(null)
      setCropTarget(null)
    } catch (saveError) {
      setProfileSaveError(saveError instanceof Error ? saveError.message : 'Could not update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <section className="page">
      <div className="feed-layout">
        <div className="feed-main">
          <div className="card profile-frame">
            <div
              ref={coverRef}
              className={`profile-cover ${coverUrl ? 'has-image' : ''}`}
              style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
            >
              {!coverUrl && <span>Cover picture</span>}

              {editingProfile && (
                <button
                  className="icon-button icon-button-small profile-cover-edit"
                  type="button"
                  aria-label="Change cover picture"
                  onClick={() => openCropper('cover')}
                  disabled={savingProfile}
                >
                  <IconCamera />
                </button>
              )}

              <div className="cover-controls">
                <button className="icon-button" type="button" aria-label="Back" onClick={() => navigate(-1)}>
                  <IconBack />
                </button>

                {isOwnProfile && !editingProfile && (
                  <div className="profile-menu" ref={menuRef}>
                    <button
                      className={`icon-button ${profileMenuOpen ? 'is-active' : ''}`}
                      type="button"
                      aria-label="Profile menu"
                      aria-haspopup="menu"
                      aria-expanded={profileMenuOpen}
                      onClick={() => setProfileMenuOpen((prev) => !prev)}
                    >
                      <IconMenu />
                    </button>
                    {profileMenuOpen && (
                      <div className="menu-panel">
                        <button className="menu-item" type="button" onClick={startEditing}>
                          Edit Profile
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="profile-row">
              <div ref={avatarRef} className={`profile-avatar ${editingProfile ? 'is-editing' : ''}`}>
                {avatarUrl ? (
                  <img className="profile-avatar-image" src={avatarUrl} alt={`${profile.displayName} avatar`} />
                ) : (
                  profile.displayName.slice(0, 1)
                )}
                {editingProfile && (
                  <button
                    className="icon-button icon-button-small profile-avatar-edit"
                    type="button"
                    aria-label="Change profile picture"
                    onClick={() => openCropper('avatar')}
                    disabled={savingProfile}
                  >
                    <IconCamera />
                  </button>
                )}
              </div>

              <div className="profile-info">
                <div className="profile-name-row">
                  {editingProfile ? (
                    <>
                      {editingName ? (
                        <input
                          ref={nameInputRef}
                          className="text-input profile-name-input"
                          value={displayNameDraft}
                          onChange={(event) => setDisplayNameDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              setEditingName(false)
                            }
                          }}
                          disabled={savingProfile}
                        />
                      ) : (
                        <h2 className="profile-name">{displayNameDraft}</h2>
                      )}
                      <button
                        className="icon-button icon-button-small profile-name-edit"
                        type="button"
                        aria-label="Edit display name"
                        onClick={() => setEditingName(true)}
                        disabled={savingProfile}
                      >
                        <IconPencil />
                      </button>
                    </>
                  ) : (
                    <h2 className="profile-name">{profile.displayName}</h2>
                  )}
                </div>

                <span className="muted">@{profile.handle}</span>
                <span className="muted">
                  {postCount} posts · Joined {joinedLabel}
                </span>
                <div className="profile-social-row">
                  <button className="profile-stat-button" type="button" onClick={() => setConnectionsOpen('followers')}>
                    {followerCount} followers
                  </button>
                  <span className="muted">·</span>
                  <button className="profile-stat-button" type="button" onClick={() => setConnectionsOpen('following')}>
                    {followingCount} following
                  </button>
                </div>
              </div>

              <div className="profile-actions">
                {isOwnProfile ? (
                  null
                ) : (
                  <button className="button button-outline" type="button" onClick={handleFollowToggle} disabled={isGuest || followLoading}>
                    {followLoading ? 'Updating...' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {editingProfile && (
              <div className="profile-edit-footer">
                {profileSaveError && <div className="login-error">{profileSaveError}</div>}
                <div className="profile-edit-footer-actions">
                  <button className="button button-outline button-mini" type="button" onClick={cancelEditing} disabled={savingProfile}>
                    Cancel
                  </button>
                  <button className="button button-primary button-mini" type="button" onClick={handleConfirmEdits} disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {profilePosts.length > 0 ? (
            profilePosts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)
          ) : (
            <div className="card">
              <h3>No posts yet</h3>
              <p className="muted">This profile has not published anything on the board yet.</p>
            </div>
          )}
        </div>
        <RecentUpdatesSidebar refreshKey={sidebarRefreshKey} />
      </div>
      {connectionsOpen && (
        <div className="image-cropper-overlay" role="dialog" aria-modal="true" aria-label={connectionsOpen}>
          <div className="admin-log-modal">
            <div className="admin-log-modal-header">
              <div>
                <h3>{connectionsOpen === 'followers' ? 'Followers' : 'Following'}</h3>
                <p className="muted">
                  {connectionsOpen === 'followers'
                    ? 'People who follow this account.'
                    : 'People this account is following.'}
                </p>
              </div>
              <button className="icon-button" type="button" aria-label="Close list" onClick={() => setConnectionsOpen(null)}>
                x
              </button>
            </div>
            <div className="admin-log-modal-body">
              <div className="connection-list">
                {(connectionsOpen === 'followers' ? followers : followingUsers).map((item) => (
                  <button
                    className="connection-item"
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setConnectionsOpen(null)
                      navigate(`/profile/${item.id}`)
                    }}
                  >
                    <Avatar name={item.displayName} imageUrl={item.avatarUrl} />
                    <div className="connection-copy">
                      <strong>{item.displayName}</strong>
                      <span className="muted">@{item.handle}</span>
                    </div>
                  </button>
                ))}
                {(connectionsOpen === 'followers' ? followers : followingUsers).length === 0 && (
                  <p className="muted">No users to show yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ImageCropPopup
        open={!!cropTarget}
        title={cropTarget === 'cover' ? 'Change cover picture' : 'Change profile picture'}
        viewport={cropViewport}
        shape={cropTarget === 'avatar' ? 'circle' : 'rect'}
        variant={cropTarget === 'avatar' ? 'avatar' : 'cover'}
        onClose={() => setCropTarget(null)}
        onConfirm={(image) => {
          if (cropTarget === 'cover') {
            setPendingCover(image)
          } else if (cropTarget === 'avatar') {
            setPendingAvatar(image)
          }
          setCropTarget(null)
        }}
      />
    </section>
  )
}

function ImageCropPopup({
  open,
  title,
  viewport,
  shape,
  variant,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  viewport: { width: number; height: number } | null
  shape: 'circle' | 'rect'
  variant: 'avatar' | 'cover'
  onClose: () => void
  onConfirm: (image: PendingImage) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  })

  useEffect(() => {
    if (!open) {
      setFile(null)
      setImgSize(null)
      setDrag({ x: 0, y: 0 })
      if (imgSrc) {
        URL.revokeObjectURL(imgSrc)
      }
      setImgSrc(null)
      return
    }

    return () => {
      if (imgSrc) {
        URL.revokeObjectURL(imgSrc)
      }
    }
  }, [imgSrc, open])

  if (!open || !viewport) return null

  const fitScale = Math.min(
    1,
    (window.innerWidth - 40) / viewport.width,
    (window.innerHeight - 140) / viewport.height,
  )

  const scale = imgSize ? Math.max(viewport.width / imgSize.width, viewport.height / imgSize.height) : 1
  const scaledW = imgSize ? imgSize.width * scale : viewport.width
  const scaledH = imgSize ? imgSize.height * scale : viewport.height
  const limitX = (scaledW - viewport.width) / 2
  const limitY = (scaledH - viewport.height) / 2
  const dragX = clamp(drag.x, -limitX, limitX)
  const dragY = clamp(drag.y, -limitY, limitY)

  const confirmDisabled = !file || !imgSize

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    if (!nextFile) return

    setFile(nextFile)
    setImgSize(null)
    setDrag({ x: 0, y: 0 })

    if (imgSrc) {
      URL.revokeObjectURL(imgSrc)
    }

    const url = URL.createObjectURL(nextFile)
    setImgSrc(url)
  }

  const buildCroppedDataUrl = async () => {
    if (!file || !imgSize || !imgSrc) return null

    const outputMimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const img = new Image()
    img.src = imgSrc
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not load image'))
    })

    const drawW = imgSize.width * scale
    const drawH = imgSize.height * scale
    const drawX = (viewport.width - drawW) / 2 + dragX
    const drawY = (viewport.height - drawH) / 2 + dragY

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, drawX, drawY, drawW, drawH)

    return { dataUrl: canvas.toDataURL(outputMimeType, 0.9), mimeType: outputMimeType } satisfies PendingImage
  }

  return (
    <div className="image-cropper-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`image-cropper-panel ${shape === 'circle' ? 'is-circle' : ''} ${variant === 'cover' ? 'is-cover' : 'is-avatar'}`}
        style={{
          width: viewport.width,
          height: viewport.height,
          transform: `scale(${fitScale})`,
        }}
      >
        <div
          className="image-cropper-viewport"
          onPointerDown={(event) => {
            if (!imgSize) return
            dragRef.current.active = true
            dragRef.current.startX = event.clientX
            dragRef.current.startY = event.clientY
            dragRef.current.baseX = dragX
            dragRef.current.baseY = dragY
            ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (!dragRef.current.active) return
            const nextX = dragRef.current.baseX + (event.clientX - dragRef.current.startX)
            const nextY = dragRef.current.baseY + (event.clientY - dragRef.current.startY)
            setDrag({ x: nextX, y: nextY })
          }}
          onPointerUp={() => {
            dragRef.current.active = false
          }}
        >
          {imgSrc ? (
            <img
              className="image-cropper-image"
              src={imgSrc}
              alt="Crop preview"
              onLoad={(event) => {
                const element = event.currentTarget
                setImgSize({ width: element.naturalWidth, height: element.naturalHeight })
              }}
              style={{
                transform: `translate(-50%, -50%) translate(${dragX}px, ${dragY}px) scale(${scale})`,
              }}
            />
          ) : (
            <div className="image-cropper-placeholder">Choose an image to start.</div>
          )}
        </div>

        {shape === 'circle' ? (
          <>
            <button className="icon-button icon-button-small image-cropper-float image-cropper-close" type="button" aria-label="Cancel" onClick={onClose}>
              <span className="icon-dot">x</span>
            </button>
            <label className="icon-button icon-button-small image-cropper-float image-cropper-choose" aria-label="Choose image">
              <span className="icon-dot">+</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
            <button
              className="icon-button icon-button-small image-cropper-float image-cropper-confirm"
              type="button"
              aria-label="Confirm"
              disabled={confirmDisabled}
              onClick={async () => {
                const result = await buildCroppedDataUrl()
                if (result) onConfirm(result)
              }}
            >
              <span className="icon-dot">✓</span>
            </button>
          </>
        ) : (
          <>
            <div className="image-cropper-chrome image-cropper-top">
              <h3>{title}</h3>
              <button className="icon-button icon-button-small" type="button" aria-label="Close" onClick={onClose}>
                <span className="icon-dot">x</span>
              </button>
            </div>

            <div className="image-cropper-chrome image-cropper-bottom">
              <label className="button button-outline button-mini">
                Choose image
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
              <div className="image-cropper-actions">
                <button className="button button-outline button-mini" type="button" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="button button-primary button-mini"
                  type="button"
                  disabled={confirmDisabled}
                  onClick={async () => {
                    const result = await buildCroppedDataUrl()
                    if (result) onConfirm(result)
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

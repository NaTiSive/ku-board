// client/src/pages/Settings.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Settings page for account, privacy, notification, appearance, and safety
// controls. This is a client-side UI page for signed-in users.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type SettingsSectionId =
  | 'account'
  | 'privacy'
  | 'notifications'
  | 'appearance'
  | 'safety'

interface SettingsSection {
  id: SettingsSectionId
  label: string
  eyebrow: string
  title: string
  description: string
}

const sections: SettingsSection[] = [
  {
    id: 'account',
    label: 'Account',
    eyebrow: 'Identity',
    title: 'Account center',
    description: 'Control the public parts of your KUBoard identity and the account details people see first.',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    eyebrow: 'Audience',
    title: 'Privacy and reach',
    description: 'Choose how visible your activity feels across the feed, search, and profile surfaces.',
  },
  {
    id: 'notifications',
    label: 'Alerts',
    eyebrow: 'Inbox',
    title: 'Notification tuning',
    description: 'Reduce noise, keep the important signals, and decide what deserves your attention instantly.',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    eyebrow: 'Display',
    title: 'Reading and layout',
    description: 'Adjust feed density, media playback, and visual comfort settings for long browsing sessions.',
  },
  {
    id: 'safety',
    label: 'Safety',
    eyebrow: 'Protection',
    title: 'Safety controls',
    description: 'Block unwanted interactions, review login activity, and keep your account secure.',
  },
]

function SettingToggle({
  title,
  note,
  defaultChecked = false,
}: {
  title: string
  note: string
  defaultChecked?: boolean
}) {
  const [enabled, setEnabled] = useState(defaultChecked)

  return (
    <label className="settings-toggle-row">
      <div>
        <strong>{title}</strong>
        <p className="muted">{note}</p>
      </div>
      <button
        className={`settings-toggle ${enabled ? 'is-on' : ''}`}
        type="button"
        aria-pressed={enabled}
        onClick={() => setEnabled((value) => !value)}
      >
        <span className="settings-toggle-knob" />
      </button>
    </label>
  )
}

function SettingAction({
  title,
  note,
  actionLabel,
  danger = false,
}: {
  title: string
  note: string
  actionLabel: string
  danger?: boolean
}) {
  return (
    <div className="settings-action-row">
      <div>
        <strong>{title}</strong>
        <p className="muted">{note}</p>
      </div>
      <button className={`button button-outline button-mini ${danger ? 'settings-danger-button' : ''}`} type="button">
        {actionLabel}
      </button>
    </div>
  )
}

export default function Settings() {
  const { isAdmin, isGuest, user } = useAuth()
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('account')

  const activeConfig = useMemo(
    () => sections.find((section) => section.id === activeSection) ?? sections[0],
    [activeSection],
  )

  if (isGuest) {
    return (
      <section className="page">
        <div className="card">
          <div className="card-header-simple">
            <span className="icon-circle">S</span>
            <h2>Settings</h2>
          </div>
          <p className="muted">Sign in with your KU account to adjust account, privacy, and notification settings.</p>
          <div className="create-post-footer">
            <Link className="button button-primary" to="/login">
              Login
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="settings-shell">
        <aside className="card settings-nav-card">
          <div className="card-header-simple">
            <span className="icon-circle">S</span>
            <h2>Settings</h2>
          </div>
          <p className="muted">A KUBoard-style mock for a social app account center.</p>
          <div className="settings-nav-list">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`settings-nav-item ${section.id === activeSection ? 'is-active' : ''}`}
                type="button"
                onClick={() => setActiveSection(section.id)}
              >
                <span>{section.label}</span>
                <small>{section.eyebrow}</small>
              </button>
            ))}
          </div>
        </aside>

        <div className="settings-main">
          <div className="card settings-hero-card">
            <p className="settings-eyebrow">{activeConfig.eyebrow}</p>
            <div className="settings-hero-row">
              <div>
                <h1>{activeConfig.title}</h1>
                <p className="muted">{activeConfig.description}</p>
              </div>
              <div className="settings-status-chip">
                <strong>{isAdmin ? 'Admin account' : 'Member account'}</strong>
                <span>@{user.handle}</span>
              </div>
            </div>
          </div>

          <div className="card settings-section-card">
            <div className="settings-section-header">
              <div>
                <h3>Profile details</h3>
                <p className="muted">Quick edits and public-facing account information.</p>
              </div>
              <Link className="button button-outline button-mini" to="/profile">
                View profile
              </Link>
            </div>
            <div className="settings-kv-grid">
              <div className="settings-kv-cell">
                <span className="muted">Display name</span>
                <strong>{user.displayName}</strong>
              </div>
              <div className="settings-kv-cell">
                <span className="muted">Handle</span>
                <strong>@{user.handle}</strong>
              </div>
              <div className="settings-kv-cell">
                <span className="muted">Role</span>
                <strong>{isAdmin ? 'Administrator' : 'KU Member'}</strong>
              </div>
              <div className="settings-kv-cell">
                <span className="muted">Visibility</span>
                <strong>Campus community</strong>
              </div>
            </div>
          </div>

          <div className="card settings-section-card">
            <div className="settings-section-header">
              <div>
                <h3>Privacy and feed controls</h3>
                <p className="muted">Mock controls inspired by modern social settings pages.</p>
              </div>
            </div>
            <div className="settings-stack">
              <SettingToggle
                title="Show my profile in people search"
                note="Let other students discover your account by name and handle."
                defaultChecked
              />
              <SettingToggle
                title="Allow message requests from mutuals"
                note="Only people with a campus connection can start a new conversation."
                defaultChecked
              />
              <SettingToggle
                title="Autoplay images and media previews"
                note="Makes the feed feel more alive, but uses a bit more bandwidth."
              />
              <SettingToggle
                title="Send digest notifications by email"
                note="Bundle likes, follows, and comments into one summary instead of separate alerts."
              />
            </div>
          </div>

          <div className="card settings-section-card">
            <div className="settings-section-header">
              <div>
                <h3>Security actions</h3>
                <p className="muted">High-level account tools for password, devices, and session control.</p>
              </div>
            </div>
            <div className="settings-stack">
              <SettingAction
                title="Change password"
                note="Rotate your sign-in password and invalidate older saved credentials."
                actionLabel="Update"
              />
              <SettingAction
                title="Review active sessions"
                note="See the browsers currently connected to KUBoard and remove anything unfamiliar."
                actionLabel="Review"
              />
              <SettingAction
                title="Muted words and blocked people"
                note="Shape your feed by hiding repeated topics, phrases, or accounts."
                actionLabel="Manage"
              />
              <SettingAction
                title="Deactivate account"
                note="Temporarily hide your profile and posts from the campus feed."
                actionLabel="Deactivate"
                danger
              />
            </div>
          </div>
        </div>

        <aside className="settings-side">
          <div className="card settings-side-card">
            <h3>Account snapshot</h3>
            <div className="settings-profile-badge">
              <div className="settings-profile-mark">{user.displayName.slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{user.displayName}</strong>
                <div className="muted">@{user.handle}</div>
              </div>
            </div>
            <div className="settings-mini-stats">
              <div>
                <strong>Feed</strong>
                <span>Personalized campus timeline</span>
              </div>
              <div>
                <strong>Alerts</strong>
                <span>Replies, follows, and admin notices</span>
              </div>
              <div>
                <strong>Privacy</strong>
                <span>Mock controls only for now</span>
              </div>
            </div>
          </div>

          <div className="card settings-side-card">
            <h3>Design direction</h3>
            <p className="muted">
              This mock blends the dense utility of Twitter/X settings with the softer grouped cards common in
              Facebook-style account centers, while staying inside KUBoard&apos;s grayscale, border-led interface.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}

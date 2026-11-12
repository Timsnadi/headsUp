import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { label: 'Today', to: '/', icon: 'today' },
  { label: 'Week', to: '/week', icon: 'week' },
  { label: 'Courses', to: '/courses', icon: 'courses' },
  { label: 'Settings', to: '/settings', icon: 'settings' },
]

function TabIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    today: (
      <>
        <path d="M3.5 10.5 12 3.75l8.5 6.75" />
        <path d="M5.5 9.5v10h13v-10M9 19.5v-6h6v6" />
      </>
    ),
    week: (
      <>
        <rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5" />
        <path d="M7.5 3.75v3M16.5 3.75v3M3.75 9.25h16.5M8 13h2M14 13h2M8 16.5h2" />
      </>
    ),
    courses: (
      <>
        <path d="m3.5 7 8.5-4 8.5 4-8.5 4-8.5-4Z" />
        <path d="M6.5 9v5.5c0 1.7 2.45 3.25 5.5 3.25s5.5-1.55 5.5-3.25V9M20.5 7v7" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .05.05a1.7 1.7 0 0 1-2.4 2.4L17 17.4a1.7 1.7 0 0 0-2.9 1.2v.15a1.7 1.7 0 0 1-3.4 0v-.08a1.7 1.7 0 0 0-2.9-1.2l-.05.05a1.7 1.7 0 0 1-2.4-2.4l.05-.05a1.7 1.7 0 0 0-1.2-2.9h-.15a1.7 1.7 0 0 1 0-3.4h.08a1.7 1.7 0 0 0 1.2-2.9l-.05-.05a1.7 1.7 0 0 1 2.4-2.4l.05.05a1.7 1.7 0 0 0 2.9-1.2v-.15a1.7 1.7 0 0 1 3.4 0v.08a1.7 1.7 0 0 0 2.9 1.2l.05-.05a1.7 1.7 0 0 1 2.4 2.4l-.05.05a1.7 1.7 0 0 0 1.2 2.9h.15a1.7 1.7 0 0 1 0 3.4h-.08a1.7 1.7 0 0 0-1.2 2.9Z" />
      </>
    ),
  }

  return (
    <svg
      className="tab-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}

export function TabLayout() {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand-lockup">
          <img className="brand-logo" src="/icons/icon.svg" alt="" />
          <h1>headsUp</h1>
        </div>
        <button type="button" className="top-bar-button" aria-label="Open app status">
          Offline ready
        </button>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="tab-bar" aria-label="Main navigation">
        {tabs.map(({ label, to, icon }) => (
          <NavLink
            key={label}
            to={to}
            end={to === '/'}
            className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
          >
            <TabIcon name={icon} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

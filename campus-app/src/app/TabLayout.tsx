import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { label: 'Today', to: '/' },
  { label: 'Week', to: '/week' },
  { label: 'Courses', to: '/courses' },
  { label: 'Settings', to: '/settings' },
]

export function TabLayout() {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">headsUp</p>
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
        {tabs.map(({ label, to }) => (
          <NavLink
            key={label}
            to={to}
            end={to === '/'}
            className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

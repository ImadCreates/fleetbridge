import { NavLink, Outlet } from 'react-router-dom'

// A muted item keeps the nav shape but uses the secondary text color, so it
// reads as a footnote rather than a tab.
const NAV: Array<{ to: string; label: string; end: boolean; muted?: boolean }> = [
  { to: '/', label: 'Fleet', end: true },
  { to: '/normalization', label: 'Normalization', end: false },
  { to: '/add-provider', label: 'Add provider', end: false },
  { to: '/terminal', label: 'For Terminal', end: false, muted: true },
]

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-baseline gap-3">
            <span className="text-base font-semibold tracking-tight">
              FleetBridge
            </span>
            <span className="hidden text-xs text-slate-500 sm:inline">
              Telematics normalization demo
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : item.muted
                        ? 'text-slate-500 hover:bg-slate-100'
                        : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}

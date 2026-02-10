import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Overview' },
  { to: '/evidence', label: 'Evidence Chain' },
  { to: '/state', label: 'State Machine' },
  { to: '/overrides', label: 'Overrides' },
  { to: '/reports', label: 'Audit Reports' },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 flex-shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="px-5 py-6">
          <h1 className="text-base font-semibold tracking-wide text-white">NXTPRISM</h1>
          <p className="text-[11px] text-neutral-500 mt-0.5">Trust Console</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-[13px] transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-neutral-800 text-[11px] text-neutral-600 space-y-0.5">
          <div>SkyLine UAM Corp.</div>
          <div>API :3000</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-neutral-950 p-8">
        <Outlet />
      </main>
    </div>
  );
}

import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: '◈' },
  { to: '/evidence', label: 'Evidence Chain', icon: '⛓' },
  { to: '/state', label: 'State Machine', icon: '⚙' },
  { to: '/overrides', label: 'Overrides', icon: '⚡' },
  { to: '/reports', label: 'Audit Reports', icon: '📋' },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 사이드바 */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* 로고 */}
        <div className="px-4 py-5 border-b border-gray-800">
          <h1 className="text-green-400 text-lg font-bold tracking-wider">
            NXT<span className="text-white">PRISM</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">Trust Console v0.9</p>
        </div>

        {/* 내비게이션 */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-green-400/10 text-green-400 border-l-2 border-green-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border-l-2 border-transparent'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 하단 정보 */}
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-600">
          <div>Tenant: SkyLine UAM</div>
          <div className="truncate">API: localhost:3000</div>
        </div>
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-y-auto bg-gray-950 p-6">
        <Outlet />
      </main>
    </div>
  );
}

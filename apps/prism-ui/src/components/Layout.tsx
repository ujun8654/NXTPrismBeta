import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../i18n';

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.overview' },
  { to: '/evidence', labelKey: 'nav.evidence' },
  { to: '/state', labelKey: 'nav.state' },
  { to: '/overrides', labelKey: 'nav.overrides' },
  { to: '/reports', labelKey: 'nav.reports' },
];

export default function Layout() {
  const { t, toggle } = useI18n();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 flex-shrink-0 bg-[#0A0A0A] border-r border-[#1E1E1E] flex flex-col">
        <div className="px-5 py-6">
          <h1 className="text-base font-semibold tracking-wide text-atc-white">NXTPRISM</h1>
          <p className="text-[11px] text-atc-gray mt-0.5">Trust Operations Console</p>
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
                    ? 'bg-white/10 text-atc-white font-medium'
                    : 'text-atc-gray hover:text-neutral-200 hover:bg-white/5'
                }`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-2">
          <button
            onClick={toggle}
            className="w-full px-3 py-2 rounded-md text-[12px] text-atc-gray hover:text-neutral-200 hover:bg-white/5 transition-colors text-left"
          >
            {t('lang.toggle')}
          </button>
        </div>

        <div className="px-5 py-4 border-t border-[#1E1E1E] text-[11px] text-neutral-600 space-y-0.5">
          <div>SkyLine UAM Corp.</div>
          <div>API :3000</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-atc-black p-8">
        <Outlet />
      </main>
    </div>
  );
}

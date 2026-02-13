import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useLinkChannel } from '../LinkChannel';
import { motion, AnimatePresence } from 'framer-motion';

const WORKSPACES = [
  { to: '/',          labelKey: 'ws.monitor',  icon: '◉', shortcut: '1' },
  { to: '/evidence',  labelKey: 'ws.evidence', icon: '⛓', shortcut: '2' },
  { to: '/state',     labelKey: 'ws.state',    icon: '◇', shortcut: '3' },
  { to: '/replay',    labelKey: 'ws.replay',   icon: '▶', shortcut: '4' },
  { to: '/audit',     labelKey: 'ws.audit',    icon: '☰', shortcut: '5' },
];

export default function Layout() {
  const { t, toggle, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { current: linked, clear: clearLink } = useLinkChannel();

  // Keyboard shortcuts: Alt+1~5 for workspace switching
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < WORKSPACES.length) {
          e.preventDefault();
          navigate(WORKSPACES[idx].to);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen overflow-hidden radar-grid noise-overlay">
      {/* ─── Top Bar ─── */}
      <header className="flex-shrink-0 glass-panel border-b border-white/5 z-40">
        <div className="flex items-center h-11">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 border-r border-white/5 h-full">
            <div className="w-2 h-2 rounded-full bg-atc-aqua shadow-glow-aqua animate-pulse-dot" />
            <span className="font-display text-[13px] font-bold tracking-[0.2em] text-atc-white">
              NXTPRISM
            </span>
          </div>

          {/* Workspace Tabs */}
          <nav className="flex items-center h-full flex-1">
            {WORKSPACES.map((ws) => (
              <NavLink
                key={ws.to}
                to={ws.to}
                end={ws.to === '/'}
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 px-4 h-full text-[12px] font-medium tracking-wide transition-colors ${
                    isActive
                      ? 'text-atc-aqua ws-tab-active'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`
                }
              >
                <span className="text-[10px]">{ws.icon}</span>
                <span className="uppercase">{t(ws.labelKey)}</span>
                <span className="text-[9px] text-neutral-700 ml-0.5 font-mono">{ws.shortcut}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3 px-4 h-full border-l border-white/5">
            <button
              onClick={toggle}
              className="px-2 py-1 rounded text-[11px] text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-colors font-mono"
            >
              {lang === 'en' ? 'KO' : 'EN'}
            </button>
            <div className="text-[10px] text-neutral-600 font-mono">
              SkyLine UAM
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ─── Status Bar ─── */}
      <footer className="flex-shrink-0 h-6 glass-panel border-t border-white/5 flex items-center px-4 text-[10px] text-neutral-600 font-mono z-40">
        <div className="flex items-center gap-4">
          <span>API :3000</span>
          <span className="text-neutral-700">|</span>
          <span>TENANT: SkyLine UAM Corp.</span>
          <span className="text-neutral-700">|</span>
          <span className="text-neutral-500">
            Alt+1~5 Workspace
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {linked && (
            <button onClick={clearLink} className="flex items-center gap-1.5 px-2 py-0.5 rounded glass-card hover:bg-white/5 transition-colors group">
              <span className="w-1.5 h-1.5 rounded-full bg-atc-aqua shadow-glow-aqua animate-pulse-dot" />
              <span className="text-atc-aqua">{linked.type}:{linked.id.slice(0, 8)}</span>
              <span className="text-neutral-700 group-hover:text-neutral-400">×</span>
            </button>
          )}
          <span className="text-neutral-500">NXTPrism v0.1.0</span>
        </div>
      </footer>
    </div>
  );
}

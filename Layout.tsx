import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'

const NAV = [
  { path: '/analytics', label: 'ANALYTICS', short: 'STATS',    icon: '◈' },
  { path: '/predict',   label: 'PREDICT',   short: 'AI',       icon: '◎' },
  { path: '/simulate',  label: 'SIMULATE',  short: 'SIM',      icon: '⟳' },
  { path: '/backtest',  label: 'BACKTEST',  short: 'TEST',     icon: '≋' },
  { path: '/models',    label: 'MODELS',    short: 'ML',       icon: '⬡' },
]

const GAMES = [
  { id: 'mega-millions', name: 'Mega Millions', pool: 70 },
  { id: 'powerball',     name: 'Powerball',     pool: 69 },
  { id: 'euromillions',  name: 'EuroMillions',  pool: 50 },
]

const SIDEBAR_LINKS = [
  { label: 'Overview' },
  { label: 'Freq Map' },
  { label: 'Co-occur' },
  { label: 'Time Series' },
]

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [clock, setClock] = useState('')
  const { selectedGame, setGame } = useGameStore()
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // Live clock
  useEffect(() => {
    const tick = () => setClock(new Date().toTimeString().slice(0, 8))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-rova-bg text-rova-text font-mono overflow-hidden">

      {/* ── TOPBAR ─────────────────────────────────────────────── */}
      <header className="relative flex items-center justify-between px-3 sm:px-4 h-11 bg-rova-bg1 border-b border-rova-border flex-shrink-0 z-50">

        {/* Topbar bottom glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rova-accent2/30 to-transparent" />

        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="md:hidden text-rova-text3 hover:text-rova-accent transition-colors w-7 h-7 flex items-center justify-center text-sm"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>

          <div className="flex items-center gap-1 tracking-[4px] text-sm font-bold select-none">
            <span className="text-rova-accent">R</span>
            <span className="text-rova-accent2">O</span>
            <span className="text-rova-text2">V</span>
            <span className="text-rova-text3">A</span>
          </div>
          <span className="hidden sm:block text-[8px] tracking-[1.5px] text-rova-text3 border border-rova-border px-1.5 py-0.5 rounded-sm">
            AI FORECASTING
          </span>
        </div>

        {/* Center: desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `text-[9px] tracking-[1.5px] px-3 py-1.5 border transition-all rounded-sm ${
                  isActive
                    ? 'text-rova-accent border-rova-border2 bg-rova-accent/8'
                    : 'text-rova-text3 border-transparent hover:text-rova-text2 hover:border-rova-border'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: status + clock */}
        <div className="flex items-center gap-2 sm:gap-4 text-[9px] text-rova-text3 tracking-wide">
          <span className="hidden sm:block truncate max-w-[120px]">
            {selectedGame.name.toUpperCase()}
          </span>
          <span className="hidden lg:block font-mono text-rova-text4">{clock}</span>
          <span className="flex items-center gap-1.5 text-rova-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-rova-accent animate-pulse-slow inline-block" />
            LIVE
          </span>
        </div>
      </header>

      {/* ── MAIN BODY ───────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Mobile overlay ──────────────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside
          className={[
            'fixed md:relative inset-y-0 left-0 z-40',
            'w-44 min-w-[176px] bg-rova-bg1 border-r border-rova-border',
            'flex flex-col overflow-y-auto overflow-x-hidden',
            'transition-transform duration-250 ease-in-out',
            'md:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
          style={{ top: 44 }}
        >
          {/* Game selector */}
          <div className="px-3 pt-4 pb-2">
            <div className="text-[8px] tracking-[2px] text-rova-text4 mb-2">GAME</div>
            {GAMES.map(g => (
              <button
                key={g.id}
                onClick={() => setGame(g)}
                className={[
                  'w-full text-left flex items-center gap-2 px-2 py-2 text-[10px] transition-all mb-0.5 rounded-sm',
                  selectedGame.id === g.id
                    ? 'text-rova-accent bg-rova-accent/8 border-l-2 border-rova-accent pl-[6px]'
                    : 'text-rova-text3 hover:text-rova-text2 hover:bg-rova-accent/4',
                ].join(' ')}
              >
                <span className="text-[10px]">{selectedGame.id === g.id ? '◆' : '◇'}</span>
                <span className="truncate">{g.name}</span>
              </button>
            ))}
          </div>

          <div className="h-px bg-rova-border mx-3 my-1" />

          {/* Mobile-only nav links in sidebar */}
          <div className="md:hidden px-3 py-2">
            <div className="text-[8px] tracking-[2px] text-rova-text4 mb-2">SCREENS</div>
            {NAV.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2 py-2 text-[10px] transition-all mb-0.5 rounded-sm ${
                    isActive
                      ? 'text-rova-accent bg-rova-accent/8 border-l-2 border-rova-accent pl-[6px]'
                      : 'text-rova-text3 hover:text-rova-text2'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            <div className="h-px bg-rova-border my-2" />
          </div>

          {/* Analysis sub-links */}
          <div className="px-3 py-1">
            <div className="text-[8px] tracking-[2px] text-rova-text4 mb-2">ANALYSIS</div>
            {SIDEBAR_LINKS.map(s => (
              <div
                key={s.label}
                className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-rova-text3 hover:text-rova-text2 cursor-pointer transition-colors rounded-sm hover:bg-rova-accent/4"
              >
                <span className="text-[8px]">▸</span>
                {s.label}
              </div>
            ))}
          </div>

          <div className="h-px bg-rova-border mx-3 my-1" />

          {/* Tools sub-links */}
          <div className="px-3 py-1">
            <div className="text-[8px] tracking-[2px] text-rova-text4 mb-2">TOOLS</div>
            {['Monte Carlo', 'Scorer', 'Model Lab'].map(s => (
              <div
                key={s}
                className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-rova-text3 hover:text-rova-text2 cursor-pointer transition-colors rounded-sm hover:bg-rova-accent/4"
              >
                <span className="text-[8px]">▸</span>
                {s}
              </div>
            ))}
          </div>

          {/* Version badge — pinned to bottom */}
          <div className="mt-auto px-3 py-4">
            <div className="text-[8px] text-rova-text4 border border-rova-border rounded-sm px-2 py-1.5 text-center tracking-wide">
              ROVA v1.0.0 · GCP + PG16
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ──────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-rova-bg">

          {/* Page scroll area — extra bottom padding on mobile for tab bar */}
          <div className="p-3 sm:p-4 lg:p-5 pb-24 md:pb-6 min-h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ──────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-rova-bg1 border-t border-rova-border flex pb-safe">
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[52px] ${
                isActive ? 'text-rova-accent' : 'text-rova-text3'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-base transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-[8px] tracking-wide">{item.short}</span>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 h-0.5 w-8 bg-rova-accent rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

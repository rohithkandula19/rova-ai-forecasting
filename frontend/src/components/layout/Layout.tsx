import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore, US_GAMES } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { ThemePicker } from '@/components/ui/ThemePicker'
import { AuthModal } from '@/components/auth/AuthModal'
import { NotificationBell } from '@/components/ui/NotificationBell'
import clsx from 'clsx'

const PRIMARY_NAV = [
  { path:'/analytics',  label:'ANALYTICS'  },
  { path:'/predict',    label:'PREDICT'    },
  { path:'/history',    label:'HISTORY'    },
  { path:'/hotstreak',  label:'HOT STREAK' },
  { path:'/quickpick',  label:'QUICK PICK' },
  { path:'/chat',       label:'AI CHAT'    },
  { path:'/checker',    label:'TICKET ✓'   },
  { path:'/jackpot',    label:'JACKPOT 📈' },
  { path:'/map',        label:'MAP 🗺️'     },
  { path:'/cooccur',    label:'PAIRS 🧠'   },
  { path:'/calendar',   label:'CALENDAR'   },
]

const SECONDARY_NAV = [
  { path:'/simulate',  label:'SIMULATE' },
  { path:'/backtest',  label:'BACKTEST' },
]

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]

const MOBILE_NAV = [
  { path:'/analytics', label:'STATS',  icon:'◈' },
  { path:'/predict',   label:'AI',     icon:'◎' },
  { path:'/checker',   label:'CHECK',  icon:'🎫' },
  { path:'/map',       label:'MAP',    icon:'🗺️' },
  { path:'/chat',      label:'CHAT',   icon:'🤖' },
]

export function Layout() {
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [showAuth, setShowAuth]         = useState(false)
  const [clock, setClock]               = useState('')
  const { selectedGame, setGame }       = useGameStore()
  const { user, isLoggedIn }            = useAuthStore()
  const location                        = useLocation()

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])
  useEffect(() => {
    const id = setInterval(() => setClock(
      new Date().toLocaleTimeString('en-US',{ hour:'2-digit', minute:'2-digit', hour12:true })
    ), 1000)
    return () => clearInterval(id)
  }, [])

  const linkStyle = ({ isActive }: { isActive:boolean }): React.CSSProperties => ({
    color:         isActive ? 'var(--accent)' : 'var(--text3)',
    fontWeight:    isActive ? 700 : 400,
    borderBottom:  isActive ? '2px solid var(--accent)' : '2px solid transparent',
    marginBottom:  '-1px',
    paddingBottom: 11,
    paddingTop:    11,
    paddingLeft:   7,
    paddingRight:  7,
    background:    isActive ? 'rgba(0,255,157,0.05)' : 'transparent',
    transition:    'all 0.15s',
    whiteSpace:    'nowrap' as const,
    fontSize:      8,
    letterSpacing: '0.5px',
  })

  return (
    <div className="flex flex-col h-screen font-mono overflow-hidden"
      style={{ background:'var(--bg)', color:'var(--text)' }}>

      {/* TOP BAR */}
      <header className="flex items-center shrink-0 z-50 px-3 gap-2"
        style={{ background:'var(--bg1)', borderBottom:'1px solid var(--border)', height:44 }}>

        <button className="md:hidden shrink-0 w-7 text-sm"
          style={{ color:'var(--text3)' }}
          onClick={() => setSidebarOpen(v=>!v)}>
          {sidebarOpen ? '✕' : '☰'}
        </button>

        <span className="font-black tracking-[4px] text-sm shrink-0"
          style={{ color:'var(--accent)' }}>ROVA</span>
        <span className="text-[7px] tracking-[2px] shrink-0 hidden sm:block"
          style={{ color:'var(--text4)' }}>AI FORECASTING</span>

        {/* Scrollable nav */}
        <nav className="hidden md:flex items-stretch flex-1 mx-1"
          style={{ overflowX:'auto', scrollbarWidth:'none', msOverflowStyle:'none' }}>
          {ALL_NAV.map(item => (
            <NavLink key={item.path} to={item.path} style={linkStyle}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <span className="hidden xl:block text-[9px]" style={{ color:'var(--text4)' }}>{clock}</span>
          <NotificationBell />
          <ThemePicker />

          {/* Auth button */}
          {isLoggedIn() ? (
            <NavLink to="/profile"
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px]"
              style={{ background:'var(--accent)', color:'var(--bg)', fontWeight:700 }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{ background:'rgba(0,0,0,0.2)' }}>
                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </span>
              <span className="hidden sm:inline">{user?.full_name?.split(' ')[0] || 'Profile'}</span>
            </NavLink>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="text-[9px] px-2.5 py-1 rounded font-bold"
              style={{ background:'var(--accent)', color:'var(--bg)' }}>
              SIGN IN
            </button>
          )}

          <span className="flex items-center gap-1 text-[9px]" style={{ color:'var(--accent)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
              style={{ background:'var(--accent)' }} />
            <span className="hidden sm:inline">LIVE</span>
          </span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div key="overlay"
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setSidebarOpen(false)} />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={clsx(
          'fixed md:relative inset-y-0 left-0 z-40 w-48 flex flex-col overflow-y-auto shrink-0',
          'transition-transform duration-200 md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )} style={{ top:44, background:'var(--bg1)', borderRight:'1px solid var(--border)' }}>

          <div className="px-3 pt-3 pb-2">
            <div className="text-[7px] tracking-[2px] mb-2 font-bold"
              style={{ color:'var(--text4)' }}>🇺🇸 US LOTTERY GAMES</div>
            {US_GAMES.map(g => (
              <button key={g.id} onClick={() => setGame(g)}
                className="w-full text-left px-2 py-2 rounded-sm mb-0.5 transition-all"
                style={selectedGame.id===g.id ? {
                  color:'var(--accent)', background:'rgba(0,255,157,0.06)',
                  borderLeft:'2px solid var(--accent)', paddingLeft:6,
                } : { color:'var(--text3)' }}>
                <div className="text-[10px] font-bold">{g.name}</div>
                <div className="text-[8px] mt-0.5" style={{ color:'var(--text4)' }}>
                  {g.drawDays} · ${g.ticketPrice.toFixed(2)}/play
                </div>
              </button>
            ))}
          </div>

          <div className="h-px mx-3" style={{ background:'var(--border)' }} />

          {/* Mobile: all screens */}
          <div className="md:hidden px-3 py-2">
            <div className="text-[7px] tracking-[2px] mb-2 font-bold"
              style={{ color:'var(--text4)' }}>SCREENS</div>
            {ALL_NAV.map(item => (
              <NavLink key={item.path} to={item.path}
                className="flex items-center px-2 py-2 text-[10px] rounded-sm mb-0.5"
                style={({ isActive }) => isActive
                  ? { color:'var(--accent)', borderLeft:'2px solid var(--accent)', paddingLeft:6 }
                  : { color:'var(--text3)' }}>
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop: tools + account */}
          <div className="hidden md:block px-3 py-2">
            <div className="text-[7px] tracking-[2px] mb-2 font-bold"
              style={{ color:'var(--text4)' }}>TOOLS</div>
            {SECONDARY_NAV.map(item => (
              <NavLink key={item.path} to={item.path}
                className="flex items-center px-2 py-2 text-[10px] rounded-sm mb-0.5"
                style={({ isActive }) => isActive
                  ? { color:'var(--accent)', borderLeft:'2px solid var(--accent)', paddingLeft:6 }
                  : { color:'var(--text3)' }}>
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-auto px-3 py-3">
            {!isLoggedIn() && (
              <button onClick={() => setShowAuth(true)}
                className="w-full py-2 rounded-lg text-[9px] font-bold mb-2"
                style={{ background:'var(--accent)', color:'var(--bg)' }}>
                SIGN IN / REGISTER
              </button>
            )}
            <div className="text-[7px] text-center p-2 rounded-sm"
              style={{ color:'var(--text4)', border:'1px solid var(--border)' }}>
              ROVA v1.0.0 · GCP + PG16<br/>
              <span style={{ color:'var(--accent)', opacity:0.7 }}>Auto-syncs after each draw</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ background:'var(--bg)' }}>
          <div className="p-3 sm:p-4 pb-20 md:pb-6 min-h-full">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname}
                initial={{ opacity:0, y:6 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-4 }}
                transition={{ duration:0.15 }}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex"
        style={{ background:'var(--bg1)', borderTop:'1px solid var(--border)',
                 paddingBottom:'max(8px,env(safe-area-inset-bottom))' }}>
        {MOBILE_NAV.map(item => (
          <NavLink key={item.path} to={item.path}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[52px]"
            style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text3)' })}>
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[8px]">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </div>
  )
}

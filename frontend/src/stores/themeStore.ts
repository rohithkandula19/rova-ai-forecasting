import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'cyberpunk' | 'ocean' | 'sunset'

export const THEMES: Record<Theme, { label: string; icon: string; vars: Record<string,string> }> = {
  dark: {
    label: 'Terminal', icon: '🖥️',
    vars: {
      '--bg':'#020609','--bg1':'#060d10','--bg2':'#0a1520',
      '--border':'rgba(0,255,157,0.08)','--border2':'rgba(0,255,157,0.15)',
      '--text':'#e0ffe8','--text2':'#a0c8b0','--text3':'#4a7a5a','--text4':'#1e3d2d',
      '--accent':'#00ff9d','--accent2':'#00d4ff','--red':'#ff4466',
      '--amber':'#ffb830','--blue':'#00b8ff','--purple':'#a855f7',
    }
  },
  light: {
    label: 'Clean', icon: '☀️',
    vars: {
      '--bg':'#f8fafc','--bg1':'#ffffff','--bg2':'#f1f5f9',
      '--border':'rgba(0,0,0,0.08)','--border2':'rgba(0,0,0,0.15)',
      '--text':'#0f172a','--text2':'#334155','--text3':'#64748b','--text4':'#94a3b8',
      '--accent':'#0066cc','--accent2':'#7c3aed','--red':'#dc2626',
      '--amber':'#d97706','--blue':'#0284c7','--purple':'#7c3aed',
    }
  },
  cyberpunk: {
    label: 'Cyberpunk', icon: '🟣',
    vars: {
      '--bg':'#0d0015','--bg1':'#130020','--bg2':'#1a0030',
      '--border':'rgba(255,0,255,0.12)','--border2':'rgba(255,0,255,0.25)',
      '--text':'#ffe0ff','--text2':'#cc88ff','--text3':'#884499','--text4':'#441155',
      '--accent':'#ff00ff','--accent2':'#00ffff','--red':'#ff2266',
      '--amber':'#ffcc00','--blue':'#00ffff','--purple':'#ff00ff',
    }
  },
  ocean: {
    label: 'Ocean', icon: '🌊',
    vars: {
      '--bg':'#001220','--bg1':'#001e35','--bg2':'#002a4a',
      '--border':'rgba(0,180,255,0.10)','--border2':'rgba(0,180,255,0.20)',
      '--text':'#e0f4ff','--text2':'#88ccee','--text3':'#336688','--text4':'#1a3344',
      '--accent':'#00b4ff','--accent2':'#00ffcc','--red':'#ff4488',
      '--amber':'#ffaa00','--blue':'#00b4ff','--purple':'#8844ff',
    }
  },
  sunset: {
    label: 'Sunset', icon: '🌅',
    vars: {
      '--bg':'#12040a','--bg1':'#1e0812','--bg2':'#2a0c1a',
      '--border':'rgba(255,100,50,0.10)','--border2':'rgba(255,100,50,0.20)',
      '--text':'#fff0e8','--text2':'#ffaa88','--text3':'#aa5533','--text4':'#552211',
      '--accent':'#ff6432','--accent2':'#ffaa00','--red':'#ff2244',
      '--amber':'#ffaa00','--blue':'#4488ff','--purple':'#cc44ff',
    }
  },
}

function applyVars(t: Theme) {
  const vars = THEMES[t]?.vars ?? THEMES.dark.vars
  const root = document.documentElement
  Object.entries(vars).forEach(([k,v]) => root.style.setProperty(k,v))
  root.setAttribute('data-theme', t)
}

interface ThemeStore {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle:   () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark' as Theme,
      setTheme: (t) => { applyVars(t); set({ theme: t }) },
      toggle:   ()  => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        applyVars(next); set({ theme: next })
      },
    }),
    {
      name: 'rova-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyVars(state.theme)
      },
    }
  )
)

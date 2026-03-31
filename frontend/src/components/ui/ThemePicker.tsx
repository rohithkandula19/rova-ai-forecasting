import { useState } from 'react'
import { useThemeStore, THEMES, Theme } from '@/stores/themeStore'

export function ThemePicker() {
  const { theme, setTheme } = useThemeStore()
  const [open, setOpen]     = useState(false)

  return (
    <div style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display:'flex', alignItems:'center', gap:4,
          fontSize:9, padding:'4px 8px', borderRadius:4,
          color:'var(--text3)', border:'1px solid var(--border)',
          background:'var(--bg2)', cursor:'pointer',
        }}>
        {THEMES[theme]?.icon}
        <span style={{ display:'none' }} className="sm-show">
          {THEMES[theme]?.label}
        </span>
        ▾
      </button>

      {open && (
        <>
          <div
            style={{ position:'fixed', inset:0, zIndex:40 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position:'absolute', right:0, top:32, zIndex:50,
            background:'var(--bg1)', border:'1px solid var(--border)',
            borderRadius:8, overflow:'hidden', minWidth:140,
            boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
          }}>
            {(Object.keys(THEMES) as Theme[]).map(t => (
              <button key={t}
                onClick={() => { setTheme(t); setOpen(false) }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:8,
                  padding:'8px 12px', fontSize:10, textAlign:'left',
                  background: theme===t ? 'var(--accent)' : 'transparent',
                  color:      theme===t ? 'var(--bg)'     : 'var(--text2)',
                  fontWeight: theme===t ? 700              : 400,
                  cursor:'pointer', border:'none',
                }}>
                {THEMES[t].icon} {THEMES[t].label}
                {theme===t && <span style={{ marginLeft:'auto' }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

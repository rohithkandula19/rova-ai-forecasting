import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import axios from 'axios'

interface SavedNumber {
  id: string; game_id: string; numbers: number[]
  label: string; bonus?: number
}

export function Profile() {
  const { user, logout, token } = useAuthStore()
  const { selectedGame } = useGameStore()
  const [saved, setSaved]     = useState<SavedNumber[]>([])
  const [label, setLabel]     = useState('My Lucky Numbers')
  const [nums, setNums]       = useState<string[]>(['','','','',''])
  const [bonus, setBonus]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [tab, setTab]         = useState<'numbers'|'alerts'|'account'>('numbers')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushAlerts, setPushAlerts]   = useState(false)
  const [alertGames, setAlertGames]   = useState(['powerball','mega-millions'])

  if (!user) return null

  const saveNumbers = async () => {
    const parsed = nums.map(v => parseInt(v)).filter(n => !isNaN(n))
    if (parsed.length !== 5) return
    setSaving(true)
    try {
      const { data } = await axios.post('/api/v1/users/favorites', {
        game_id: selectedGame.id,
        numbers: parsed,
        label,
        bonus: bonus ? parseInt(bonus) : undefined,
      }, { headers: { Authorization: `Bearer ${token}` }})
      setSaved(prev => [...prev, data.saved])
      setNums(['','','','','']); setBonus(''); setLabel('My Lucky Numbers')
    } catch {}
    setSaving(false)
  }

  return (
    <div style={{ maxWidth:600, margin:'0 auto' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 p-4 rounded-xl"
        style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background:'var(--accent)', color:'var(--bg)' }}>
          {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        </div>
        <div>
          <div className="font-bold text-sm" style={{ color:'var(--text)' }}>{user.full_name || 'Player'}</div>
          <div className="text-[10px]" style={{ color:'var(--text3)' }}>{user.email}</div>
        </div>
        <button onClick={logout}
          className="ml-auto text-[9px] px-3 py-1.5 rounded border"
          style={{ color:'var(--red)', borderColor:'rgba(255,68,102,0.3)' }}>
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background:'var(--bg1)' }}>
        {([
          { key:'numbers', label:'🎱 Saved Numbers' },
          { key:'alerts',  label:'🔔 Notifications' },
          { key:'account', label:'👤 Account' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 py-2 rounded-md text-[10px] font-bold transition-all"
            style={tab===t.key
              ? { background:'var(--accent)', color:'var(--bg)' }
              : { color:'var(--text3)' }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Saved Numbers Tab ──────────────────────────────── */}
        {tab === 'numbers' && (
          <motion.div key="numbers" initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}>
            {/* Add numbers */}
            <div className="p-4 rounded-xl mb-4"
              style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
              <div className="text-[10px] font-bold mb-3" style={{ color:'var(--accent)' }}>
                SAVE NEW COMBINATION
              </div>
              <div className="mb-3">
                <input value={label} onChange={e => setLabel(e.target.value)}
                  placeholder="Label (e.g. Birthday numbers)"
                  className="w-full px-3 py-2 rounded-lg text-[10px] outline-none"
                  style={{ background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }} />
              </div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {nums.map((v, i) => (
                  <input key={i} type="number" min={1} max={selectedGame.pool}
                    value={v} onChange={e => { const n=[...nums]; n[i]=e.target.value; setNums(n) }}
                    placeholder={`${i+1}`}
                    className="w-12 h-12 text-center font-bold rounded-lg outline-none"
                    style={{ background:'var(--bg2)', border:`2px solid ${v?'var(--accent)':'var(--border)'}`, color:'var(--accent)' }} />
                ))}
                <span className="self-center text-[10px]" style={{ color:'var(--text4)' }}>+</span>
                <input type="number" min={1} max={selectedGame.bonusPool}
                  value={bonus} onChange={e => setBonus(e.target.value)}
                  placeholder="B"
                  className="w-12 h-12 text-center font-bold rounded-lg outline-none"
                  style={{ background:'var(--bg2)', border:`2px solid ${bonus?'var(--blue)':'var(--border)'}`, color:'var(--blue)' }} />
              </div>
              <button onClick={saveNumbers} disabled={saving}
                className="px-4 py-2 rounded-lg text-[10px] font-bold disabled:opacity-50"
                style={{ background:'var(--accent)', color:'var(--bg)' }}>
                {saving ? '...' : '+ SAVE NUMBERS'}
              </button>
            </div>

            {/* Saved list */}
            {saved.length === 0 ? (
              <div className="text-center py-10" style={{ color:'var(--text4)' }}>
                <div className="text-3xl mb-2">🎱</div>
                <div className="text-[11px]">No saved numbers yet</div>
                <div className="text-[9px] mt-1">Save your favorite combinations above</div>
              </div>
            ) : (
              <div className="space-y-2">
                {saved.map(s => (
                  <div key={s.id} className="p-3 rounded-lg flex items-center gap-3"
                    style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
                    <div>
                      <div className="text-[10px] font-bold mb-1" style={{ color:'var(--text2)' }}>{s.label}</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {s.numbers.map((n,i) => (
                          <span key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ background:'var(--accent)', color:'var(--bg)' }}>{n}</span>
                        ))}
                        {s.bonus && (
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ background:'var(--blue)', color:'#fff' }}>{s.bonus}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSaved(prev => prev.filter(x => x.id !== s.id))}
                      className="ml-auto text-[10px]" style={{ color:'var(--red)' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Alerts Tab ─────────────────────────────────────── */}
        {tab === 'alerts' && (
          <motion.div key="alerts" initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
            className="space-y-3">
            <div className="p-4 rounded-xl" style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
              <div className="text-[10px] font-bold mb-4" style={{ color:'var(--accent)' }}>
                NOTIFICATION PREFERENCES
              </div>

              {/* Email alerts toggle */}
              <div className="flex items-center justify-between py-3"
                style={{ borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div className="text-[11px] font-bold" style={{ color:'var(--text2)' }}>📧 Email Alerts</div>
                  <div className="text-[9px] mt-0.5" style={{ color:'var(--text4)' }}>
                    Draw results · Jackpot wins · Your numbers matched
                  </div>
                </div>
                <button onClick={() => setEmailAlerts(v => !v)}
                  className="w-10 h-5 rounded-full relative transition-all"
                  style={{ background: emailAlerts ? 'var(--accent)' : 'var(--border)' }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: emailAlerts ? '22px' : '2px' }} />
                </button>
              </div>

              {/* Push toggle */}
              <div className="flex items-center justify-between py-3"
                style={{ borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div className="text-[11px] font-bold" style={{ color:'var(--text2)' }}>🔔 Push Notifications</div>
                  <div className="text-[9px] mt-0.5" style={{ color:'var(--text4)' }}>
                    Real-time draw results in browser
                  </div>
                </div>
                <button onClick={() => setPushAlerts(v => !v)}
                  className="w-10 h-5 rounded-full relative transition-all"
                  style={{ background: pushAlerts ? 'var(--accent)' : 'var(--border)' }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: pushAlerts ? '22px' : '2px' }} />
                </button>
              </div>

              {/* Game selection */}
              <div className="py-3">
                <div className="text-[10px] mb-2" style={{ color:'var(--text3)' }}>Alert me for:</div>
                <div className="flex flex-wrap gap-2">
                  {['powerball','mega-millions','millionaire-for-life'].map(g => (
                    <button key={g} onClick={() => setAlertGames(prev =>
                      prev.includes(g) ? prev.filter(x => x!==g) : [...prev, g]
                    )}
                      className="text-[9px] px-3 py-1.5 rounded-full transition-all"
                      style={alertGames.includes(g)
                        ? { background:'var(--accent)', color:'var(--bg)' }
                        : { border:'1px solid var(--border)', color:'var(--text3)' }}>
                      {g === 'powerball' ? 'Powerball' : g === 'mega-millions' ? 'Mega Millions' : 'MFL'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg text-[9px]"
              style={{ background:'rgba(0,255,157,0.05)', border:'1px solid rgba(0,255,157,0.1)', color:'var(--text3)' }}>
              ℹ️ Email notifications require GCP deployment. Push notifications require HTTPS.
              Both work automatically after deploy.
            </div>

            <button className="w-full py-2.5 rounded-lg text-[10px] font-bold"
              style={{ background:'var(--accent)', color:'var(--bg)' }}>
              SAVE PREFERENCES
            </button>
          </motion.div>
        )}

        {/* ── Account Tab ────────────────────────────────────── */}
        {tab === 'account' && (
          <motion.div key="account" initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
            className="space-y-3">
            <div className="p-4 rounded-xl" style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
              <div className="text-[10px] font-bold mb-4" style={{ color:'var(--accent)' }}>ACCOUNT INFO</div>
              {[
                ['Name',  user.full_name || '—'],
                ['Email', user.email],
                ['Plan',  user.plan || 'Free'],
                ['Member since', 'March 2026'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2.5 text-[11px]"
                  style={{ borderBottom:'1px solid var(--border)' }}>
                  <span style={{ color:'var(--text3)' }}>{label}</span>
                  <span style={{ color:'var(--text2)' }}>{value}</span>
                </div>
              ))}
            </div>
            <button onClick={logout}
              className="w-full py-2.5 rounded-lg text-[10px] font-bold"
              style={{ background:'rgba(255,68,102,0.1)', color:'var(--red)', border:'1px solid rgba(255,68,102,0.2)' }}>
              SIGN OUT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useDraws } from '@/hooks/useDraws'
import { getDrawsForGame } from '@/data/realDraws'

interface StreakData {
  number: number
  currentStreak: number     // consecutive draws appeared in
  longestStreak: number
  currentGap: number        // draws since last appearance
  longestGap: number
  recentAppearances: number // last 10 draws
  totalAppearances: number
  status: 'hot' | 'warm' | 'cold' | 'frozen'
}

function analyzeStreaks(draws: typeof import('@/data/realDraws').MEGA_MILLIONS_DRAWS, pool: number): StreakData[] {
  const data: StreakData[] = []

  for (let n = 1; n <= pool; n++) {
    let currentStreak = 0, longestStreak = 0, tempStreak = 0
    let currentGap = 0, longestGap = 0, tempGap = 0
    let foundFirst = false
    let recentCount = 0
    let totalCount  = 0

    for (let i = 0; i < draws.length; i++) {
      const appeared = draws[i].numbers.includes(n)
      if (appeared) {
        totalCount++
        if (i < 10) recentCount++
        if (!foundFirst) foundFirst = true
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
        if (tempGap > 0) { longestGap = Math.max(longestGap, tempGap); tempGap = 0 }
        if (i === 0) currentStreak = tempStreak
      } else {
        if (i === 0 || (i < 5 && currentStreak === 0)) currentGap++
        tempGap++
        longestGap = Math.max(longestGap, tempGap)
        tempStreak = 0
      }
    }
    if (!foundFirst) currentGap = draws.length

    const status: StreakData['status'] =
      recentCount >= 4 ? 'hot' :
      recentCount >= 2 ? 'warm' :
      currentGap > 15  ? 'frozen' : 'cold'

    data.push({ number: n, currentStreak, longestStreak, currentGap, longestGap, recentAppearances: recentCount, totalAppearances: totalCount, status })
  }

  return data.sort((a, b) => b.recentAppearances - a.recentAppearances)
}

const STATUS_STYLE: Record<string, { bg: string; tx: string; label: string; icon: string }> = {
  hot:    { bg: 'rgba(255,68,102,0.15)',  tx: 'var(--red)',    label: 'HOT',    icon: '🔥' },
  warm:   { bg: 'rgba(255,184,48,0.12)',  tx: 'var(--amber)',  label: 'WARM',   icon: '🟡' },
  cold:   { bg: 'rgba(0,184,255,0.08)',   tx: 'var(--blue)',   label: 'COLD',   icon: '❄️' },
  frozen: { bg: 'rgba(100,100,120,0.10)', tx: 'var(--text3)',  label: 'FROZEN', icon: '🧊' },
}

export function HotStreak() {
  const { selectedGame } = useGameStore()
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'cold' | 'frozen'>('all')
  const { draws } = useDraws(selectedGame.id)
  const streaks = useMemo(() => analyzeStreaks(draws as any, selectedGame.pool), [selectedGame.id])

  const filtered = filter === 'all' ? streaks : streaks.filter(s => s.status === filter)
  const hotCount    = streaks.filter(s => s.status === 'hot').length
  const frozenCount = streaks.filter(s => s.status === 'frozen').length

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xl">🔥</span>
        <div>
          <div className="font-bold text-sm" style={{ color: 'var(--accent)' }}>Hot Streak Tracker</div>
          <div className="text-[10px]" style={{ color: 'var(--text3)' }}>
            {selectedGame.name} · {draws.length} draws analyzed
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {Object.entries(STATUS_STYLE).map(([status, style]) => {
          const count = streaks.filter(s => s.status === status).length
          return (
            <button key={status} onClick={() => setFilter(filter === status ? 'all' : status as any)}
              className="p-3 rounded-lg text-center transition-all"
              style={{ background: filter === status ? style.bg : 'var(--bg1)', border: `1px solid ${filter === status ? style.tx : 'var(--border)'}` }}>
              <div className="text-lg mb-1">{style.icon}</div>
              <div className="text-xl font-bold" style={{ color: style.tx }}>{count}</div>
              <div className="text-[8px]" style={{ color: 'var(--text3)' }}>{style.label}</div>
            </button>
          )
        })}
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filtered.map((s, i) => {
          const style = STATUS_STYLE[s.status]
          return (
            <motion.div key={s.number} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className="p-3 rounded-lg"
              style={{ background: style.bg, border: `1px solid ${style.tx}33` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold" style={{ color: style.tx }}>{s.number}</span>
                <span className="text-xs">{style.icon}</span>
                <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: style.tx + '22', color: style.tx }}>
                  {style.label}
                </span>
              </div>
              <div className="space-y-1 text-[9px]" style={{ color: 'var(--text3)' }}>
                <div className="flex justify-between">
                  <span>Last 10 draws</span>
                  <span style={{ color: style.tx }} className="font-bold">{s.recentAppearances}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Gap since seen</span>
                  <span className="font-bold">{s.currentGap} draws</span>
                </div>
                <div className="flex justify-between">
                  <span>All time</span>
                  <span className="font-bold">{s.totalAppearances}x</span>
                </div>
              </div>
              {/* Mini frequency bar */}
              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: style.tx }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((s.recentAppearances / 5) * 100, 100)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.02 + 0.3 }} />
              </div>
            </motion.div>
          )
        })}
      </div>

      <p className="text-[9px] text-center mt-4" style={{ color: 'var(--text4)' }}>
        🎲 Hot/cold status has NO predictive value. Each lottery draw is independent and cryptographically random.
      </p>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useDraws } from '@/hooks/useDraws'
import { getDrawsForGame, Draw } from '@/data/realDraws'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function parseDrawDate(dateStr: string): Date | null {
  try {
    const cleaned = dateStr.replace(/,\s*/g, ' ').trim()
    const d = new Date(cleaned + ' 2025')
    if (!isNaN(d.getTime())) return d
    return new Date(cleaned)
  } catch { return null }
}

export function DrawCalendar() {
  const { selectedGame } = useGameStore()
  const { draws } = useDraws(selectedGame.id)
  const now   = new Date()
  const [year, setYear]   = useState(2026)
  const [month, setMonth] = useState(2) // 0-indexed, 2 = March

  const [selected, setSelected] = useState<Draw | null>(null)

  // Build date → draw map
  const drawMap = useMemo(() => {
    const map: Record<string, Draw> = {}
    draws.forEach(d => {
      try {
        const cleaned = d.date.replace(/\s+/g,' ').trim()
        const parsed  = new Date(cleaned)
        if (!isNaN(parsed.getTime())) {
          const key = `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`
          map[key] = d
        }
      } catch {}
    })
    return map
  }, [selectedGame.id])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom:'1px solid var(--border)' }}>
        <span className="text-2xl">📅</span>
        <div>
          <div className="font-bold text-sm" style={{ color:'var(--accent)' }}>Draw Calendar</div>
          <div className="text-[10px]" style={{ color:'var(--text3)' }}>{selectedGame.name}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={prevMonth} className="px-2 py-1 rounded border text-sm"
            style={{ color:'var(--text3)', borderColor:'var(--border)' }}>‹</button>
          <span className="text-[11px] font-bold w-24 text-center" style={{ color:'var(--text2)' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="px-2 py-1 rounded border text-sm"
            style={{ color:'var(--text3)', borderColor:'var(--border)' }}>›</button>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border:'1px solid var(--border)' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[8px] py-2 font-bold"
              style={{ background:'var(--bg1)', color:'var(--text4)' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="h-16 sm:h-20"
              style={{ background:'var(--bg)', borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const key = `${year}-${month}-${day}`
            const draw = drawMap[key]
            const isToday = now.getFullYear()===year && now.getMonth()===month && now.getDate()===day

            return (
              <motion.div key={day} whileHover={{ scale: draw ? 1.02 : 1 }}
                className="h-16 sm:h-20 p-1 relative"
                style={{
                  background: draw ? 'rgba(0,255,157,0.04)' : 'var(--bg)',
                  borderRight:'1px solid var(--border)',
                  borderBottom:'1px solid var(--border)',
                  cursor: draw ? 'pointer' : 'default',
                  outline: selected === draw && draw ? '2px solid var(--accent)' : 'none',
                }}
                onClick={() => draw && setSelected(selected === draw ? null : draw)}>
                <div className={`text-[9px] font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full`}
                  style={isToday
                    ? { background:'var(--accent)', color:'var(--bg)' }
                    : { color: draw ? 'var(--accent)' : 'var(--text4)' }}>
                  {day}
                </div>
                {draw && (
                  <div className="space-y-0.5">
                    <div className="flex gap-0.5 flex-wrap">
                      {draw.numbers.slice(0,3).map((n,j) => (
                        <span key={j} className="text-[7px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                          style={{ background:'var(--accent)', color:'var(--bg)' }}>{n}</span>
                      ))}
                      {draw.numbers.length > 3 && <span className="text-[7px]" style={{ color:'var(--text4)' }}>+{draw.numbers.length-3}</span>}
                    </div>
                    {draw.jackpotWon && (
                      <div className="text-[7px] font-bold" style={{ color:'var(--amber)' }}>★ JACKPOT</div>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Selected draw detail */}
      {selected && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          className="mt-4 p-4 rounded-lg"
          style={{ background:'var(--bg1)', border:'1px solid var(--accent)33' }}>
          <div className="font-bold text-[11px] mb-3" style={{ color:'var(--accent)' }}>
            {selected.date} {selected.jackpotWon ? '⭐ JACKPOT WON' : ''}
          </div>
          <div className="flex gap-2 flex-wrap">
            {selected.numbers.map((n,i) => (
              <span key={i} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background:'var(--accent)', color:'var(--bg)' }}>{n}</span>
            ))}
            <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background:'var(--blue)', color:'white' }}>{selected.bonus}</span>
          </div>
          {selected.jackpot && (
            <div className="text-[10px] mt-3" style={{ color:'var(--amber)' }}>
              Jackpot: ${(selected.jackpot/1e6).toFixed(0)}M
              {selected.jackpotWon ? ' — WINNER!' : ' — No winner'}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

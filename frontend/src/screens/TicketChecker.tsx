import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useDraws } from '@/hooks/useDraws'
import { getDrawsForGame, Draw } from '@/data/realDraws'

// ── Prize tables ──────────────────────────────────────────────
function getPrize(game: string, matched: number, bonusMatch: boolean): string {
  if (game === 'powerball') {
    if (matched === 5 && bonusMatch)  return '🏆 JACKPOT'
    if (matched === 5)                return '💰 $1,000,000'
    if (matched === 4 && bonusMatch)  return '💵 $50,000'
    if (matched === 4)                return '💵 $100'
    if (matched === 3 && bonusMatch)  return '💵 $100'
    if (matched === 3)                return '💵 $7'
    if (matched === 2 && bonusMatch)  return '💵 $7'
    if (matched === 1 && bonusMatch)  return '💵 $4'
    if (matched === 0 && bonusMatch)  return '💵 $4'
  }
  if (game === 'mega-millions') {
    if (matched === 5 && bonusMatch)  return '🏆 JACKPOT'
    if (matched === 5)                return '💰 $1,000,000'
    if (matched === 4 && bonusMatch)  return '💵 $10,000'
    if (matched === 4)                return '💵 $500'
    if (matched === 3 && bonusMatch)  return '💵 $200'
    if (matched === 3)                return '💵 $10'
    if (matched === 2 && bonusMatch)  return '💵 $10'
    if (matched === 1 && bonusMatch)  return '💵 $4'
    if (matched === 0 && bonusMatch)  return '💵 $2'
  }
  if (game === 'millionaire-for-life') {
    if (matched === 5 && bonusMatch)  return '🏆 $1M/YEAR FOR LIFE'
    if (matched === 5)                return '💰 $100K/YEAR FOR LIFE'
    if (matched === 4 && bonusMatch)  return '💵 $7,500'
    if (matched === 4)                return '💵 $500'
    if (matched === 3 && bonusMatch)  return '💵 $250'
    if (matched === 3)                return '💵 $50'
    if (matched === 2 && bonusMatch)  return '💵 $25'
    if (matched === 1 && bonusMatch)  return '💵 $8'
  }
  return ''
}

type CheckMode = 'date' | 'all'

interface Result {
  draw:         Draw
  matched:      number[]
  bonusMatch:   boolean
  totalMatched: number
  prize:        string
}

// ── Number input grid ─────────────────────────────────────────
function NumberInputs({
  values, max, onChange, color, label, count = 5
}: {
  values: string[]; max: number; onChange: (v: string[]) => void
  color: string; label: string; count?: number
}) {
  return (
    <div>
      <div className="text-[8px] tracking-[2px] mb-2 uppercase"
        style={{ color:'var(--text4)' }}>
        {label} (1–{max})
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: count }, (_, i) => (
          <input key={i}
            type="number" min={1} max={max}
            value={values[i] ?? ''}
            onChange={e => {
              const next = [...values]
              next[i] = e.target.value
              onChange(next)
            }}
            placeholder={i + 1 + ''}
            className="w-12 h-12 text-center text-base font-bold rounded-lg outline-none"
            style={{
              background:  'var(--bg2)',
              border:      `2px solid ${values[i] ? color : 'var(--border)'}`,
              color,
              fontFamily:  'monospace',
              transition:  'border-color 0.15s',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Single draw result card ───────────────────────────────────
function ResultCard({ r, bonusName }: { r: Result; bonusName: string }) {
  const hasWin = !!r.prize

  return (
    <motion.div
      initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
      className="rounded-lg p-4"
      style={{
        background: hasWin ? 'rgba(255,184,48,0.06)' : 'var(--bg1)',
        border:     hasWin ? '1px solid rgba(255,184,48,0.35)' : '1px solid var(--border)',
      }}>

      {/* Draw date + jackpot status */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-[11px]" style={{ color:'var(--text2)' }}>
            {r.draw.date}
          </div>
          {r.draw.jackpot && r.draw.jackpot > 0 && (
            <div className="text-[9px] mt-0.5" style={{ color:'var(--text4)' }}>
              Jackpot: ${(r.draw.jackpot / 1_000_000).toFixed(0)}M
              {r.draw.jackpotWon ? ' — ★ JACKPOT WON THAT NIGHT' : ''}
            </div>
          )}
        </div>
        {hasWin ? (
          <span className="text-[10px] font-bold px-3 py-1 rounded-full"
            style={{ background:'var(--amber)', color:'#000' }}>
            {r.prize}
          </span>
        ) : (
          <span className="text-[9px] px-2 py-1 rounded-full"
            style={{ background:'var(--bg2)', color:'var(--text4)' }}>
            No prize
          </span>
        )}
      </div>

      {/* Winning numbers row */}
      <div className="mb-2">
        <div className="text-[8px] mb-1.5" style={{ color:'var(--text4)' }}>WINNING NUMBERS</div>
        <div className="flex gap-1.5 flex-wrap items-center">
          {r.draw.numbers.map((n, j) => {
            const isMatch = r.matched.includes(n)
            return (
              <motion.span key={j}
                initial={{ scale:0 }} animate={{ scale:1 }}
                transition={{ delay: j * 0.04, type:'spring', stiffness:300 }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={isMatch ? {
                  background: 'var(--accent)', color: 'var(--bg)',
                  boxShadow:  '0 0 10px rgba(0,255,157,0.4)',
                } : {
                  background: 'var(--bg2)', color: 'var(--text4)',
                  border:     '1px solid var(--border)',
                }}>
                {n}
              </motion.span>
            )
          })}

          <span className="text-[9px] mx-1" style={{ color:'var(--text4)' }}>+</span>

          {/* Bonus ball */}
          <motion.span
            initial={{ scale:0 }} animate={{ scale:1 }}
            transition={{ delay:0.25, type:'spring', stiffness:300 }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={r.bonusMatch ? {
              background: 'var(--blue)', color: '#fff',
              boxShadow:  '0 0 10px rgba(0,180,255,0.4)',
            } : {
              background: 'var(--bg2)', color: 'var(--text4)',
              border:     '1px solid var(--border)',
            }}>
            {r.draw.bonus}
          </motion.span>
          <span className="text-[8px]" style={{ color:'var(--text4)' }}>{bonusName}</span>
        </div>
      </div>

      {/* Match summary */}
      <div className="text-[9px] mt-2 pt-2" style={{ borderTop:'1px solid var(--border)', color:'var(--text3)' }}>
        {r.matched.length > 0
          ? `✓ Matched: ${r.matched.join(', ')}${r.bonusMatch ? ` + ${bonusName}` : ''}`
          : r.bonusMatch
            ? `✓ Matched ${bonusName} only`
            : 'No numbers matched'}
      </div>
    </motion.div>
  )
}

// ── Main screen ───────────────────────────────────────────────
export function TicketChecker() {
  const { selectedGame } = useGameStore()
  const { draws } = useDraws(selectedGame.id)

  const [mode, setMode]       = useState<CheckMode>('date')
  const [nums, setNums]       = useState<string[]>(['','','','',''])
  const [bonus, setBonus]     = useState('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [results, setResults] = useState<Result[]>([])
  const [checked, setChecked] = useState(false)
  const [error, setError]     = useState('')

  // Build sorted unique date options from draws
  const dateOptions = useMemo(() =>
    draws.map(d => d.date).slice(0, 60),
    [selectedGame.id]
  )

  const validate = (): { nums: number[]; bonus: number } | null => {
    setError('')
    const parsed = nums.map(v => parseInt(v)).filter(n => !isNaN(n))

    if (parsed.length !== 5) {
      setError('Enter all 5 main numbers'); return null
    }
    for (const n of parsed) {
      if (n < 1 || n > selectedGame.pool) {
        setError(`Numbers must be between 1 and ${selectedGame.pool}`); return null
      }
    }
    if (new Set(parsed).size !== 5) {
      setError('Numbers must be unique — no duplicates'); return null
    }

    const b = parseInt(bonus)
    if (isNaN(b) || b < 1 || b > selectedGame.bonusPool) {
      setError(`${selectedGame.bonusName} must be between 1 and ${selectedGame.bonusPool}`); return null
    }

    return { nums: parsed, bonus: b }
  }

  const check = useCallback(() => {
    const ticket = validate()
    if (!ticket) return

    // Which draws to check
    let pool: Draw[]
    if (mode === 'date') {
      if (!selectedDate) { setError('Select a draw date'); return }
      pool = draws.filter(d => d.date === selectedDate)
      if (!pool.length) { setError('No draw found for that date'); return }
    } else {
      pool = draws
    }

    const out: Result[] = []
    for (const draw of pool) {
      const matched    = ticket.nums.filter(n => draw.numbers.includes(n))
      const bonusMatch = ticket.bonus === draw.bonus
      const prize      = getPrize(selectedGame.id, matched.length, bonusMatch)
      out.push({ draw, matched, bonusMatch, totalMatched: matched.length, prize })
    }

    // Sort: winners first, then by match count
    out.sort((a, b) =>
      (b.prize ? 1 : 0) - (a.prize ? 1 : 0) ||
      b.totalMatched - a.totalMatched ||
      (b.bonusMatch ? 1 : 0) - (a.bonusMatch ? 1 : 0)
    )

    setResults(out)
    setChecked(true)
  }, [nums, bonus, mode, selectedDate, draws, selectedGame])

  const reset = () => {
    setNums(['','','','','']); setBonus('')
    setSelectedDate(''); setResults([])
    setChecked(false); setError('')
  }

  const wins = results.filter(r => r.prize)

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3"
        style={{ borderBottom:'1px solid var(--border)' }}>
        <span className="text-2xl">🎫</span>
        <div>
          <div className="font-bold text-sm" style={{ color:'var(--accent)' }}>
            Ticket Checker
          </div>
          <div className="text-[10px]" style={{ color:'var(--text3)' }}>
            {selectedGame.name} · Check your numbers against official draw results
          </div>
        </div>
        {checked && (
          <button onClick={reset}
            className="ml-auto text-[9px] px-3 py-1.5 rounded border"
            style={{ color:'var(--text3)', borderColor:'var(--border)' }}>
            ↺ NEW CHECK
          </button>
        )}
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-4">
        {([
          { key:'date', label:'📅 Check specific date', desc:'Pick one draw date' },
          { key:'all',  label:'📋 Check all draws',     desc:`Check all ${draws.length} draws` },
        ] as const).map(opt => (
          <button key={opt.key} onClick={() => { setMode(opt.key); setChecked(false); setResults([]) }}
            className="flex-1 py-2.5 px-3 rounded-lg text-left transition-all"
            style={mode === opt.key ? {
              background:  'rgba(0,255,157,0.08)',
              border:      '1px solid var(--accent)',
            } : {
              background: 'var(--bg1)',
              border:     '1px solid var(--border)',
            }}>
            <div className="text-[10px] font-bold" style={{ color: mode===opt.key ? 'var(--accent)' : 'var(--text2)' }}>
              {opt.label}
            </div>
            <div className="text-[9px]" style={{ color:'var(--text4)' }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      {/* Input panel */}
      <div className="rounded-lg p-4 mb-4"
        style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>

        {/* Date selector (only in date mode) */}
        {mode === 'date' && (
          <div className="mb-4">
            <div className="text-[8px] tracking-[2px] mb-2 uppercase"
              style={{ color:'var(--text4)' }}>
              SELECT DRAW DATE
            </div>
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[11px] outline-none"
              style={{
                background: 'var(--bg2)',
                border:     `2px solid ${selectedDate ? 'var(--accent)' : 'var(--border)'}`,
                color:      selectedDate ? 'var(--text)' : 'var(--text4)',
                fontFamily: 'monospace',
              }}>
              <option value="">— Pick a draw date —</option>
              {dateOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Show the winning numbers for selected date as a hint */}
            {selectedDate && (() => {
              const draw = draws.find(d => d.date === selectedDate)
              if (!draw) return null
              return (
                <div className="mt-2 p-2 rounded-lg flex items-center gap-2 flex-wrap"
                  style={{ background:'var(--bg2)', border:'1px solid var(--border)' }}>
                  <span className="text-[8px]" style={{ color:'var(--text4)' }}>WINNING:</span>
                  {draw.numbers.map((n,i) => (
                    <span key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background:'var(--accent)', color:'var(--bg)' }}>{n}</span>
                  ))}
                  <span className="text-[8px]" style={{ color:'var(--text4)' }}>+</span>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background:'var(--blue)', color:'#fff' }}>{draw.bonus}</span>
                  <span className="text-[8px]" style={{ color:'var(--text4)' }}>{selectedGame.bonusName}</span>
                  {draw.jackpot && draw.jackpot > 0 && (
                    <span className="ml-auto text-[8px] font-bold" style={{ color: draw.jackpotWon ? 'var(--amber)' : 'var(--text4)' }}>
                      ${(draw.jackpot/1e6).toFixed(0)}M{draw.jackpotWon ? ' ★ WON' : ''}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Main number inputs */}
        <div className="mb-4">
          <NumberInputs
            values={nums} max={selectedGame.pool}
            onChange={setNums}
            color="var(--accent)"
            label={`Your 5 main numbers`}
          />
        </div>

        {/* Bonus input */}
        <div className="mb-4">
          <div className="text-[8px] tracking-[2px] mb-2 uppercase"
            style={{ color:'var(--text4)' }}>
            Your {selectedGame.bonusName} (1–{selectedGame.bonusPool})
          </div>
          <input
            type="number" min={1} max={selectedGame.bonusPool}
            value={bonus}
            onChange={e => setBonus(e.target.value)}
            placeholder="?"
            className="w-12 h-12 text-center text-base font-bold rounded-lg outline-none"
            style={{
              background:  'var(--bg2)',
              border:      `2px solid ${bonus ? 'var(--blue)' : 'var(--border)'}`,
              color:       'var(--blue)',
              fontFamily:  'monospace',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-[10px] mb-3 px-3 py-2 rounded"
            style={{ background:'rgba(255,68,102,0.08)', color:'var(--red)', border:'1px solid rgba(255,68,102,0.2)' }}>
            ⚠ {error}
          </div>
        )}

        {/* Check button */}
        <button onClick={check}
          className="px-6 py-2.5 rounded-lg font-bold text-[11px] transition-all"
          style={{ background:'var(--accent)', color:'var(--bg)' }}>
          ▸ {mode === 'date'
              ? `CHECK THIS DRAW`
              : `CHECK ALL ${draws.length} DRAWS`}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {checked && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>

            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'DRAWS CHECKED', val: results.length,  color: 'var(--text2)' },
                { label: 'ANY MATCH',     val: results.filter(r => r.totalMatched > 0 || r.bonusMatch).length, color: 'var(--accent)' },
                { label: 'PRIZES WON',   val: wins.length, color: wins.length > 0 ? 'var(--amber)' : 'var(--text3)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="p-3 rounded-lg text-center"
                  style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
                  <div className="text-2xl font-bold font-mono" style={{ color }}>{val}</div>
                  <div className="text-[8px] mt-1" style={{ color:'var(--text4)' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Win banner */}
            {wins.length > 0 && (
              <motion.div initial={{ scale:0.95 }} animate={{ scale:1 }}
                className="rounded-lg p-4 mb-4 text-center"
                style={{ background:'rgba(255,184,48,0.1)', border:'2px solid var(--amber)' }}>
                <div className="text-xl mb-1">🎉</div>
                <div className="font-bold text-sm mb-1" style={{ color:'var(--amber)' }}>
                  YOU WON {wins.length > 1 ? `IN ${wins.length} DRAWS!` : 'A PRIZE!'}
                </div>
                {wins.map((r, i) => (
                  <div key={i} className="text-[10px]" style={{ color:'var(--text2)' }}>
                    {r.draw.date} → {r.prize}
                    {r.matched.length > 0 && ` (matched ${r.matched.join(', ')}${r.bonusMatch ? ' + bonus' : ''})`}
                  </div>
                ))}
              </motion.div>
            )}

            {/* No match at all */}
            {results.length === 0 && (
              <div className="text-center py-12" style={{ color:'var(--text3)' }}>
                <div className="text-5xl mb-3">😔</div>
                <div className="text-sm font-bold mb-2">No draws found for that date</div>
                <div className="text-[10px]" style={{ color:'var(--text4)' }}>
                  Try a different date or switch to "Check all draws"
                </div>
              </div>
            )}

            {results.length > 0 && wins.length === 0 && (
              <div className="text-center py-6 mb-4" style={{ color:'var(--text3)' }}>
                <div className="text-3xl mb-2">😔</div>
                <div className="text-sm">No prizes this time.</div>
                <div className="text-[10px] mt-1" style={{ color:'var(--text4)' }}>
                  Jackpot odds: 1 in {selectedGame.id === 'powerball' ? '292,201,338' : '290,472,336'}.
                  Play responsibly.
                </div>
              </div>
            )}

            {/* Result cards */}
            <div className="space-y-3">
              {results
                .filter(r => mode === 'date' || r.totalMatched > 0 || r.bonusMatch)
                .slice(0, mode === 'date' ? 999 : 30)
                .map((r, i) => (
                  <ResultCard key={i} r={r} bonusName={selectedGame.bonusName} />
                ))
              }
              {mode === 'all' && results.filter(r => r.totalMatched > 0 || r.bonusMatch).length === 0 && (
                <div className="text-center py-4 text-[10px]" style={{ color:'var(--text4)' }}>
                  No number matches found across {draws.length} draws.
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useDraws } from '@/hooks/useDraws'
import { getDrawsForGame, Draw } from '@/data/realDraws'
import clsx from 'clsx'

const fmt = (n: number) =>
  n >= 1_000_000_000 ? `$${(n/1_000_000_000).toFixed(2)}B`
  : n >= 1_000_000 ? `$${(n/1_000_000).toFixed(0)}M`
  : n > 0 ? `$${n.toLocaleString()}` : '—'

function ScreenTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4 text-[8px] sm:text-[9px] tracking-[2.5px] uppercase"
      style={{ color:'var(--text3)' }}>
      <span className="font-bold" style={{ color:'var(--accent)' }}>&gt;</span>
      <span className="truncate" style={{ color:'var(--text3)' }}>{children}</span>
      <div className="flex-1 h-px min-w-0" style={{ background:'var(--border)' }} />
    </div>
  )
}

export function History() {
  const { selectedGame } = useGameStore()
  const [showWinnersOnly, setShowWinnersOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const allDraws = getDrawsForGame(selectedGame.id)

  const filtered = useMemo(() => {
    let d = allDraws
    if (showWinnersOnly) d = d.filter(x => x.jackpotWon)
    if (search) d = d.filter(x =>
      x.date.toLowerCase().includes(search.toLowerCase()) ||
      x.numbers.join(' ').includes(search) ||
      String(x.bonus).includes(search)
    )
    return d
  }, [allDraws, showWinnersOnly, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)
  const isMFL      = selectedGame.id === 'millionaire-for-life'
  const isBigGame  = ['mega-millions','powerball'].includes(selectedGame.id)

  const biggestJackpot = isBigGame ? Math.max(...allDraws.filter(d=>d.jackpotWon).map(d=>d.jackpot), 0) : 0
  const totalWinners   = allDraws.filter(d=>d.jackpotWon).length

  return (
    <div>
      <ScreenTitle>
        DRAW HISTORY — {selectedGame.name.toUpperCase()} — {allDraws.length} DRAWS
      </ScreenTitle>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          { label:'TOTAL DRAWS',   value: allDraws.length.toString(), sub: isMFL ? 'Since Feb 22, 2026' : 'Official records' },
          { label:'JACKPOT WINS',  value: totalWinners.toString(),   sub: isMFL ? '$1M/yr for life wins' : '$1M+ jackpots', color:'var(--red)' },
          isBigGame && { label:'BIGGEST JACKPOT', value: fmt(biggestJackpot), sub: 'All-time record', color:'var(--amber)' },
          { label: selectedGame.bonusName.toUpperCase(), value: `1–${selectedGame.bonusPool}`, sub: `Range · ${selectedGame.drawTime}` },
        ].filter(Boolean).map((card: any, i) => (
          <div key={i} className="rounded-sm p-3 relative overflow-hidden"
            style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
            <div className="text-[8px] tracking-[2px] mb-1" style={{ color:'var(--text3)' }}>{card.label}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: card.color ?? 'var(--accent)' }}>{card.value}</div>
            <div className="text-[9px] mt-0.5" style={{ color:'var(--text4)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Game info banner for MFL */}
      {isMFL && (
        <div className="rounded-sm px-4 py-3 mb-3 text-[10px]"
          style={{ background:'var(--bg1)', border:'1px solid var(--accent)', color:'var(--text2)' }}>
          <span className="font-bold" style={{ color:'var(--accent)' }}>NEW GAME</span> — Millionaire for Life launched February 22, 2026.
          Replaced Lucky for Life & Cash4Life. Pick 5 from 1–58 + Millionaire Ball 1–5.
          Daily draws at 11:15 PM ET. Top prize: <strong>$1,000,000/year for life</strong>.
        </div>
      )}

      {/* Filters */}
      <div className="rounded-sm p-3 mb-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center"
        style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
        <input type="text" placeholder="Search by date or number..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 px-3 py-2 text-[10px] rounded-sm outline-none transition-all"
          style={{ background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }} />
        <button onClick={() => { setShowWinnersOnly(v=>!v); setPage(1) }}
          className="text-[9px] px-3 py-2 rounded-sm border transition-all whitespace-nowrap"
          style={showWinnersOnly
            ? { color:'var(--amber)', borderColor:'var(--amber)', background:'rgba(0,0,0,0.05)' }
            : { color:'var(--text3)', borderColor:'var(--border)' }}>
          {showWinnersOnly ? '★ WINNERS ONLY' : '☆ Show Winners Only'}
        </button>
        <div className="text-[9px] whitespace-nowrap" style={{ color:'var(--text3)' }}>
          {filtered.length} draws · Page {page}/{totalPages}
        </div>
      </div>

      {/* Draws table */}
      <div className="rounded-sm overflow-hidden" style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[9px] font-mono border-collapse">
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['DATE', 'WINNING NUMBERS', selectedGame.bonusName.toUpperCase(), isBigGame ? 'JACKPOT' : null, isBigGame ? 'MULT' : null, 'RESULT']
                  .filter(Boolean).map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-normal tracking-[1px]" style={{ color:'var(--text4)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center" style={{ color:'var(--text4)' }}>No draws found</td></tr>
              )}
              {paginated.map((draw, i) => (
                <motion.tr key={i}
                  initial={{opacity:0}} animate={{opacity:1}} transition={{delay:Math.min(i*0.02, 0.3)}}
                  className="transition-colors"
                  style={{
                    borderTop:`1px solid var(--border)`,
                    background: draw.jackpotWon ? 'rgba(255,184,48,0.06)' : 'transparent',
                  }}>
                  <td className="px-3 py-2.5 whitespace-nowrap font-bold"
                    style={{ color: draw.jackpotWon ? 'var(--amber)' : 'var(--text3)' }}>
                    {draw.date}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {draw.numbers.map((n, j) => (
                        <span key={j} className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[9px] font-bold"
                          style={{ background:'rgba(0,0,0,0.08)', color:'var(--accent)', border:'1px solid var(--border2)' }}>
                          {n}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[9px] font-bold"
                      style={{ background:'rgba(0,0,0,0.08)', color:'var(--blue)', border:'1px solid rgba(0,184,255,0.3)' }}>
                      {draw.bonus}
                    </span>
                  </td>
                  {isBigGame && (
                    <td className="px-3 py-2.5 font-bold whitespace-nowrap"
                      style={{ color: draw.jackpot >= 500_000_000 ? 'var(--red)' : draw.jackpot >= 100_000_000 ? 'var(--amber)' : 'var(--text2)' }}>
                      {fmt(draw.jackpot)}
                    </td>
                  )}
                  {isBigGame && (
                    <td className="px-3 py-2.5" style={{ color:'var(--purple)' }}>{draw.multiplier}</td>
                  )}
                  <td className="px-3 py-2.5">
                    {draw.jackpotWon ? (
                      <span className="text-[8px] px-2 py-0.5 rounded-sm font-bold"
                        style={{ color:'var(--amber)', border:'1px solid var(--amber)', background:'rgba(255,184,48,0.1)' }}>
                        ★ {isMFL ? '$1M/yr WINNER' : 'JACKPOT WON'}
                      </span>
                    ) : (
                      <span style={{ color:'var(--text4)' }}>—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-3" style={{ borderTop:'1px solid var(--border)' }}>
          <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}
            className="text-[9px] px-3 py-1.5 rounded-sm border transition-all disabled:opacity-30"
            style={{ color:'var(--text3)', borderColor:'var(--border)' }}>← PREV</button>
          <div className="flex gap-1">
            {Array.from({length:Math.min(5,totalPages)}, (_,i) => {
              const p = Math.min(Math.max(page-2+i, 1), totalPages-4+i)
              if (p<1||p>totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 text-[9px] rounded-sm border transition-all"
                  style={p===page
                    ? { borderColor:'var(--accent)', color:'var(--accent)', background:'rgba(0,0,0,0.05)' }
                    : { borderColor:'var(--border)', color:'var(--text3)' }}>
                  {p}
                </button>
              )
            })}
          </div>
          <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
            className="text-[9px] px-3 py-1.5 rounded-sm border transition-all disabled:opacity-30"
            style={{ color:'var(--text3)', borderColor:'var(--border)' }}>NEXT →</button>
        </div>
      </div>

      <p className="text-[8px] text-center mt-3" style={{ color:'var(--text4)' }}>
        Data sourced from megamillions.com · powerball.com · nclottery.com · Updates automatically after each draw
      </p>
    </div>
  )
}

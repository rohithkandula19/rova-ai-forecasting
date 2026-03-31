import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useDraws } from '@/hooks/useDraws'
import { getDrawsForGame } from '@/data/realDraws'

const fmt = (n: number) =>
  n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` :
  n >= 1e6 ? `$${(n/1e6).toFixed(0)}M` : `$${n.toLocaleString()}`

export function JackpotChart() {
  const { selectedGame } = useGameStore()
  const [hovered, setHovered] = useState<number | null>(null)
  const { draws } = useDraws(selectedGame.id)

  const data = useMemo(() => {
    const pts = draws
      .filter(d => d.jackpot && d.jackpot > 0)
      .slice(0, 60)
      .reverse()
    if (!pts.length) return null
    const max = Math.max(...pts.map(d => d.jackpot!))
    const min = Math.min(...pts.map(d => d.jackpot!))
    return { pts, max, min }
  }, [selectedGame.id])

  if (!data) return <div style={{ color:'var(--text3)' }}>No jackpot data available.</div>

  const W = 700, H = 220, PAD = 40
  const xScale = (i: number) => PAD + (i / (data.pts.length - 1)) * (W - PAD * 2)
  const yScale = (v: number) => H - PAD - ((v - data.min) / (data.max - data.min + 1)) * (H - PAD * 2)

  const points = data.pts.map((d, i) => ({ x: xScale(i), y: yScale(d.jackpot!), d }))
  const pathD  = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const fillD  = `${pathD} L ${points[points.length-1].x} ${H-PAD} L ${points[0].x} ${H-PAD} Z`

  const wins = data.pts.filter(d => d.jackpotWon)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom:'1px solid var(--border)' }}>
        <span className="text-2xl">📈</span>
        <div>
          <div className="font-bold text-sm" style={{ color:'var(--accent)' }}>Jackpot Trend</div>
          <div className="text-[10px]" style={{ color:'var(--text3)' }}>
            {selectedGame.name} · Last {data.pts.length} draws with jackpot data
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          ['PEAK JACKPOT', fmt(data.max), 'var(--amber)'],
          ['JACKPOT WINS', wins.length, 'var(--accent)'],
          ['CURRENT', selectedGame.id === 'powerball' ? '$180M' : selectedGame.id === 'mega-millions' ? '$80M' : '$1M/yr', 'var(--blue)'],
        ].map(([label, val, color]) => (
          <div key={label as string} className="p-3 rounded-lg"
            style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
            <div className="text-xl font-bold font-mono" style={{ color: color as string }}>{val}</div>
            <div className="text-[8px] mt-1" style={{ color:'var(--text4)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="rounded-lg p-3 overflow-hidden" style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }}>
          <defs>
            <linearGradient id="jackpot-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0,0.25,0.5,0.75,1].map(t => {
            const y = PAD + t * (H - PAD * 2)
            const val = data.max - t * (data.max - data.min)
            return (
              <g key={t}>
                <line x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="var(--border)" strokeDasharray="3,3" />
                <text x={PAD-4} y={y+4} textAnchor="end" fontSize={8} fill="var(--text4)">{fmt(val)}</text>
              </g>
            )
          })}

          {/* Fill area */}
          <motion.path d={fillD} fill="url(#jackpot-fill)"
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:1 }} />

          {/* Line */}
          <motion.path d={pathD} fill="none" stroke="var(--accent)" strokeWidth={2}
            initial={{ pathLength:0 }} animate={{ pathLength:1 }}
            transition={{ duration:1.5, ease:'easeOut' }} />

          {/* Win markers */}
          {points.filter(p => p.d.jackpotWon).map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={6} fill="var(--amber)" stroke="var(--bg1)" strokeWidth={2} />
              <text x={p.x} y={p.y-10} textAnchor="middle" fontSize={8} fill="var(--amber)">★</text>
            </g>
          ))}

          {/* Hover dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={hovered===i ? 5 : 3}
              fill={hovered===i ? 'var(--accent)' : 'var(--bg1)'}
              stroke="var(--accent)" strokeWidth={hovered===i ? 2 : 1}
              style={{ cursor:'pointer' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)} />
          ))}

          {/* Tooltip */}
          {hovered !== null && points[hovered] && (() => {
            const p = points[hovered]
            const tx = Math.min(Math.max(p.x, 60), W - 60)
            return (
              <g>
                <rect x={tx-50} y={p.y-36} width={100} height={28} rx={4}
                  fill="var(--bg)" stroke="var(--border)" />
                <text x={tx} y={p.y-22} textAnchor="middle" fontSize={9} fill="var(--accent)" fontWeight="bold">
                  {fmt(p.d.jackpot!)}
                </text>
                <text x={tx} y={p.y-12} textAnchor="middle" fontSize={7} fill="var(--text3)">
                  {p.d.date}{p.d.jackpotWon ? ' ★ WON' : ''}
                </text>
              </g>
            )
          })()}
        </svg>

        <div className="flex gap-4 mt-2 text-[8px] justify-center">
          <span style={{ color:'var(--accent)' }}>— Jackpot Size</span>
          <span style={{ color:'var(--amber)' }}>★ Jackpot Won</span>
        </div>
      </div>
    </div>
  )
}

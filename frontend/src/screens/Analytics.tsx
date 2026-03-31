import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useDraws } from '@/hooks/useDraws'
import { getDrawsForGame, computeStats } from '@/data/realDraws'
import clsx from 'clsx'

const fmt = (n: number) =>
  n >= 1_000_000_000 ? `$${(n/1_000_000_000).toFixed(2)}B`
  : n >= 1_000_000   ? `$${(n/1_000_000).toFixed(0)}M`
  : `$${n.toLocaleString()}`

function ScreenTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4 text-[8px] sm:text-[9px] tracking-[2.5px] uppercase"
      style={{ color:'var(--text3)' }}>
      <span className="font-bold" style={{ color:'var(--accent)' }}>&gt;</span>
      <span>{children}</span>
      <div className="flex-1 h-px" style={{ background:'var(--border)' }} />
    </div>
  )
}

function Card({ children, className, delay=0 }: any) {
  return (
    <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.25,delay}}
      className={`rounded-sm p-3 sm:p-4 relative overflow-hidden ${className??''}`}
      style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background:`linear-gradient(90deg,transparent,var(--accent2),transparent)`, opacity:0.2 }} />
      {children}
    </motion.div>
  )
}

function CardTitle({ children }: any) {
  return <div className="text-[8px] tracking-[2px] mb-2 uppercase" style={{ color:'var(--text3)' }}>{children}</div>
}

function MetricCard({ label, value, sub, tag, valueColor, delay=0 }: any) {
  return (
    <Card delay={delay}>
      <CardTitle>{label}</CardTitle>
      <div className="text-2xl sm:text-3xl font-bold font-mono" style={{ color: valueColor ?? 'var(--accent)' }}>{value}</div>
      {sub && <div className="text-[9px] mt-1" style={{ color:'var(--text3)' }}>{sub}</div>}
      {tag && (
        <span className="inline-block text-[8px] tracking-[1px] border px-1.5 py-0.5 rounded-sm mt-2"
          style={{ color:'var(--accent)', borderColor:'var(--border2)', background:'rgba(0,0,0,0.04)' }}>
          {tag}
        </span>
      )}
    </Card>
  )
}

// Heatmap color based on frequency vs average
function heatColor(pct: number, isDark: boolean) {
  if (pct > 1.4) return { bg: isDark ? 'rgba(255,68,102,0.55)'  : 'rgba(220,38,38,0.15)',  tx: isDark ? '#ff4466' : '#dc2626' }
  if (pct > 1.2) return { bg: isDark ? 'rgba(255,184,48,0.40)'  : 'rgba(217,119,6,0.15)',   tx: isDark ? '#ffb830' : '#d97706' }
  if (pct > 0.8) return { bg: isDark ? 'rgba(0,255,157,0.20)'   : 'rgba(0,102,204,0.10)',   tx: isDark ? '#00ff9d' : '#0066cc' }
  return              { bg: isDark ? 'rgba(0,255,157,0.04)'   : 'rgba(0,0,0,0.04)',       tx: isDark ? '#1e3d2d' : '#94a3b8' }
}

export function Analytics() {
  const { selectedGame } = useGameStore()
  const { draws } = useDraws(selectedGame.id)
  const stats  = useMemo(() => computeStats(draws, selectedGame.pool), [selectedGame.id])
  const isDark  = document.documentElement.getAttribute('data-theme') !== 'light'
  const isMFL   = selectedGame.id === 'millionaire-for-life'
  const isBig   = ['mega-millions','powerball'].includes(selectedGame.id)

  if (!stats) return (
    <div className="flex items-center justify-center h-40" style={{ color:'var(--text3)' }}>
      No draw data available yet.
    </div>
  )

  // Top-5 frequency bar data
  const topFreq = stats.heatmap
    .sort((a,b) => b.frequency - a.frequency)
    .slice(0, 8)
  const maxF = topFreq[0]?.frequency ?? 1

  // Last 5 draws for table
  const last5 = draws.slice(0, 5)

  return (
    <div>
      <ScreenTitle>
        ANALYTICS — {selectedGame.name.toUpperCase()} — {stats.totalDraws} DRAWS
      </ScreenTitle>

      {/* ── Key metrics ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <MetricCard
          label="TOTAL DRAWS" value={stats.totalDraws}
          sub={isMFL ? 'Since Feb 22, 2026' : `${selectedGame.drawDays}`}
          tag={isMFL ? 'NEW GAME' : 'OFFICIAL'}
          delay={0}
        />
        <MetricCard
          label="HOTTEST NUMBER" value={stats.hotNumber}
          sub={`↑ ${stats.hotPct}% above avg`}
          tag="HOT" valueColor="var(--red)"
          delay={0.05}
        />
        <MetricCard
          label={isBig ? 'BIGGEST JACKPOT' : 'PRIZE'}
          value={isBig ? fmt(stats.biggestJackpot) : '$1M/yr'}
          sub={isBig ? `${stats.jackpotWins} jackpot win${stats.jackpotWins !== 1 ? 's' : ''} this year` : 'Per year for life'}
          tag={isBig ? 'THIS YEAR' : 'TOP PRIZE'}
          valueColor="var(--amber)"
          delay={0.1}
        />
        <MetricCard
          label="COLDEST NUMBER" value={stats.coldNumber}
          sub={`↓ ${stats.coldPct}% below avg`}
          tag="COLD STREAK" valueColor="var(--blue)"
          delay={0.15}
        />
      </div>

      {/* ── Heatmap + Frequency ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 mb-3">
        <Card className="lg:col-span-2" delay={0.2}>
          <CardTitle>FREQUENCY HEATMAP — ALL {selectedGame.pool} NUMBERS</CardTitle>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns:'repeat(10,minmax(0,1fr))' }}>
            {Array.from({length: selectedGame.pool}, (_,i) => {
              const n = i + 1
              const f = stats.frequency[n] ?? 0
              const avg = stats.totalDraws > 0 ? (stats.totalDraws * 5) / selectedGame.pool : 1
              const pct = avg > 0 ? f / avg : 1
              const { bg, tx } = heatColor(pct, isDark)
              return (
                <div key={n} title={`Number ${n}: appeared ${f} times`}
                  className="aspect-square flex items-center justify-center rounded-sm text-[8px] sm:text-[9px] font-bold font-mono cursor-pointer transition-transform hover:scale-110"
                  style={{ background: bg, color: tx }}>
                  {n}
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3 text-[8px]">
            <span style={{ color:'var(--red)' }}>▮ HOT</span>
            <span style={{ color:'var(--amber)' }}>▮ WARM</span>
            <span style={{ color:'var(--accent)' }}>▮ NORMAL</span>
            <span style={{ color:'var(--text4)' }}>▮ COLD</span>
          </div>
        </Card>

        <Card delay={0.25}>
          <CardTitle>TOP 8 HOTTEST NUMBERS</CardTitle>
          {topFreq.map((item, i) => (
            <div key={item.number} className="flex items-center gap-2 mb-2">
              <div className="w-14 text-[9px] shrink-0" style={{ color:'var(--text3)' }}>
                NUM_{String(item.number).padStart(2,'0')}
              </div>
              <div className="flex-1 rounded-full overflow-hidden" style={{ background:'var(--border)', height:3 }}>
                <motion.div
                  initial={{ width:0 }} animate={{ width:`${(item.frequency/maxF)*100}%` }}
                  transition={{ duration:0.8, delay:0.3+i*0.05 }}
                  className="h-full rounded-full"
                  style={{ background: i === 0 ? 'var(--red)' : i < 3 ? 'var(--amber)' : 'var(--accent)' }}
                />
              </div>
              <div className="w-8 text-right text-[9px] shrink-0 font-bold font-mono" style={{ color:'var(--text2)' }}>
                {item.frequency}x
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* ── Last 5 draws + Game info ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
        <Card delay={0.3}>
          <CardTitle>LAST {last5.length} DRAWS</CardTitle>
          <table className="w-full text-[9px] font-mono border-collapse">
            <thead>
              <tr style={{ color:'var(--text4)' }}>
                <th className="pb-2 pr-3 text-left font-normal">DATE</th>
                <th className="pb-2 pr-3 text-left font-normal">NUMBERS</th>
                <th className="pb-2 text-left font-normal">{selectedGame.bonusName.toUpperCase()}</th>
              </tr>
            </thead>
            <tbody>
              {last5.map((d, i) => (
                <tr key={i} className="transition-colors" style={{ borderTop:'1px solid var(--border)' }}>
                  <td className="py-1.5 pr-3 whitespace-nowrap" style={{ color: d.jackpotWon ? 'var(--amber)' : 'var(--text3)' }}>
                    {d.jackpotWon ? '★ ' : ''}{d.date}
                  </td>
                  <td className="py-1.5 pr-3">
                    <div className="flex gap-1 flex-wrap">
                      {d.numbers.map((n,j) => (
                        <span key={j} className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[8px] font-bold"
                          style={{ background:'rgba(0,0,0,0.06)', color:'var(--accent)', border:'1px solid var(--border2)' }}>
                          {n}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-1.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[8px] font-bold"
                      style={{ background:'rgba(0,0,0,0.06)', color:'var(--blue)', border:'1px solid rgba(0,184,255,0.25)' }}>
                      {d.bonus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card delay={0.35}>
          <CardTitle>GAME INFORMATION</CardTitle>
          <div className="space-y-2 text-[10px]" style={{ color:'var(--text2)' }}>
            <div className="flex justify-between py-1.5" style={{ borderBottom:'1px solid var(--border)' }}>
              <span style={{ color:'var(--text3)' }}>Main Numbers</span>
              <span className="font-bold">1 – {selectedGame.pool}</span>
            </div>
            {selectedGame.bonusName && (
              <div className="flex justify-between py-1.5" style={{ borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--text3)' }}>{selectedGame.bonusName}</span>
                <span className="font-bold">1 – {selectedGame.bonusPool}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5" style={{ borderBottom:'1px solid var(--border)' }}>
              <span style={{ color:'var(--text3)' }}>Draw Days</span>
              <span className="font-bold">{selectedGame.drawDays}</span>
            </div>
            <div className="flex justify-between py-1.5" style={{ borderBottom:'1px solid var(--border)' }}>
              <span style={{ color:'var(--text3)' }}>Draw Time</span>
              <span className="font-bold">{selectedGame.drawTime}</span>
            </div>
            <div className="flex justify-between py-1.5" style={{ borderBottom:'1px solid var(--border)' }}>
              <span style={{ color:'var(--text3)' }}>Ticket Price</span>
              <span className="font-bold">${selectedGame.ticketPrice.toFixed(2)}/play</span>
            </div>
            {isBig && (
              <div className="flex justify-between py-1.5" style={{ borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--text3)' }}>Current Jackpot</span>
                <span className="font-bold" style={{ color:'var(--amber)' }}>
                  {selectedGame.id === 'mega-millions' ? '$80M' : '$180M'}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1.5">
              <span style={{ color:'var(--text3)' }}>Data Source</span>
              <span className="text-[8px]" style={{ color:'var(--text4)' }}>
                {selectedGame.id === 'mega-millions' ? 'megamillions.com' :
                 selectedGame.id === 'powerball' ? 'powerball.com' : 'nclottery.com'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

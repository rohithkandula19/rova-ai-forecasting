import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useDraws } from '@/hooks/useDraws'
import { getDrawsForGame } from '@/data/realDraws'

export function CoOccurrence() {
  const { selectedGame } = useGameStore()
  const { draws } = useDraws(selectedGame.id)
  const [view, setView] = useState<'pairs' | 'matrix'>('pairs')
  const [filterN, setFilterN] = useState<number | null>(null)

  const analysis = useMemo(() => {
    const pairs: Record<string, number> = {}
    const freq:  Record<number, number> = {}

    draws.forEach(d => {
      d.numbers.forEach(n => { freq[n] = (freq[n] || 0) + 1 })
      for (let i = 0; i < d.numbers.length; i++) {
        for (let j = i+1; j < d.numbers.length; j++) {
          const key = `${Math.min(d.numbers[i],d.numbers[j])}-${Math.max(d.numbers[i],d.numbers[j])}`
          pairs[key] = (pairs[key] || 0) + 1
        }
      }
    })

    const topPairs = Object.entries(pairs)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 30)
      .map(([key, count]) => {
        const [a, b] = key.split('-').map(Number)
        return { a, b, count, key }
      })

    return { pairs, freq, topPairs }
  }, [selectedGame.id])

  const filtered = filterN
    ? analysis.topPairs.filter(p => p.a === filterN || p.b === filterN)
    : analysis.topPairs

  const maxCount = filtered[0]?.count || 1

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom:'1px solid var(--border)' }}>
        <span className="text-2xl">🧠</span>
        <div>
          <div className="font-bold text-sm" style={{ color:'var(--accent)' }}>Number Co-Occurrence</div>
          <div className="text-[10px]" style={{ color:'var(--text3)' }}>
            {selectedGame.name} · Which numbers appear together most across {draws.length} draws
          </div>
        </div>
        <div className="ml-auto flex gap-1">
          {(['pairs','matrix'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="text-[9px] px-2 py-1 rounded"
              style={view===v
                ? { background:'var(--accent)', color:'var(--bg)' }
                : { border:'1px solid var(--border)', color:'var(--text3)' }}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {filterN && (
        <div className="flex items-center gap-2 mb-3 text-[10px]">
          <span style={{ color:'var(--text3)' }}>Showing pairs with number</span>
          <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold"
            style={{ background:'var(--accent)', color:'var(--bg)' }}>{filterN}</span>
          <button onClick={() => setFilterN(null)} className="px-2 py-0.5 rounded text-[9px]"
            style={{ border:'1px solid var(--border)', color:'var(--text3)' }}>✕ Clear</button>
        </div>
      )}

      {view === 'pairs' && (
        <div className="space-y-2">
          {filtered.map((pair, i) => (
            <motion.div key={pair.key} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-2.5 rounded-lg"
              style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
              <span className="text-[9px] w-5 shrink-0" style={{ color:'var(--text4)' }}>#{i+1}</span>
              <div className="flex gap-2 items-center shrink-0">
                {[pair.a, pair.b].map(n => (
                  <button key={n} onClick={() => setFilterN(filterN===n ? null : n)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                    style={filterN===n
                      ? { background:'var(--accent)', color:'var(--bg)' }
                      : { background:'var(--bg2)', color:'var(--text2)', border:'1px solid var(--border)' }}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex-1">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--border)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background:`linear-gradient(90deg, var(--accent), var(--accent2))` }}
                    initial={{ width:0 }}
                    animate={{ width:`${(pair.count/maxCount)*100}%` }}
                    transition={{ duration:0.8, delay: i*0.03 }} />
                </div>
              </div>
              <span className="text-[10px] font-bold w-12 text-right shrink-0"
                style={{ color:'var(--accent)' }}>{pair.count}x</span>
              <span className="text-[9px] shrink-0" style={{ color:'var(--text4)' }}>
                {((pair.count/draws.length)*100).toFixed(1)}%
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {view === 'matrix' && (
        <div className="rounded-lg p-3" style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
          <div className="text-[9px] mb-3" style={{ color:'var(--text3)' }}>
            Top 15 numbers · cell color = co-occurrence frequency
          </div>
          <div className="overflow-x-auto">
            {(() => {
              const top15 = Object.entries(analysis.freq)
                .sort((a,b) => Number(b[1])-Number(a[1]))
                .slice(0,15)
                .map(([n]) => Number(n))
              const maxC = Math.max(...top15.flatMap(a =>
                top15.map(b => a!==b ? (analysis.pairs[`${Math.min(a,b)}-${Math.max(a,b)}`]||0) : 0)
              ))
              return (
                <table className="text-[8px] border-collapse">
                  <thead>
                    <tr>
                      <th className="w-6 h-6" />
                      {top15.map(n => (
                        <th key={n} className="w-7 h-7 font-bold text-center"
                          style={{ color:'var(--accent)' }}>{n}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {top15.map(a => (
                      <tr key={a}>
                        <td className="font-bold text-right pr-1" style={{ color:'var(--accent)' }}>{a}</td>
                        {top15.map(b => {
                          if (a === b) return <td key={b} className="w-7 h-7"
                            style={{ background:'var(--bg2)' }} />
                          const key = `${Math.min(a,b)}-${Math.max(a,b)}`
                          const c   = analysis.pairs[key] || 0
                          const intensity = maxC > 0 ? c / maxC : 0
                          return (
                            <td key={b} className="w-7 h-7 text-center font-bold"
                              title={`${a} + ${b}: ${c} times`}
                              style={{
                                background: `rgba(0,255,157,${intensity * 0.6})`,
                                color: intensity > 0.5 ? 'var(--bg)' : 'var(--text3)',
                                cursor: 'default',
                              }}>
                              {c > 0 ? c : ''}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })()}
          </div>
        </div>
      )}
      <p className="text-[9px] mt-4 text-center" style={{ color:'var(--text4)' }}>
        ⚠️ Co-occurrence patterns are historical statistics only. They have no predictive value for future draws.
      </p>
    </div>
  )
}

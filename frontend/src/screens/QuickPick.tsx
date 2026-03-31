import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useDraws } from '@/hooks/useDraws'
import { getDrawsForGame } from '@/data/realDraws'
import { computeStats } from '@/data/realDraws'

interface Combo {
  id:      number
  numbers: number[]
  bonus:   number
  strategy: string
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickUnique(count: number, max: number, weighted?: Record<number,number>): number[] {
  const picked = new Set<number>()
  const attempts = count * 50
  let i = 0
  while (picked.size < count && i++ < attempts) {
    let n: number
    if (weighted && Math.random() < 0.6) {
      // Weighted pick — favor hot numbers
      const entries = Object.entries(weighted)
      const total = entries.reduce((s, [,v]) => s + v, 0)
      let r = Math.random() * total
      n = parseInt(entries[0][0])
      for (const [k, v] of entries) {
        r -= v
        if (r <= 0) { n = parseInt(k); break }
      }
    } else {
      n = randomInt(1, max)
    }
    picked.add(n)
  }
  // Fill remaining randomly if needed
  while (picked.size < count) picked.add(randomInt(1, max))
  return Array.from(picked).sort((a, b) => a - b)
}

function generateCombos(
  count: number,
  strategy: string,
  pool: number,
  bonusPool: number,
  freq: Record<number, number>
): Combo[] {
  const results: Combo[] = []
  const total = Object.values(freq).reduce((a, b) => a + b, 0)
  const avgFreq = total / pool

  const hotWeights: Record<number, number> = {}
  const coldWeights: Record<number, number> = {}
  const balWeights: Record<number, number> = {}

  for (let n = 1; n <= pool; n++) {
    const f = freq[n] || 0
    hotWeights[n]  = Math.max(f, 0.1)
    coldWeights[n] = Math.max(avgFreq - f + 0.1, 0.1)
    balWeights[n]  = 1 // uniform
  }

  for (let i = 0; i < count; i++) {
    let numbers: number[]
    switch (strategy) {
      case 'hot':
        numbers = pickUnique(5, pool, hotWeights); break
      case 'cold':
        numbers = pickUnique(5, pool, coldWeights); break
      case 'balanced': {
        // Mix hot and cold
        const hotNums  = Object.entries(hotWeights).sort((a,b) => Number(b[1])-Number(a[1])).slice(0,20).map(([n])=>parseInt(n))
        const coldNums = Object.entries(coldWeights).sort((a,b) => Number(b[1])-Number(a[1])).slice(0,20).map(([n])=>parseInt(n))
        const picked   = new Set<number>()
        const hotPick  = hotNums.sort(() => Math.random()-0.5).slice(0,3)
        const coldPick = coldNums.filter(n => !picked.has(n)).sort(() => Math.random()-0.5).slice(0,2)
        hotPick.forEach(n => picked.add(n))
        coldPick.forEach(n => picked.add(n))
        while (picked.size < 5) picked.add(randomInt(1, pool))
        numbers = Array.from(picked).sort((a,b) => a-b)
        break
      }
      case 'random':
      default:
        numbers = pickUnique(5, pool); break
    }
    results.push({
      id:       i,
      numbers,
      bonus:    randomInt(1, bonusPool),
      strategy,
    })
  }
  return results
}

const STRATEGIES = [
  { key:'random',   label:'🎲 Random',   desc:'Pure random — no bias' },
  { key:'hot',      label:'🔥 Hot',      desc:'Favor recently frequent numbers' },
  { key:'cold',     label:'❄️ Cold',      desc:'Favor rarely drawn numbers' },
  { key:'balanced', label:'⚖️ Balanced', desc:'Mix of hot and cold numbers' },
]

export function QuickPick() {
  const { selectedGame } = useGameStore()
  const { draws } = useDraws(selectedGame.id)
  const stats = computeStats(draws, selectedGame.pool)

  const [count,    setCount]    = useState(5)
  const [strategy, setStrategy] = useState('balanced')
  const [combos,   setCombos]   = useState<Combo[]>([])
  const [copied,   setCopied]   = useState<number | null>(null)

  const generate = useCallback(() => {
    const freq = stats?.frequency ?? {}
    const newCombos = generateCombos(
      count, strategy,
      selectedGame.pool,
      selectedGame.bonusPool,
      freq
    )
    setCombos(newCombos)
  }, [count, strategy, selectedGame, stats])

  const copyCombo = (combo: Combo) => {
    const text = `${combo.numbers.join(' - ')} | ${selectedGame.bonusName}: ${combo.bonus}`
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(combo.id)
    setTimeout(() => setCopied(null), 1500)
  }

  const copyAll = () => {
    const text = combos.map((c, i) =>
      `${i+1}. ${c.numbers.join(' - ')} | ${selectedGame.bonusName}: ${c.bonus}`
    ).join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3"
        style={{ borderBottom:'1px solid var(--border)' }}>
        <span className="text-2xl">🎯</span>
        <div>
          <div className="font-bold text-sm" style={{ color:'var(--accent)' }}>Quick Pick</div>
          <div className="text-[10px]" style={{ color:'var(--text3)' }}>
            {selectedGame.name} · Generate up to 50 combinations
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-xl p-4 mb-4"
        style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>

        {/* Count picker */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-widest"
              style={{ color:'var(--text3)' }}>
              HOW MANY COMBINATIONS?
            </span>
            <span className="text-xl font-black font-mono"
              style={{ color:'var(--accent)' }}>{count}</span>
          </div>
          <input type="range" min={1} max={50} value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-full" style={{ accentColor:'var(--accent)' }} />
          <div className="flex justify-between text-[8px] mt-1"
            style={{ color:'var(--text4)' }}>
            <span>1</span>
            <span>10</span>
            <span>20</span>
            <span>30</span>
            <span>40</span>
            <span>50</span>
          </div>
          {/* Quick presets */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {[1, 5, 10, 20, 50].map(n => (
              <button key={n} onClick={() => setCount(n)}
                className="text-[9px] px-3 py-1 rounded-full transition-all"
                style={count===n
                  ? { background:'var(--accent)', color:'var(--bg)' }
                  : { border:'1px solid var(--border)', color:'var(--text4)' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Strategy */}
        <div className="mb-4">
          <div className="text-[10px] font-bold tracking-widest mb-2"
            style={{ color:'var(--text3)' }}>STRATEGY</div>
          <div className="grid grid-cols-2 gap-2">
            {STRATEGIES.map(s => (
              <button key={s.key} onClick={() => setStrategy(s.key)}
                className="text-left p-2.5 rounded-lg transition-all"
                style={strategy===s.key
                  ? { background:'rgba(0,255,157,0.08)', border:'1px solid var(--accent)' }
                  : { background:'var(--bg2)', border:'1px solid var(--border)' }}>
                <div className="text-[10px] font-bold"
                  style={{ color: strategy===s.key ? 'var(--accent)' : 'var(--text2)' }}>
                  {s.label}
                </div>
                <div className="text-[8px] mt-0.5" style={{ color:'var(--text4)' }}>
                  {s.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={generate}
            className="flex-1 py-3 rounded-xl font-black text-sm tracking-widest"
            style={{ background:'var(--accent)', color:'var(--bg)' }}>
            ▸ GENERATE {count} COMBO{count > 1 ? 'S' : ''}
          </button>
          {combos.length > 0 && (
            <button onClick={copyAll}
              className="px-4 py-3 rounded-xl text-[10px] font-bold"
              style={{ border:'1px solid var(--border)', color:'var(--text3)' }}>
              COPY ALL
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {combos.length > 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <div className="text-[9px] mb-2" style={{ color:'var(--text4)' }}>
              {combos.length} combinations · {STRATEGIES.find(s=>s.key===strategy)?.label} strategy
            </div>
            <div className="space-y-2">
              {combos.map((combo, i) => (
                <motion.div key={combo.id}
                  initial={{ opacity:0, x:-10 }}
                  animate={{ opacity:1, x:0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
                  <span className="text-[9px] w-6 text-right shrink-0 font-mono"
                    style={{ color:'var(--text4)' }}>{i+1}</span>
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    {combo.numbers.map((n, j) => (
                      <span key={j}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background:'var(--accent)', color:'var(--bg)' }}>
                        {n}
                      </span>
                    ))}
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background:'var(--blue)', color:'#fff' }}>
                      {combo.bonus}
                    </span>
                  </div>
                  <button onClick={() => copyCombo(combo)}
                    className="text-[9px] px-2 py-1 rounded shrink-0"
                    style={copied===combo.id
                      ? { background:'var(--accent)', color:'var(--bg)' }
                      : { border:'1px solid var(--border)', color:'var(--text4)' }}>
                    {copied===combo.id ? '✓' : 'COPY'}
                  </button>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg text-center text-[9px]"
              style={{ color:'var(--text4)', border:'1px solid var(--border)' }}>
              ⚠️ These are statistically-informed combinations only.
              Lottery draws are cryptographically random — past patterns have no predictive value.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

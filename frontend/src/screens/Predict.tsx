import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardTitle, ScreenTitle, Ball, BarRow, Spinner } from '@/components/ui'
import { useGameStore } from '@/stores/gameStore'
import { rovaApi } from '@/api/client'
import clsx from 'clsx'

const STRATEGY_COLORS: Record<string, string> = {
  'Statistical Balance':    'text-rova-accent',
  'Hot Number Focus':       'text-rova-red',
  'Overdue Number Focus':   'text-rova-amber',
  'Co-occurrence Pattern':  'text-rova-blue',
  'Lucky Prediction':       'text-rova-purple',
}
const STRATEGY_ICONS: Record<string, string> = {
  'Statistical Balance':   '⚖',
  'Hot Number Focus':      '🔥',
  'Overdue Number Focus':  '⏰',
  'Co-occurrence Pattern': '🔗',
  'Lucky Prediction':      '🍀',
}

function numberType(n: number, hot: number[], cold: number[], overdue: number[]): 'hot'|'warm'|'bonus'|'cold'|'main' {
  if (hot.includes(n))    return 'hot'
  if (overdue.includes(n)) return 'warm'
  if (cold.includes(n))   return 'cold'
  return 'main'
}

export function Predict() {
  const { selectedGame } = useGameStore()
  const [nDraws, setNDraws]   = useState(50)
  const [generated, setGenerated] = useState(false)

  // Fetch AI predictions
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['predict', selectedGame.id, nDraws],
    queryFn:  () => rovaApi.predict(selectedGame.id, nDraws).then(r => r.data),
    enabled:  generated,
  })

  const hotNums     = data?.analysis_summary?.hot_numbers     ?? []
  const coldNums    = data?.analysis_summary?.cold_numbers    ?? []
  const overdueNums = data?.analysis_summary?.overdue_numbers ?? []
  const combos      = data?.combinations ?? []

  const handleGenerate = () => {
    setGenerated(true)
    if (generated) refetch()
  }

  return (
    <div>
      <ScreenTitle>AI PREDICTION — {selectedGame.name.toUpperCase()} — GENERATE WINNING COMBINATIONS</ScreenTitle>

      {/* Game info + controls */}
      <Card delay={0} className="mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="text-rova-accent font-bold text-sm mb-1">{selectedGame.name}</div>
            <div className="text-[10px] text-rova-text3">{selectedGame.description}</div>
            <div className="text-[9px] text-rova-text4 mt-1">
              Pool: 1–{selectedGame.pool} · {selectedGame.bonusName && `${selectedGame.bonusName}: 1–${selectedGame.bonusPool} · `}Draws: {selectedGame.drawDays} · ${selectedGame.ticketPrice.toFixed(2)}/ticket
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[220px]">
            <div className="text-[9px] text-rova-text3 tracking-wide">ANALYZE LAST <span className="text-rova-accent font-bold text-sm">{nDraws}</span> DRAWS</div>
            <input type="range" min={10} max={500} step={10} value={nDraws}
              onChange={e => setNDraws(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-[8px] text-rova-text4">
              <span>10 (recent)</span><span>250 (balanced)</span><span>500 (all-time)</span>
            </div>
            <button onClick={handleGenerate} disabled={isLoading}
              className="flex items-center justify-center gap-2 text-[10px] tracking-[2px] px-4 py-2.5 border border-rova-accent bg-rova-accent/8 text-rova-accent rounded-sm hover:bg-rova-accent/16 transition-all disabled:opacity-50 font-bold">
              {isLoading ? <><Spinner /> ANALYZING {nDraws} DRAWS...</> : '▸ GENERATE 5 AI COMBINATIONS'}
            </button>
          </div>
        </div>
      </Card>

      {/* Hot / Cold / Overdue summary */}
      {data && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card delay={0.05}>
            <CardTitle>🔥 HOT NUMBERS</CardTitle>
            <div className="flex flex-wrap gap-1">
              {hotNums.slice(0,8).map((n: number) => <Ball key={n} number={n} type="hot" size="sm"/>)}
            </div>
            <p className="text-[8px] text-rova-text4 mt-1.5">Above-average frequency in last {nDraws} draws</p>
          </Card>
          <Card delay={0.08}>
            <CardTitle>⏰ OVERDUE</CardTitle>
            <div className="flex flex-wrap gap-1">
              {overdueNums.map((n: number) => <Ball key={n} number={n} type="warm" size="sm"/>)}
            </div>
            <p className="text-[8px] text-rova-text4 mt-1.5">Statistically due to appear soon</p>
          </Card>
          <Card delay={0.11}>
            <CardTitle>❄️ COLD NUMBERS</CardTitle>
            <div className="flex flex-wrap gap-1">
              {coldNums.slice(0,8).map((n: number) => <Ball key={n} number={n} type="cold" size="sm"/>)}
            </div>
            <p className="text-[8px] text-rova-text4 mt-1.5">Below-average frequency — avoid or gamble</p>
          </Card>
        </div>
      )}

      {/* 5 AI Combinations */}
      {!data && !isLoading && (
        <Card delay={0.15}>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">◎</div>
            <div className="text-rova-text2 text-sm font-bold mb-1">Ready to Generate</div>
            <div className="text-rova-text3 text-[10px]">
              Select how many draws to analyze (10–500) then click Generate.<br/>
              ROVA will analyze frequency, hot/cold patterns, and co-occurrence to produce 5 ranked combinations.
            </div>
          </div>
        </Card>
      )}

      {isLoading && (
        <Card delay={0}>
          <div className="flex flex-col items-center py-8 gap-3">
            <Spinner />
            <div className="text-rova-text2 text-[10px]">Analyzing {nDraws} historical draws for {selectedGame.name}...</div>
            <div className="text-rova-text4 text-[9px]">Computing frequency, entropy, co-occurrence, positional bias...</div>
          </div>
        </Card>
      )}

      {data && !isLoading && (
        <div className="space-y-2">
          {combos.map((combo: any, i: number) => {
            const color = STRATEGY_COLORS[combo.strategy] ?? 'text-rova-accent'
            const icon  = STRATEGY_ICONS[combo.strategy]  ?? '◈'
            return (
              <motion.div key={i}
                initial={{ opacity:0, x:-10 }}
                animate={{ opacity:1, x:0 }}
                transition={{ delay: i * 0.08 }}>
                <Card className={i === 0 ? 'border-rova-border2' : ''}>
                  <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                    {/* Rank */}
                    <div className="flex flex-col items-center shrink-0 pt-0.5">
                      <div className={clsx('text-xl font-bold', color)}>#{combo.rank}</div>
                      <div className="text-[8px] text-rova-text4">RANK</div>
                    </div>

                    {/* Numbers */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        {combo.numbers.map((n: number) => (
                          <Ball key={n} number={n} size="md"
                            type={numberType(n, hotNums, coldNums, overdueNums)} />
                        ))}
                        {combo.bonus > 0 && selectedGame.bonusName && (
                          <>
                            <span className="text-rova-text4 text-[9px]">+</span>
                            <Ball number={combo.bonus} type="bonus" size="md" />
                            <span className="text-[8px] text-rova-blue">{selectedGame.bonusName}</span>
                          </>
                        )}
                      </div>
                      <div className={clsx('text-[10px] font-bold mb-0.5', color)}>
                        {icon} {combo.strategy}
                      </div>
                      <div className="text-[9px] text-rova-text3 leading-5">{combo.explanation}</div>
                      <div className="flex gap-3 mt-1.5 text-[8px]">
                        <span className="text-rova-red">🔥 {combo.hot_count} hot</span>
                        <span className="text-rova-amber">⏰ {combo.overdue_count} overdue</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="shrink-0 text-right">
                      <div className={clsx('text-xl font-bold font-mono', color)}>{combo.score.toFixed(3)}</div>
                      <div className="text-[8px] text-rova-text4">SCORE</div>
                      <div className="mt-1">
                        {combo.score > 0.8 && <span className="text-[8px] border border-rova-accent/30 bg-rova-accent/5 text-rova-accent px-1.5 py-0.5 rounded-sm">ELITE</span>}
                        {combo.score > 0.7 && combo.score <= 0.8 && <span className="text-[8px] border border-rova-blue/30 bg-rova-blue/5 text-rova-blue px-1.5 py-0.5 rounded-sm">STRONG</span>}
                        {combo.score <= 0.7 && <span className="text-[8px] border border-rova-amber/30 bg-rova-amber/5 text-rova-amber px-1.5 py-0.5 rounded-sm">MODERATE</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}

          <div className="text-[9px] text-rova-text4 text-center pt-2 pb-1">
            ⚠ ROVA generates statistically-informed combinations. Lotteries are random — play responsibly.
          </div>
        </div>
      )}
    </div>
  )
}

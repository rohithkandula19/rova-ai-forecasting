import { useQuery } from '@tanstack/react-query'
import { rovaApi } from '@/api/client'
import { useGameStore } from '@/stores/gameStore'
import {
  Card, CardTitle, ScreenTitle, MetricCard, BarRow, TerminalLog,
} from '@/components/ui'

// ── Static fallback data (used when API not yet connected) ────
const MOCK_FREQ = [
  { label: 'NUM_14', value: 98, pct: 100, color: '#ff4466' },
  { label: 'NUM_07', value: 83, pct: 85,  color: '#ffb830' },
  { label: 'NUM_42', value: 80, pct: 82,  color: '#00ff9d' },
  { label: 'NUM_23', value: 78, pct: 80,  color: '#00ff9d' },
  { label: 'NUM_58', value: 76, pct: 78,  color: '#00ff9d' },
  { label: 'NUM_31', value: 74, pct: 76,  color: '#7ab896' },
  { label: 'NUM_19', value: 71, pct: 73,  color: '#7ab896' },
  { label: 'NUM_55', value: 69, pct: 70,  color: '#7ab896' },
]

const MOCK_DRAWS = [
  { date: '2026-03-28', numbers: [7, 14, 23, 42, 58], bonus: 11 },
  { date: '2026-03-25', numbers: [3, 19, 31, 47, 62], bonus: 8  },
  { date: '2026-03-21', numbers: [14, 22, 35, 41, 66], bonus: 3 },
  { date: '2026-03-18', numbers: [1, 9, 28, 53, 70],  bonus: 15 },
  { date: '2026-03-14', numbers: [11, 14, 27, 39, 55], bonus: 22 },
]

const MOCK_POS = [
  { label: 'POS 1', value: '+12.3%', pct: 62, color: '#00ff9d' },
  { label: 'POS 2', value: '+8.1%',  pct: 54, color: '#00ff9d' },
  { label: 'POS 3', value: '-2.4%',  pct: 44, color: '#3d6b52' },
  { label: 'POS 4', value: '+5.7%',  pct: 50, color: '#ffb830' },
  { label: 'POS 5', value: '-7.3%',  pct: 38, color: '#3d6b52' },
  { label: 'POS 6', value: '+3.8%',  pct: 47, color: '#7ab896' },
]

const LOG_LINES = [
  { time: '08:42:01', tag: '[ OK ]', msg: 'Feature pipeline complete — 2,847 draws processed', type: 'ok' as const },
  { time: '08:42:03', tag: '[ OK ]', msg: 'Dense NN v2.4 loaded from registry', type: 'ok' as const },
  { time: '08:42:05', tag: '[INFO]', msg: 'Ensemble blend: 0.6×DNN + 0.4×LSTM', type: 'info' as const },
  { time: '08:42:07', tag: '[WARN]', msg: 'Number 61 cold streak: 41 draws', type: 'warn' as const },
  { time: '08:42:09', tag: '[ OK ]', msg: 'WebSocket draw feed active', type: 'ok' as const },
]

// Heatmap colours by frequency percentile
function heatColor(pct: number): string {
  if (pct > 0.85) return 'rgba(255,68,102,0.55)'
  if (pct > 0.70) return 'rgba(255,184,48,0.40)'
  if (pct > 0.50) return 'rgba(0,255,157,0.22)'
  return 'rgba(0,255,157,0.05)'
}
function heatText(pct: number): string {
  if (pct > 0.85) return '#ff4466'
  if (pct > 0.70) return '#ffb830'
  if (pct > 0.50) return '#00ff9d'
  return '#1e3d2d'
}

const FREQS = [72,48,55,91,63,44,38,78,52,67,83,41,56,98,87,49,61,74,53,69,45,80,57,66,43,71,50,76,59,85,64,47,82,54,70,90,46,62,77,51,68,88,42,73,58,65,40,79,60,86,48,63,75,52,69,84,44,71,55,81,47,66,78,50,73,57,89,62,45,76]
const MAX_F = Math.max(...FREQS)

export function Analytics() {
  const { selectedGame } = useGameStore()

  // Try live data — silently fall back to mock if API not running
  const { data: drawsData } = useQuery({
    queryKey: ['draws', selectedGame.id],
    queryFn:  () => rovaApi.getDraws(selectedGame.id, 5).then(r => r.data),
    placeholderData: { draws: MOCK_DRAWS },
  })

  const draws = drawsData?.draws ?? MOCK_DRAWS

  return (
    <div>
      <ScreenTitle>ANALYTICS OVERVIEW — {selectedGame.name.toUpperCase()} — 2,847 DRAWS</ScreenTitle>

      {/* ── Metric cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <MetricCard label="TOTAL DRAWS"    value="2,847"  sub="Since Jan 2019"       tag="5Y WINDOW"    tagColor="blue"  delay={0}   />
        <MetricCard label="HOTTEST NUMBER" value="14"     sub="↑ 23.4% above avg"    tag="90-DAY HOT"   tagColor="red"   valueColor="text-rova-red"   delay={0.05} />
        <MetricCard label="AI ACCURACY"    value="68.4%"  sub="Top-3 match rate"      tag="ENSEMBLE NN"  tagColor="green" delay={0.1}  />
        <MetricCard label="COLDEST NUMBER" value="61"     sub="↓ 41.2% below avg"    tag="COLD STREAK"  tagColor="blue"  valueColor="text-rova-blue"  delay={0.15} />
      </div>

      {/* ── Heatmap + frequency ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">

        {/* Heatmap — spans 2 cols on lg */}
        <Card className="lg:col-span-2" delay={0.2}>
          <CardTitle>ALL-TIME FREQUENCY HEATMAP — NUMBERS 1–70</CardTitle>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}>
            {FREQS.map((f, i) => {
              const pct = f / MAX_F
              return (
                <div
                  key={i}
                  title={`Number ${i + 1}: ${f} appearances`}
                  className="aspect-square flex items-center justify-center rounded-sm text-[8px] sm:text-[9px] font-bold font-mono cursor-pointer transition-transform hover:scale-110"
                  style={{ background: heatColor(pct), color: heatText(pct) }}
                >
                  {i + 1}
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 sm:gap-4 mt-3 text-[8px] tracking-wide">
            <span style={{ color: '#ff4466' }}>▮ HOT</span>
            <span style={{ color: '#ffb830' }}>▮ WARM</span>
            <span style={{ color: '#00ff9d' }}>▮ NORMAL</span>
            <span style={{ color: '#1e3d2d' }}>▮ COLD</span>
          </div>
        </Card>

        {/* 90-day frequency bars */}
        <Card delay={0.25}>
          <CardTitle>90-DAY ROLLING FREQUENCY</CardTitle>
          {MOCK_FREQ.map(r => (
            <BarRow key={r.label} label={r.label} value={r.value} percent={r.pct} color={r.color} />
          ))}
        </Card>
      </div>

      {/* ── Positional bias + last draws + log ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">

        <Card delay={0.3}>
          <CardTitle>POSITIONAL BIAS</CardTitle>
          {MOCK_POS.map(r => (
            <BarRow key={r.label} label={r.label} value={r.value} percent={r.pct} color={r.color} />
          ))}
        </Card>

        <Card delay={0.35}>
          <CardTitle>LAST 5 DRAWS</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono border-collapse">
              <thead>
                <tr className="text-rova-text4 text-left">
                  <th className="pb-2 pr-3 tracking-[1px] font-normal">DATE</th>
                  <th className="pb-2 pr-3 tracking-[1px] font-normal">NUMBERS</th>
                  <th className="pb-2 tracking-[1px] font-normal">BONUS</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DRAWS.map((d, i) => (
                  <tr
                    key={i}
                    className="border-t border-rova-border/40 hover:bg-rova-accent/4 transition-colors"
                  >
                    <td className="py-1.5 pr-3 text-rova-text3 whitespace-nowrap">{d.date}</td>
                    <td className="py-1.5 pr-3 text-rova-text2 whitespace-nowrap">{d.numbers.join(' ')}</td>
                    <td className="py-1.5 text-rova-blue">{d.bonus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card delay={0.4}>
          <CardTitle>SYSTEM LOG</CardTitle>
          <TerminalLog lines={LOG_LINES} />
        </Card>
      </div>
    </div>
  )
}

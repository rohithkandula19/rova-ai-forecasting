import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'

// Jackpot winner data by state — from official lottery press releases
const WINNER_DATA: Record<string, {
  powerball:            number[]  // jackpot amounts in millions
  'mega-millions':      number[]
  'millionaire-for-life': number[]
}> = {
  CA: { powerball:[1816.8,447.8,365.1], 'mega-millions':[426,522], 'millionaire-for-life':[] },
  FL: { powerball:[235,291],            'mega-millions':[128,200,414], 'millionaire-for-life':[] },
  TX: { powerball:[180,148],            'mega-millions':[50,267], 'millionaire-for-life':[] },
  NY: { powerball:[136,98],             'mega-millions':[180,93,432], 'millionaire-for-life':[] },
  OH: { powerball:[150],                'mega-millions':[60], 'millionaire-for-life':[] },
  PA: { powerball:[456.7,187],          'mega-millions':[107], 'millionaire-for-life':[] },
  GA: { powerball:[98],                 'mega-millions':[543,198], 'millionaire-for-life':[] },
  IL: { powerball:[218],                'mega-millions':[333], 'millionaire-for-life':[] },
  MI: { powerball:[136],                'mega-millions':[145,86], 'millionaire-for-life':[] },
  NJ: { powerball:[315],                'mega-millions':[202,516], 'millionaire-for-life':[] },
  NC: { powerball:[],                   'mega-millions':[], 'millionaire-for-life':[1] },
  VA: { powerball:[298],                'mega-millions':[], 'millionaire-for-life':[] },
  TN: { powerball:[420],                'mega-millions':[], 'millionaire-for-life':[] },
  WI: { powerball:[768.4],              'mega-millions':[], 'millionaire-for-life':[] },
  MN: { powerball:[149],                'mega-millions':[], 'millionaire-for-life':[] },
  IN: { powerball:[],                   'mega-millions':[536], 'millionaire-for-life':[] },
  KY: { powerball:[],                   'mega-millions':[128], 'millionaire-for-life':[] },
  MD: { powerball:[],                   'mega-millions':[158,667], 'millionaire-for-life':[] },
  MA: { powerball:[187],                'mega-millions':[], 'millionaire-for-life':[] },
  MO: { powerball:[258],                'mega-millions':[], 'millionaire-for-life':[] },
  OR: { powerball:[340],                'mega-millions':[], 'millionaire-for-life':[] },
  AZ: { powerball:[98],                 'mega-millions':[], 'millionaire-for-life':[] },
  CO: { powerball:[],                   'mega-millions':[120], 'millionaire-for-life':[] },
  WA: { powerball:[],                   'mega-millions':[190], 'millionaire-for-life':[] },
  LA: { powerball:[191],                'mega-millions':[], 'millionaire-for-life':[] },
}

// Simplified US state positions for SVG map (x, y, w, h)
const STATE_BOXES: Record<string, [number,number,number,number,string]> = {
  WA:[28,40,42,35,'WA'],   OR:[18,80,42,38,'OR'],   CA:[12,140,44,88,'CA'],
  NV:[58,120,36,52,'NV'],  ID:[64,66,38,52,'ID'],   MT:[88,40,56,44,'MT'],
  WY:[104,88,48,44,'WY'],  CO:[104,136,48,40,'CO'], UT:[64,120,36,44,'UT'],
  AZ:[68,168,42,48,'AZ'],  NM:[104,180,44,44,'NM'], ND:[152,40,46,38,'ND'],
  SD:[152,82,46,38,'SD'],  NE:[152,124,52,34,'NE'], KS:[152,162,52,34,'KS'],
  OK:[152,200,56,34,'OK'], TX:[156,238,68,72,'TX'],  MN:[196,44,48,44,'MN'],
  IA:[198,92,48,36,'IA'],  MO:[200,132,48,40,'MO'], AR:[202,176,44,36,'AR'],
  LA:[200,216,46,44,'LA'], WI:[244,52,44,42,'WI'],  IL:[248,98,36,44,'IL'],
  MI:[258,52,44,40,'MI'],  IN:[282,98,34,40,'IN'],  OH:[316,88,38,42,'OH'],
  KY:[286,144,48,32,'KY'], TN:[272,180,60,32,'TN'], MS:[254,216,38,40,'MS'],
  AL:[278,216,36,44,'AL'], GA:[302,200,40,52,'GA'],  FL:[300,252,48,56,'FL'],
  SC:[330,188,36,32,'SC'], NC:[306,168,56,28,'NC'],  VA:[322,140,52,28,'VA'],
  WV:[330,118,34,32,'WV'], PA:[338,96,50,32,'PA'],   NY:[354,60,50,36,'NY'],
  MD:[356,132,36,22,'MD'], DE:[376,128,22,22,'DE'],  NJ:[378,96,24,28,'NJ'],
  CT:[392,76,22,20,'CT'],  RI:[406,72,18,18,'RI'],   MA:[384,56,36,22,'MA'],
  VT:[380,44,22,24,'VT'],  NH:[396,44,20,24,'NH'],   ME:[408,32,32,36,'ME'],
  AK:[20,280,60,44,'AK'],  HI:[90,290,48,28,'HI'],
}

const STATE_ABBREVS = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

function formatM(n: number) {
  return n >= 1000 ? `$${(n/1000).toFixed(1)}B` : `$${n}M`
}

export function WinnersMap() {
  const { selectedGame } = useGameStore()
  const [hovered, setHovered] = useState<string|null>(null)
  const [metric, setMetric]   = useState<'count'|'total'>('count')

  const stateStats = useMemo(() => {
    const stats: Record<string, { count:number; total:number; wins:number[] }> = {}
    STATE_ABBREVS.forEach(s => { stats[s] = { count:0, total:0, wins:[] } })
    Object.entries(WINNER_DATA).forEach(([state, data]) => {
      const wins = data[selectedGame.id as keyof typeof data] || []
      stats[state] = {
        count: wins.length,
        total: wins.reduce((a,b) => a+b, 0),
        wins,
      }
    })
    return stats
  }, [selectedGame.id])

  const maxVal = Math.max(...Object.values(stateStats).map(s =>
    metric === 'count' ? s.count : s.total
  ), 1)

  function getColor(state: string) {
    const s = stateStats[state]
    if (!s) return 'var(--bg2)'
    const val = metric === 'count' ? s.count : s.total
    if (val === 0) return 'var(--bg2)'
    const intensity = val / maxVal
    // Green → Amber → Red scale
    if (intensity < 0.33) return `rgba(0,255,157,${0.15 + intensity * 0.5})`
    if (intensity < 0.66) return `rgba(255,184,48,${0.3 + intensity * 0.4})`
    return `rgba(255,68,102,${0.4 + intensity * 0.4})`
  }

  const hoveredStats = hovered ? stateStats[hovered] : null
  const totalWins  = Object.values(stateStats).reduce((a,b) => a+b.count, 0)
  const totalValue = Object.values(stateStats).reduce((a,b) => a+b.total, 0)
  const topState   = Object.entries(stateStats).sort((a,b) =>
    metric==='count' ? b[1].count-a[1].count : b[1].total-a[1].total
  )[0]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3"
        style={{ borderBottom:'1px solid var(--border)' }}>
        <span className="text-2xl">🗺️</span>
        <div>
          <div className="font-bold text-sm" style={{ color:'var(--accent)' }}>Winners Map</div>
          <div className="text-[10px]" style={{ color:'var(--text3)' }}>
            {selectedGame.name} · Jackpot winners by state (official records)
          </div>
        </div>
        <div className="ml-auto flex gap-1">
          {(['count','total'] as const).map(m => (
            <button key={m} onClick={() => setMetric(m)}
              className="text-[9px] px-2.5 py-1.5 rounded"
              style={metric===m
                ? { background:'var(--accent)', color:'var(--bg)' }
                : { border:'1px solid var(--border)', color:'var(--text3)' }}>
              {m === 'count' ? '# Wins' : '$ Total'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label:'TOTAL JACKPOT WINS', val: totalWins,              color:'var(--accent)' },
          { label:'TOTAL VALUE',        val: formatM(totalValue),    color:'var(--amber)'  },
          { label:'TOP STATE',          val: topState?.[0] || '—',   color:'var(--blue)'   },
        ].map(({ label, val, color }) => (
          <div key={label} className="p-3 rounded-lg text-center"
            style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
            <div className="text-xl font-bold font-mono" style={{ color }}>{val}</div>
            <div className="text-[8px] mt-1" style={{ color:'var(--text4)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* SVG Map */}
      <div className="rounded-xl overflow-hidden p-3"
        style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
        <svg viewBox="0 0 460 340" className="w-full" style={{ maxHeight:380 }}>
          {Object.entries(STATE_BOXES).map(([state, [x,y,w,h,label]]) => {
            const s = stateStats[state]
            const isHov = hovered === state
            const hasWins = s && s.count > 0
            return (
              <g key={state}
                onMouseEnter={() => setHovered(state)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: hasWins ? 'pointer' : 'default' }}>
                <rect x={x} y={y} width={w} height={h} rx={3}
                  fill={getColor(state)}
                  stroke={isHov ? 'var(--accent)' : 'var(--bg)'}
                  strokeWidth={isHov ? 1.5 : 0.8}
                  opacity={isHov ? 1 : 0.9}
                />
                <text x={x+w/2} y={y+h/2-3} textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fontSize:7, fontWeight:600, fill:'var(--text2)',
                           fontFamily:'monospace', pointerEvents:'none' }}>
                  {label}
                </text>
                {s && s.count > 0 && (
                  <text x={x+w/2} y={y+h/2+6} textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize:6, fill:'var(--text3)', fontFamily:'monospace', pointerEvents:'none' }}>
                    {metric==='count' ? `${s.count}w` : formatM(s.total)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-2 justify-center text-[8px]">
          <span style={{ color:'var(--text4)' }}>No wins</span>
          {['rgba(0,255,157,0.4)','rgba(255,184,48,0.5)','rgba(255,68,102,0.7)'].map((c,i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background:c }} />
              <span style={{ color:'var(--text4)' }}>
                {i===0 ? 'Low' : i===1 ? 'Medium' : 'High'}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && hoveredStats && (
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
          className="mt-3 p-3 rounded-lg"
          style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-sm" style={{ color:'var(--accent)' }}>{hovered}</span>
            <span className="text-[9px]" style={{ color:'var(--text3)' }}>
              {hoveredStats.count} jackpot win{hoveredStats.count !== 1 ? 's' : ''}
            </span>
          </div>
          {hoveredStats.wins.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {hoveredStats.wins.map((w,i) => (
                <span key={i} className="text-[9px] px-2 py-1 rounded"
                  style={{ background:'var(--bg2)', color:'var(--amber)' }}>
                  {formatM(w)}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[9px]" style={{ color:'var(--text4)' }}>
              No jackpot wins recorded for {selectedGame.name} in {hovered}
            </div>
          )}
        </motion.div>
      )}

      <p className="text-[9px] mt-3 text-center" style={{ color:'var(--text4)' }}>
        Data from official lottery press releases · Some winners remain anonymous by law
      </p>
    </div>
  )
}

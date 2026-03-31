import { motion, AnimatePresence } from 'framer-motion'
import { useDrawWebSocket } from '@/hooks/useDrawWebSocket'
import { useCountdown } from '@/hooks/useCountdown'
import { useGameStore } from '@/stores/gameStore'

export function LiveDrawWidget() {
  const { selectedGame } = useGameStore()
  const { status, lastUpdate, updates } = useDrawWebSocket(selectedGame.id)
  const { remaining } = useCountdown(selectedGame.id)

  const isConnected = status === 'connected'
  const hasLiveResult = lastUpdate?.type === 'draw_result'

  return (
    <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--bg1)', border: '1px solid var(--border)' }}>
      {/* Status bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse inline-block"
            style={{ background: isConnected ? 'var(--accent)' : 'var(--red)' }} />
          <span className="text-[9px] font-bold" style={{ color: isConnected ? 'var(--accent)' : 'var(--red)' }}>
            {isConnected ? 'LIVE FEED ACTIVE' : 'RECONNECTING...'}
          </span>
        </div>
        <span className="text-[9px]" style={{ color: 'var(--text3)' }}>
          {selectedGame.name}
        </span>
      </div>

      {/* Countdown to next draw */}
      <div className="text-center mb-3">
        <div className="text-[9px] mb-1" style={{ color: 'var(--text3)' }}>NEXT DRAW IN</div>
        <div className="flex items-center justify-center gap-3 font-mono">
          {remaining.d > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                {String(remaining.d).padStart(2,'0')}
              </div>
              <div className="text-[8px]" style={{ color: 'var(--text4)' }}>DAYS</div>
            </div>
          )}
          {[['HRS', remaining.h], ['MIN', remaining.m], ['SEC', remaining.s]].map(([label, val]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                {String(val).padStart(2,'0')}
              </div>
              <div className="text-[8px]" style={{ color: 'var(--text4)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live result flash */}
      <AnimatePresence>
        {hasLiveResult && lastUpdate && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="p-3 rounded-lg text-center"
            style={{ background: 'rgba(0,255,157,0.1)', border: '1px solid var(--accent)' }}>
            <div className="text-[10px] font-bold mb-2" style={{ color: 'var(--accent)' }}>
              🎉 DRAW RESULTS — JUST IN
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {(lastUpdate.numbers ?? []).map((n, i) => (
                <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}>{n}</motion.span>
              ))}
              {lastUpdate.bonus && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ background: 'var(--blue)', color: 'white' }}>{lastUpdate.bonus}</motion.span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent updates log */}
      {updates.length > 0 && (
        <div className="mt-3 text-[9px] space-y-1">
          {updates.slice(0, 3).map((u, i) => (
            <div key={i} className="flex gap-2" style={{ color: 'var(--text3)' }}>
              <span style={{ color: 'var(--text4)' }}>{new Date(u.timestamp).toLocaleTimeString()}</span>
              <span>{u.message || `${u.game_id} draw posted`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

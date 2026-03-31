import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

export function NotificationBell() {
  const { status, subscribe, unsubscribe } = usePushNotifications()
  const [open, setOpen]       = useState(false)
  const [email, setEmail]     = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const isGranted = status === 'granted'

  const handlePush = async () => {
    setLoading(true)
    if (isGranted) await unsubscribe()
    else await subscribe(['powerball', 'mega-millions', 'millionaire-for-life'])
    setLoading(false)
  }

  const handleEmail = async () => {
    if (!email.trim() || !email.includes('@')) return
    setLoading(true)
    try {
      await axios.post(`${API}/api/v1/notifications/email/subscribe`, {
        email, name:'Player',
        games:['powerball','mega-millions','millionaire-for-life'],
      })
      setEmailSent(true)
    } catch {}
    setLoading(false)
  }

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg"
        style={{ background: isGranted ? 'var(--accent)' : 'var(--bg2)', border:'1px solid var(--border)' }}>
        <span style={{ fontSize:14 }}>🔔</span>
        {isGranted && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background:'var(--red)' }} />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              style={{ position:'absolute', right:0, top:40, zIndex:50, width:280,
                       background:'var(--bg1)', border:'1px solid var(--border)',
                       borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', padding:16 }}>
              <div className="text-[10px] font-bold mb-3" style={{ color:'var(--accent)' }}>
                DRAW NOTIFICATIONS
              </div>
              <div className="mb-4 pb-4" style={{ borderBottom:'1px solid var(--border)' }}>
                <div className="text-[10px] mb-1 font-bold" style={{ color:'var(--text2)' }}>Browser Push</div>
                <div className="text-[9px] mb-2" style={{ color:'var(--text4)' }}>
                  {status === 'unsupported' ? 'Not supported in this browser'
                  : status === 'denied' ? 'Blocked — enable in browser settings'
                  : isGranted ? 'Active — you will get draw results live'
                  : 'Get notified the moment results are posted'}
                </div>
                {status !== 'unsupported' && status !== 'denied' && (
                  <button onClick={handlePush} disabled={loading}
                    className="w-full py-1.5 rounded text-[9px] font-bold disabled:opacity-50"
                    style={isGranted
                      ? { background:'rgba(255,68,102,0.1)', color:'var(--red)', border:'1px solid rgba(255,68,102,0.2)' }
                      : { background:'var(--accent)', color:'var(--bg)' }}>
                    {loading ? '...' : isGranted ? 'TURN OFF' : 'ENABLE PUSH'}
                  </button>
                )}
              </div>
              <div>
                <div className="text-[10px] mb-1 font-bold" style={{ color:'var(--text2)' }}>Email Alerts</div>
                {emailSent ? (
                  <div className="text-[10px] py-2 text-center" style={{ color:'var(--accent)' }}>
                    Subscribed! Check your inbox.
                  </div>
                ) : (
                  <>
                    <div className="text-[9px] mb-2" style={{ color:'var(--text4)' }}>
                      Draw results + jackpot alerts to your inbox
                    </div>
                    <div className="flex gap-1">
                      <input value={email} onChange={e => setEmail(e.target.value)}
                        type="email" placeholder="your@email.com"
                        onKeyDown={e => e.key === 'Enter' && handleEmail()}
                        className="flex-1 px-2 py-1.5 rounded text-[10px] outline-none"
                        style={{ background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }} />
                      <button onClick={handleEmail} disabled={loading || !email}
                        className="px-2 py-1.5 rounded text-[9px] font-bold disabled:opacity-40"
                        style={{ background:'var(--accent)', color:'var(--bg)' }}>
                        {loading ? '...' : 'GO'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

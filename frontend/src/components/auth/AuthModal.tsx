import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import axios from 'axios'

interface Props { onClose: () => void }

export function AuthModal({ onClose }: Props) {
  const [mode, setMode]       = useState<'login'|'register'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { setAuth } = useAuthStore()

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      const API = import.meta.env.VITE_API_URL || 'https://rova-api-870997691637.us-central1.run.app'
    const endpoint = mode === 'login' ? `${API}/api/v1/users/login` : `${API}/api/v1/users/register`
      const body = mode === 'login'
        ? { email, password }
        : { email, password, full_name: name }
      const { data } = await axios.post(endpoint, body)
      setAuth(data.token, data.user)
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
        className="w-full max-w-sm rounded-xl p-6"
        style={{ background:'var(--bg1)', border:'1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="font-black tracking-[4px] text-xl mb-1" style={{ color:'var(--accent)' }}>ROVA</div>
          <div className="text-[10px]" style={{ color:'var(--text3)' }}>AI Forecasting Platform</div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background:'var(--bg2)' }}>
          {(['login','register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className="flex-1 py-2 rounded-md text-[10px] font-bold transition-all"
              style={mode===m
                ? { background:'var(--accent)', color:'var(--bg)' }
                : { color:'var(--text3)' }}>
              {m === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {mode === 'register' && (
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2.5 rounded-lg text-[11px] outline-none"
              style={{ background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }} />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="Email address"
            className="w-full px-3 py-2.5 rounded-lg text-[11px] outline-none"
            style={{ background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }} />
          <input value={password} onChange={e => setPass(e.target.value)}
            type="password" placeholder="Password"
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full px-3 py-2.5 rounded-lg text-[11px] outline-none"
            style={{ background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }} />
        </div>

        {error && (
          <div className="text-[10px] mt-3 px-3 py-2 rounded"
            style={{ background:'rgba(255,68,102,0.1)', color:'var(--red)', border:'1px solid rgba(255,68,102,0.2)' }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={loading}
          className="w-full mt-4 py-2.5 rounded-lg font-bold text-[11px] transition-all disabled:opacity-50"
          style={{ background:'var(--accent)', color:'var(--bg)' }}>
          {loading ? '...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
        </button>

        <p className="text-[9px] text-center mt-4" style={{ color:'var(--text4)' }}>
          Your data is private. We never share your information.
        </p>
      </motion.div>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import axios from 'axios'

interface Message { role: 'user' | 'assistant'; content: string; disclaimer?: string; ts: string }

const SUGGESTIONS = [
  "What are the hottest Mega Millions numbers this year?",
  "How often does the Powerball jackpot exceed $500M?",
  "What's the average gap between jackpot wins?",
  "Which Powerball numbers appear together most often?",
  "How long was the longest Powerball losing streak?",
  "What's the statistical spread I should aim for?",
]

export function Chat() {
  const { selectedGame } = useGameStore()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hey! I'm ROVA AI 👋 I can answer any statistics questions about Mega Millions, Powerball, and Millionaire for Life. Ask me about frequency patterns, jackpot trends, hot/cold numbers — anything data-related.\n\n⚠️ I cannot predict lottery outcomes. Draws are cryptographically random. I only do statistical analysis.`,
      ts: new Date().toISOString(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text, ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/chat`, {
        message: text,
        game_id: selectedGame.id,
        conversation_history: history,
      })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        disclaimer: data.disclaimer,
        ts: new Date().toISOString(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again.',
        ts: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)]" style={{ color: 'var(--text)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}>◎</div>
        <div>
          <div className="font-bold text-sm" style={{ color: 'var(--accent)' }}>ROVA AI Chat</div>
          <div className="text-[10px]" style={{ color: 'var(--text3)' }}>Statistical analysis · {selectedGame.name}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[9px]" style={{ color: 'var(--accent)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: 'var(--accent)' }} />
          LIVE
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}>◎</div>
              )}
              <div className="max-w-[80%]">
                <div className="text-[10px] sm:text-[11px] leading-6 p-3 rounded-lg whitespace-pre-wrap"
                  style={msg.role === 'user'
                    ? { background: 'var(--accent)', color: 'var(--bg)', borderRadius: '12px 12px 2px 12px' }
                    : { background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '2px 12px 12px 12px' }}>
                  {msg.content}
                </div>
                {msg.disclaimer && (
                  <div className="text-[9px] mt-1 px-2" style={{ color: 'var(--amber)' }}>{msg.disclaimer}</div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}>◎</div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg1)', border: '1px solid var(--border)' }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--accent)' }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.slice(0, 4).map(s => (
            <button key={s} onClick={() => send(s)}
              className="text-[9px] px-2.5 py-1.5 rounded-full border transition-all hover:opacity-80"
              style={{ color: 'var(--text3)', borderColor: 'var(--border)', background: 'var(--bg1)' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send(input))}
          placeholder="Ask about number frequencies, jackpot trends..."
          className="flex-1 px-4 py-2.5 rounded-lg text-[11px] outline-none transition-all"
          style={{ background: 'var(--bg1)', border: '1px solid var(--border)', color: 'var(--text)' }}
          disabled={loading}
        />
        <button onClick={() => send(input)} disabled={loading || !input.trim()}
          className="px-4 py-2.5 rounded-lg font-bold text-[11px] transition-all disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
          ▸ SEND
        </button>
      </div>
    </div>
  )
}

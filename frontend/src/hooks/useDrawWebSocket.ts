import { useEffect, useRef, useState, useCallback } from 'react'

interface DrawUpdate {
  type: 'draw_result' | 'heartbeat' | 'connected'
  game_id?: string
  numbers?: number[]
  bonus?: number
  jackpot?: number
  timestamp: string
  message?: string
}

export function useDrawWebSocket(gameId: string = 'all') {
  const ws = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [lastUpdate, setLastUpdate] = useState<DrawUpdate | null>(null)
  const [updates, setUpdates] = useState<DrawUpdate[]>([])
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000')
    const endpoint = gameId === 'all' ? `${wsUrl}/ws/live` : `${wsUrl}/ws/draws?game_id=${gameId}`

    setStatus('connecting')
    ws.current = new WebSocket(endpoint)

    ws.current.onopen = () => setStatus('connected')

    ws.current.onmessage = (e) => {
      try {
        const data: DrawUpdate = JSON.parse(e.data)
        setLastUpdate(data)
        if (data.type === 'draw_result') {
          setUpdates(prev => [data, ...prev].slice(0, 50))
        }
      } catch {}
    }

    ws.current.onclose = () => {
      setStatus('disconnected')
      reconnectTimer.current = setTimeout(connect, 5000)
    }

    ws.current.onerror = () => {
      ws.current?.close()
    }
  }, [gameId])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  return { status, lastUpdate, updates }
}

/**
 * ROVA useDraws hook
 * Fetches draw data from the API with fallback to static realDraws.ts
 * Polls every 5 minutes to stay current after each lottery draw
 */
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { getDrawsForGame, Draw } from '@/data/realDraws'

const API_URL = import.meta.env.VITE_API_URL || ''
const POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes

interface UseDrawsResult {
  draws:   Draw[]
  loading: boolean
  error:   string | null
  refresh: () => void
  source:  'api' | 'static'
}

export function useDraws(gameId: string): UseDrawsResult {
  const staticDraws = getDrawsForGame(gameId)
  const [draws,   setDraws]   = useState<Draw[]>(staticDraws)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [source,  setSource]  = useState<'api' | 'static'>('static')

  const fetchDraws = useCallback(async () => {
    if (!API_URL) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.get(
        `${API_URL}/api/v1/draws/${gameId}`,
        { timeout: 8000 }
      )
      if (data.draws && data.draws.length > 0) {
        // Merge API draws with static (API takes priority for recent dates)
        const apiDates  = new Set(data.draws.map((d: Draw) => d.date))
        const staticOld = staticDraws.filter(d => !apiDates.has(d.date))
        const merged    = [...data.draws, ...staticOld]
        setDraws(merged)
        setSource('api')
      } else {
        // API returned empty — use static
        setDraws(staticDraws)
        setSource('static')
      }
    } catch {
      // Network error — silently use static data
      setDraws(staticDraws)
      setSource('static')
    } finally {
      setLoading(false)
    }
  }, [gameId, API_URL])

  // Fetch on mount + when game changes
  useEffect(() => {
    fetchDraws()
  }, [gameId])

  // Poll every 5 minutes
  useEffect(() => {
    const id = setInterval(fetchDraws, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [gameId])

  return { draws, loading, error, refresh: fetchDraws, source }
}

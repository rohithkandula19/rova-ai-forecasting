import { useState, useEffect } from 'react'

function getNextDrawTime(gameId: string): Date {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = et.getDay() // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  const hour = et.getHours()
  const min = et.getMinutes()

  let next = new Date(et)
  next.setSeconds(0)
  next.setMilliseconds(0)

  const drawDays: Record<string, number[]> = {
    'powerball':            [1, 3, 6],  // Mon Wed Sat
    'mega-millions':        [2, 5],     // Tue Fri
    'millionaire-for-life': [0,1,2,3,4,5,6], // Daily
  }

  const drawHours: Record<string, [number, number]> = {
    'powerball':            [22, 59],
    'mega-millions':        [23, 0],
    'millionaire-for-life': [23, 15],
  }

  const days = drawDays[gameId] ?? [2, 5]
  const [drawH, drawM] = drawHours[gameId] ?? [23, 0]

  // Find next draw day/time
  for (let i = 0; i <= 7; i++) {
    const checkDay = (day + i) % 7
    if (days.includes(checkDay)) {
      next.setDate(et.getDate() + i)
      next.setHours(drawH, drawM, 0, 0)
      if (next > et) break
    }
  }
  return next
}

export function useCountdown(gameId: string) {
  const [remaining, setRemaining] = useState({ d: 0, h: 0, m: 0, s: 0 })
  const [nextDraw, setNextDraw] = useState<Date>(new Date())

  useEffect(() => {
    const nd = getNextDrawTime(gameId)
    setNextDraw(nd)
    const interval = setInterval(() => {
      const diff = nd.getTime() - Date.now()
      if (diff <= 0) { clearInterval(interval); return }
      setRemaining({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff % 86_400_000) / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [gameId])

  return { remaining, nextDraw }
}

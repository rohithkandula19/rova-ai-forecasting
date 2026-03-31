import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Game {
  id: string; name: string; pool: number; bonusPool: number
  bonusName: string; drawDays: string; ticketPrice: number
  description: string; drawTime: string
}

export const US_GAMES: Game[] = [
  {
    id: 'mega-millions', name: 'Mega Millions', pool: 70, bonusPool: 24,
    bonusName: 'Mega Ball', drawDays: 'Tuesday & Friday', ticketPrice: 5.00,
    drawTime: '11:00 PM ET',
    description: 'Pick 5 from 1-70 + Mega Ball 1-24. Jackpot starts at $20M.',
  },
  {
    id: 'powerball', name: 'Powerball', pool: 69, bonusPool: 26,
    bonusName: 'Powerball', drawDays: 'Mon, Wed & Sat', ticketPrice: 2.00,
    drawTime: '11:00 PM ET',
    description: 'Pick 5 from 1-69 + Powerball 1-26. Jackpot starts at $20M.',
  },
  {
    id: 'millionaire-for-life', name: 'Millionaire for Life', pool: 58, bonusPool: 5,
    bonusName: 'Millionaire Ball', drawDays: 'Daily', ticketPrice: 5.00,
    drawTime: '11:15 PM ET',
    description: 'Pick 5 from 1-58 + Millionaire Ball 1-5. Win $1M/year for life!',
  },
]

interface GameStore { selectedGame: Game; setGame: (g: Game) => void }
export const useGameStore = create<GameStore>()(
  persist((set) => ({ selectedGame: US_GAMES[0], setGame: (g) => set({ selectedGame: g }) }),
  { name: 'rova-game' })
)

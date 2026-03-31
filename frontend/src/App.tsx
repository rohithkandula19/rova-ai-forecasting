import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout }        from '@/components/layout/Layout'
import { Analytics }     from '@/screens/Analytics'
import { Predict }       from '@/screens/Predict'
import { History }       from '@/screens/History'
import { Simulate }      from '@/screens/Simulate'
import { Backtest }      from '@/screens/Backtest'
import { Chat }          from '@/screens/Chat'
import { QuickPick }     from '@/screens/QuickPick'
import { HotStreak }     from '@/screens/HotStreak'
import { TicketChecker } from '@/screens/TicketChecker'
import { JackpotChart }  from '@/screens/JackpotChart'
import { DrawCalendar }  from '@/screens/DrawCalendar'
import { CoOccurrence }  from '@/screens/CoOccurrence'
import { WinnersMap }    from '@/screens/WinnersMap'
import { Profile }       from '@/screens/Profile'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime:60_000, retry:1, refetchOnWindowFocus:false }}
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter future={{ v7_startTransition:true, v7_relativeSplatPath:true }}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index         element={<Navigate to="/analytics" replace />} />
            <Route path="analytics"  element={<Analytics />} />
            <Route path="predict"    element={<Predict />} />
            <Route path="history"    element={<History />} />
            <Route path="hotstreak"  element={<HotStreak />} />
            <Route path="quickpick"  element={<QuickPick />} />
            <Route path="chat"       element={<Chat />} />
            <Route path="checker"    element={<TicketChecker />} />
            <Route path="jackpot"    element={<JackpotChart />} />
            <Route path="calendar"   element={<DrawCalendar />} />
            <Route path="cooccur"    element={<CoOccurrence />} />
            <Route path="map"        element={<WinnersMap />} />
            <Route path="profile"    element={<Profile />} />
            <Route path="simulate"   element={<Simulate />} />
            <Route path="backtest"   element={<Backtest />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

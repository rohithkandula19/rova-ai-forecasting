import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
})

api.interceptors.request.use((cfg) => {
  const t = useAuthStore.getState().token
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)

export const rovaApi = {
  getGames:    () => api.get('/games'),
  getDraws:    (gameId: string, limit = 50) => api.get('/draws', { params: { game_id: gameId, limit } }),
  getFeatures: (gameId: string) => api.get('/features', { params: { game_id: gameId } }),
  getHeatmap:  (gameId: string) => api.get('/features/heatmap', { params: { game_id: gameId } }),

  // AI prediction — analyze N draws and generate 5 combinations
  predict:    (gameId: string, nDraws: number) =>
    api.get('/score/predict', { params: { game_id: gameId, n_draws: nDraws } }),
  scoreCombo: (gameId: string, numbers: number[], bonus: number) =>
    api.post('/score/combo', { game_id: gameId, numbers, bonus }),
  getTopK:    (gameId: string, k = 10) =>
    api.get('/score/top-k', { params: { game_id: gameId, k } }),

  startSim:    (body: object) => api.post('/simulate/montecarlo', body),
  getSimResult:(id: string)   => api.get(`/simulate/${id}/results`),
  runBacktest: (body: object) => api.post('/backtest/run', body),
  getBacktestResults: (gameId: string) => api.get('/backtest/results', { params: { game_id: gameId } }),
  listModels:  () => api.get('/models'),

  // Trigger nightly sync manually
  syncData: () => api.post('/admin/sync'),
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

interface User { id: string; email: string; full_name: string; plan: string }

interface AuthStore {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
  isLoggedIn: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        set({ token, user })
      },
      logout: () => {
        delete axios.defaults.headers.common['Authorization']
        set({ token: null, user: null })
      },
      isLoggedIn: () => !!get().token,
    }),
    { name: 'rova-auth' }
  )
)

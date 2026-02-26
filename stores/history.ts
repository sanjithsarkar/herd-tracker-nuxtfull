export interface HistoryLocation {
  id: string
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  altitude?: number
  timestamp: string
}

export interface HistorySession {
  id: string
  deviceName: string
  imei: string
  status: string
  startedAt: string
  stoppedAt: string
  duration: number
  totalDistance: number
  pointCount: number
}

const getDefaultDates = () => {
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  return {
    dateTo: today.toISOString().split('T')[0],
    dateFrom: weekAgo.toISOString().split('T')[0],
  }
}

export const useHistoryStore = defineStore('history', {
  state: () => {
    const { dateFrom, dateTo } = getDefaultDates()
    return {
      sessions: [] as HistorySession[],
      locations: [] as HistoryLocation[],
      loading: false,
      filterDeviceId: '',
      viewMode: 'sessions' as 'sessions' | 'points',
      selectedSessionId: null as string | null,
      dateFrom,
      dateTo,
    }
  },

  actions: {
    setFilters(payload: { filterDeviceId?: string; dateFrom?: string; dateTo?: string }) {
      if (payload.filterDeviceId !== undefined) this.filterDeviceId = payload.filterDeviceId
      if (payload.dateFrom !== undefined) this.dateFrom = payload.dateFrom
      if (payload.dateTo !== undefined) this.dateTo = payload.dateTo
    },

    setViewMode(mode: 'sessions' | 'points') {
      this.viewMode = mode
    },

    setSelectedSessionId(id: string | null) {
      this.selectedSessionId = id
    },

    async fetchSessions() {
      const auth = useAuthStore()
      try {
        let url = `/api/sessions?from=${this.dateFrom}&to=${this.dateTo}`
        if (this.filterDeviceId) url += `&deviceId=${this.filterDeviceId}`
        const data = await auth.authFetch<HistorySession[]>(url)
        this.sessions = data || []
      } catch {
        this.sessions = []
      }
    },

    async fetchLocations() {
      const auth = useAuthStore()
      try {
        let url = `/api/location/history/${auth.user?.id}?from=${this.dateFrom}&to=${this.dateTo}`
        if (this.filterDeviceId) url += `&deviceId=${this.filterDeviceId}`
        if (this.selectedSessionId) url += `&sessionId=${this.selectedSessionId}`
        const data = await auth.authFetch<HistoryLocation[]>(url)
        this.locations = data || []
      } catch {
        this.locations = []
      }
    },

    async fetchData() {
      this.loading = true
      this.selectedSessionId = null
      await Promise.all([this.fetchSessions(), this.fetchLocations()])
      this.loading = false
    },

    async selectSession(session: HistorySession) {
      const auth = useAuthStore()
      if (this.selectedSessionId === session.id) {
        this.selectedSessionId = null
        await this.fetchLocations()
        return
      }
      this.selectedSessionId = session.id
      this.loading = true
      try {
        const data = await auth.authFetch<{ locations: HistoryLocation[] }>(`/api/session/${session.id}`)
        this.locations = data?.locations || []
      } catch {
        this.locations = []
      } finally {
        this.loading = false
      }
    },
  },
})

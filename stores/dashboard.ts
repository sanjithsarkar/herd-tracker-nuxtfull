export interface LocationPoint {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: string | number
  deviceId?: string
  imei?: string
  deviceName?: string
}

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    latestLocation: null as LocationPoint | null,
    filterDeviceId: '',
  }),

  actions: {
    setFilterDeviceId(id: string) {
      this.filterDeviceId = id
    },

    setLatestLocation(loc: LocationPoint | null) {
      this.latestLocation = loc
    },

    async fetchLatest() {
      const auth = useAuthStore()
      if (!auth.user?.id) return
      try {
        let url = `/api/location/latest/${auth.user.id}`
        if (this.filterDeviceId) url += `?deviceId=${this.filterDeviceId}`
        const data = await auth.authFetch<LocationPoint>(url)
        if (data) {
          if (data.deviceId) {
            const dev = auth.devices.find((d) => d.id === data.deviceId)
            if (dev) (data as LocationPoint).deviceName = dev.name
          }
          this.latestLocation = data
          return data
        }
      } catch {
        // No location data yet
      }
      return null
    },
  },
})

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  speed: number | null
  heading: number | null
  altitude: number | null
  timestamp: number
}

interface TrackingSession {
  id: string
}

// Non-reactive internals (not part of Pinia state)
let watchId: number | null = null
let sendInterval: ReturnType<typeof setInterval> | null = null
let elapsedInterval: ReturnType<typeof setInterval> | null = null
let prevLat: number | null = null
let prevLng: number | null = null

// Haversine distance in meters
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const getBatteryLevel = async (): Promise<number | null> => {
  try {
    const nav = navigator as any
    if (nav.getBattery) {
      const battery = await nav.getBattery()
      return Math.round(battery.level * 100)
    }
  } catch {}
  return null
}

export const useTrackingStore = defineStore('tracking', {
  state: () => ({
    isTracking: false,
    location: null as LocationData | null,
    geoError: null as string | null,
    currentSession: null as TrackingSession | null,
    pointCount: 0,
    sessionDistance: 0,
    sessionStartTime: null as number | null,
    sessionElapsed: '00:00:00',
    sendStatus: '',
    selectedDeviceId: '',
  }),

  actions: {
    async startTracking() {
      if (this.isTracking) return
      if (!navigator.geolocation) {
        this.geoError = 'Geolocation is not supported by your browser'
        return
      }

      const auth = useAuthStore()

      // Start session on server
      try {
        const device = auth.devices.find((d) => d.id === this.selectedDeviceId && d.isActive)
        const body: any = {}
        if (device) {
          if (device.deviceType === 'laptop') {
            body.identifier = device.identifier
          } else {
            body.imei = device.imei
          }
        }
        const res = await $fetch<any>('/api/session/start', {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
          body,
        })
        this.currentSession = res
      } catch {
        this.currentSession = null
      }

      // Reset stats
      this.pointCount = 0
      this.sessionDistance = 0
      this.sessionStartTime = Date.now()
      this.sessionElapsed = '00:00:00'
      this.geoError = null
      this.sendStatus = ''
      prevLat = null
      prevLng = null

      // Start geolocation watch
      this.isTracking = true
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            altitude: position.coords.altitude,
            timestamp: position.timestamp,
          }
        },
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              this.geoError = 'Location permission denied. Please enable it in browser settings.'
              break
            case err.POSITION_UNAVAILABLE:
              this.geoError = 'Location information unavailable.'
              break
            case err.TIMEOUT:
              this.geoError = 'Location request timed out.'
              break
            default:
              this.geoError = 'An unknown error occurred.'
          }
          this.isTracking = false
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      )

      // Send location every 15 seconds
      sendInterval = setInterval(() => this._sendLocation(), 15000)

      // Update elapsed timer every second
      elapsedInterval = setInterval(() => {
        if (this.sessionStartTime) {
          const secs = Math.floor((Date.now() - this.sessionStartTime) / 1000)
          const h = Math.floor(secs / 3600)
          const m = Math.floor((secs % 3600) / 60)
          const s = secs % 60
          this.sessionElapsed = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        }
      }, 1000)

      // Persist tracking state
      this._saveState()
    },

    async stopTracking() {
      // Stop geolocation
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }

      // Clear intervals
      if (sendInterval) {
        clearInterval(sendInterval)
        sendInterval = null
      }
      if (elapsedInterval) {
        clearInterval(elapsedInterval)
        elapsedInterval = null
      }

      // Stop session on server
      const auth = useAuthStore()
      if (this.currentSession) {
        try {
          await $fetch(`/api/session/${this.currentSession.id}/stop`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}` },
          })
        } catch {}
      }

      this.isTracking = false
      this.currentSession = null
      this.sessionElapsed = '00:00:00'
      this.sendStatus = ''
      prevLat = null
      prevLng = null

      this._clearState()
    },

    async _sendLocation() {
      if (!this.location) return

      const auth = useAuthStore()
      const { emit } = useSocket()

      if (!auth.token) return

      try {
        const battery = await getBatteryLevel()
        const device = auth.devices.find((d) => d.id === this.selectedDeviceId && d.isActive)

        const body: any = {
          latitude: this.location.latitude,
          longitude: this.location.longitude,
          accuracy: this.location.accuracy,
          speed: this.location.speed,
          heading: this.location.heading,
          altitude: this.location.altitude,
          batteryLevel: battery,
        }
        if (device) {
          if (device.deviceType === 'laptop') {
            body.identifier = device.identifier
          } else {
            body.imei = device.imei
          }
        }
        if (this.currentSession) body.sessionId = this.currentSession.id

        await $fetch('/api/location', {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
          body,
        })

        // Track local stats
        this.pointCount++
        if (prevLat !== null && prevLng !== null) {
          const dist = haversine(prevLat, prevLng, this.location.latitude, this.location.longitude)
          this.sessionDistance += dist
        }
        prevLat = this.location.latitude
        prevLng = this.location.longitude

        // Emit via socket for real-time
        emit('location:update', {
          ...body,
          timestamp: this.location.timestamp,
        })

        const now = new Date().toLocaleTimeString()
        this.sendStatus = `Location sent at ${now}`
      } catch {
        this.sendStatus = 'Failed to send location'
      }
    },

    _saveState() {
      if (import.meta.client) {
        localStorage.setItem('tracking_active', JSON.stringify({
          isTracking: this.isTracking,
          sessionId: this.currentSession?.id || null,
          selectedDeviceId: this.selectedDeviceId,
          sessionStartTime: this.sessionStartTime,
        }))
      }
    },

    _clearState() {
      if (import.meta.client) {
        localStorage.removeItem('tracking_active')
      }
    },

    setSelectedDevice(deviceId: string) {
      this.selectedDeviceId = deviceId
    },
  },
})

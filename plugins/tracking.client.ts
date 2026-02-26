export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  const tracking = useTrackingStore()

  // Connect socket if logged in
  if (auth.token) {
    const { connect } = useSocket()
    connect(auth.token)
  }

  // Restore tracking state from localStorage if page was refreshed during active tracking
  if (import.meta.client) {
    const saved = localStorage.getItem('tracking_active')
    if (saved && auth.token) {
      try {
        const state = JSON.parse(saved)
        if (state.isTracking) {
          tracking.selectedDeviceId = state.selectedDeviceId || ''
          // Resume tracking (starts fresh geolocation watch + new send interval)
          tracking.startTracking()
        }
      } catch {
        localStorage.removeItem('tracking_active')
      }
    }
  }
})

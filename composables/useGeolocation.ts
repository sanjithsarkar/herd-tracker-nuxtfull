import { ref, onUnmounted } from 'vue'

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  speed: number | null
  heading: number | null
  altitude: number | null
  timestamp: number
}

export const useGeolocation = () => {
  const location = ref<LocationData | null>(null)
  const error = ref<string | null>(null)
  const isTracking = ref(false)
  let watchId: number | null = null

  const startTracking = () => {
    if (!navigator.geolocation) {
      error.value = 'Geolocation is not supported by your browser'
      return
    }

    isTracking.value = true
    error.value = null

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        location.value = {
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
            error.value = 'Location permission denied. Please enable it in browser settings.'
            break
          case err.POSITION_UNAVAILABLE:
            error.value = 'Location information unavailable.'
            break
          case err.TIMEOUT:
            error.value = 'Location request timed out.'
            break
          default:
            error.value = 'An unknown error occurred.'
        }
        isTracking.value = false
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
    isTracking.value = false
  }

  onUnmounted(() => {
    stopTracking()
  })

  return {
    location,
    error,
    isTracking,
    startTracking,
    stopTracking,
  }
}

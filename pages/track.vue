<template>
  <div class="container" style="padding-top: 2rem;">
    <div class="track-page">
      <div class="card" style="text-align: center;">
        <h2>GPS Tracking</h2>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">
          Track your current device location
        </p>

        <!-- Device Selector -->
        <div class="form-group" style="text-align: left; margin-bottom: 1.5rem;">
          <label>Select Device</label>
          <select v-model="tracking.selectedDeviceId" class="input" :disabled="tracking.isTracking">
            <option value="">-- No device --</option>
            <option
              v-for="device in activeDevices"
              :key="device.id"
              :value="device.id"
            >
              {{ device.name }} ({{ device.deviceType === 'laptop' ? device.identifier : device.imei }})
            </option>
          </select>
          <p v-if="auth.devices.length === 0" style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.5rem;">
            No devices registered.
            <NuxtLink to="/devices" style="color: var(--primary);">Add a device</NuxtLink>
          </p>
        </div>

        <!-- Status -->
        <div style="margin-bottom: 1.5rem;">
          <span v-if="tracking.isTracking" class="badge badge-success">
            <span class="badge-dot"></span>
            Tracking Active
          </span>
          <span v-else class="badge badge-danger">
            <span class="badge-dot"></span>
            Tracking Stopped
          </span>
        </div>

        <!-- Session Info -->
        <div v-if="tracking.currentSession" class="card session-info" style="margin-bottom: 1.5rem; text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <strong>Session</strong>
            <span class="badge badge-success" style="font-size: 0.7rem;">
              <span class="badge-dot"></span>
              {{ tracking.sessionElapsed }}
            </span>
          </div>
          <div class="session-stats">
            <div>
              <small style="color: var(--text-muted);">Duration</small>
              <p>{{ tracking.sessionElapsed }}</p>
            </div>
            <div>
              <small style="color: var(--text-muted);">Points</small>
              <p>{{ tracking.pointCount }}</p>
            </div>
            <div>
              <small style="color: var(--text-muted);">Distance</small>
              <p>{{ formatDistance(tracking.sessionDistance) }}</p>
            </div>
          </div>
        </div>

        <!-- Location Info -->
        <div v-if="tracking.location" class="card" style="margin-bottom: 1.5rem; text-align: left;">
          <div class="location-grid">
            <div>
              <small style="color: var(--text-muted);">Latitude</small>
              <p>{{ tracking.location.latitude.toFixed(6) }}</p>
            </div>
            <div>
              <small style="color: var(--text-muted);">Longitude</small>
              <p>{{ tracking.location.longitude.toFixed(6) }}</p>
            </div>
            <div>
              <small style="color: var(--text-muted);">Accuracy</small>
              <p>{{ tracking.location.accuracy.toFixed(1) }}m</p>
            </div>
            <div>
              <small style="color: var(--text-muted);">Speed</small>
              <p>{{ tracking.location.speed != null ? (tracking.location.speed * 3.6).toFixed(1) + ' km/h' : 'N/A' }}</p>
            </div>
            <div>
              <small style="color: var(--text-muted);">Altitude</small>
              <p>{{ tracking.location.altitude != null ? tracking.location.altitude.toFixed(0) + 'm' : 'N/A' }}</p>
            </div>
            <div>
              <small style="color: var(--text-muted);">Last Update</small>
              <p>{{ formatTime(tracking.location.timestamp) }}</p>
            </div>
          </div>
        </div>

        <!-- Error -->
        <p v-if="tracking.geoError" class="error-text" style="margin-bottom: 1rem;">
          {{ tracking.geoError }}
        </p>

        <!-- Send Status -->
        <p v-if="tracking.sendStatus" style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
          {{ tracking.sendStatus }}
        </p>

        <!-- Controls -->
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button
            v-if="!tracking.isTracking"
            class="btn btn-primary pulse"
            @click="tracking.startTracking()"
          >
            Start Tracking
          </button>
          <button
            v-else
            class="btn btn-danger"
            @click="tracking.stopTracking()"
          >
            Stop Tracking
          </button>
        </div>
      </div>

      <!-- Mini Map Preview -->
      <div v-show="tracking.location" class="card" style="margin-top: 1rem; padding: 0; overflow: hidden;">
        <div ref="miniMapRef" class="map-container" style="height: 300px;"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, nextTick, computed } from 'vue'

definePageMeta({
  middleware: 'auth',
})

const tracking = useTrackingStore()
const auth = useAuthStore()

const miniMapRef = ref<HTMLElement | null>(null)
let miniMap: any = null
let marker: any = null

const activeDevices = computed(() => auth.devices.filter((d) => d.isActive))

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString()

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(2)} km`
}

const initOrUpdateMap = async (loc: { latitude: number; longitude: number }) => {
  if (!import.meta.client) return

  await nextTick()

  const L = await import('leaflet')

  if (!miniMap && miniMapRef.value) {
    miniMap = L.map(miniMapRef.value).setView([loc.latitude, loc.longitude], 16)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(miniMap)
    marker = L.marker([loc.latitude, loc.longitude]).addTo(miniMap)
    setTimeout(() => miniMap?.invalidateSize(), 100)
  } else if (miniMap && marker) {
    marker.setLatLng([loc.latitude, loc.longitude])
    miniMap.panTo([loc.latitude, loc.longitude])
  }
}

onMounted(async () => {
  try {
    await auth.fetchDevices()
    if (!tracking.selectedDeviceId && activeDevices.value.length > 0) {
      tracking.selectedDeviceId = activeDevices.value[0]?.id ?? ''
    }
  } catch {
    // ignore
  }

  // If tracking is already active (came back from another page), init map
  if (tracking.location) {
    initOrUpdateMap(tracking.location)
  }
})

// Update mini map when location changes
watch(() => tracking.location, async (loc) => {
  if (!loc) return
  initOrUpdateMap(loc)
}, { deep: true })

// Only clean up map on unmount, NOT tracking
onUnmounted(() => {
  if (miniMap) {
    miniMap.remove()
    miniMap = null
  }
})
</script>

<style scoped>
.track-page {
  max-width: 600px;
  margin: 0 auto;
}

.location-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.session-stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  text-align: center;
}

.session-stats p {
  font-weight: 600;
  font-size: 1.1rem;
  margin-top: 0.25rem;
}

.session-info {
  background: var(--bg);
  border: 1px solid var(--primary);
}

.error-text {
  color: var(--danger);
  font-size: 0.875rem;
}
</style>

<template>
  <div class="container" style="padding-top: 1.5rem;">
    <div class="dashboard-header">
      <h2>Live Dashboard</h2>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <select v-model="filterDeviceId" class="input" style="width: auto; padding: 0.4rem 0.6rem; font-size: 0.85rem;">
          <option value="">All Devices</option>
          <option v-for="device in auth.devices" :key="device.id" :value="device.id">
            {{ device.name }} ({{ device.deviceType === 'laptop' ? device.identifier?.slice(-6) : device.imei?.slice(-4) }})
          </option>
        </select>
        <span :class="['badge', socketConnected ? 'badge-success' : 'badge-danger']">
          <span class="badge-dot"></span>
          {{ socketConnected ? 'Connected' : 'Disconnected' }}
        </span>
      </div>
    </div>

    <!-- Map -->
    <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 1.5rem;">
      <div ref="mapRef" class="map-container"></div>
    </div>

    <!-- Device Cards + Info -->
    <div class="dashboard-grid">
      <div class="card">
        <h3 style="margin-bottom: 1rem;">Latest Location</h3>
        <div v-if="latestLocation">
          <div class="info-row" v-if="latestLocation.deviceName">
            <span class="info-label">Device</span>
            <span>{{ latestLocation.deviceName }}</span>
          </div>
          <div class="info-row" v-if="latestLocation.imei">
            <span class="info-label">IMEI</span>
            <span>{{ latestLocation.imei }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Latitude</span>
            <span>{{ latestLocation.latitude.toFixed(6) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Longitude</span>
            <span>{{ latestLocation.longitude.toFixed(6) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Accuracy</span>
            <span>{{ latestLocation.accuracy?.toFixed(1) || 'N/A' }}m</span>
          </div>
          <div class="info-row">
            <span class="info-label">Time</span>
            <span>{{ formatTime(latestLocation.timestamp) }}</span>
          </div>
        </div>
        <p v-else style="color: var(--text-muted);">
          No location data yet. Open the Track page on your mobile device.
        </p>
      </div>

      <div class="card">
        <h3 style="margin-bottom: 1rem;">Devices ({{ auth.devices.length }})</h3>
        <div v-if="auth.devices.length === 0" style="color: var(--text-muted); font-size: 0.9rem;">
          <p>No devices registered.</p>
          <NuxtLink to="/devices" class="btn btn-primary" style="margin-top: 0.75rem;">Add Device</NuxtLink>
        </div>
        <div v-else class="device-cards">
          <div
            v-for="(device, i) in auth.devices"
            :key="device.id"
            :class="['device-card', { selected: filterDeviceId === device.id }]"
            @click="filterDeviceId = filterDeviceId === device.id ? '' : device.id"
          >
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="color-dot" :style="{ background: markerColors[i % markerColors.length] }"></span>
              <strong>{{ device.name }}</strong>
            </div>
            <div style="color: var(--text-muted); font-size: 0.75rem;">
              {{ device.lastSeen ? formatTime(device.lastSeen) : 'Never' }}
            </div>
          </div>
        </div>
        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
          <NuxtLink to="/track" class="btn btn-primary" style="flex: 1; font-size: 0.85rem;">Track</NuxtLink>
          <NuxtLink to="/history" class="btn btn-outline" style="flex: 1; font-size: 0.85rem;">History</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

definePageMeta({
  middleware: 'auth',
})

interface LocationPoint {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: string | number
  deviceId?: string
  imei?: string
  deviceName?: string
}

const markerColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const { store: auth, authFetch } = useAuth()
const { on, off, isConnected: socketConnected } = useSocket()

const mapRef = ref<HTMLElement | null>(null)
const latestLocation = ref<LocationPoint | null>(null)
const filterDeviceId = ref('')

let map: any = null
const deviceMarkers = new Map<string, any>() // deviceId -> marker
let defaultMarker: any = null

const formatTime = (ts: string | number) => {
  return new Date(ts).toLocaleString()
}

const getDeviceColor = (deviceId: string | undefined) => {
  if (!deviceId) return markerColors[0]
  const idx = auth.devices.findIndex((d) => d.id === deviceId)
  return markerColors[idx >= 0 ? idx % markerColors.length : 0]
}

const ensureMap = async (lat: number, lng: number) => {
  if (!import.meta.client) return
  const L = await import('leaflet')

  if (!map && mapRef.value) {
    map = L.map(mapRef.value).setView([lat, lng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
  }
  return L
}

const updateMarker = async (data: LocationPoint) => {
  const L = await ensureMap(data.latitude, data.longitude)
  if (!L || !map) return

  const key = data.deviceId || '__default__'
  const color = getDeviceColor(data.deviceId)

  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:16px;height:16px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 0 10px ${color}80;"></div>`,
    iconSize: [16, 16],
  })

  if (key === '__default__') {
    if (!defaultMarker) {
      defaultMarker = L.marker([data.latitude, data.longitude], { icon }).addTo(map)
    } else {
      defaultMarker.setLatLng([data.latitude, data.longitude])
      defaultMarker.setIcon(icon)
    }
  } else {
    if (deviceMarkers.has(key)) {
      deviceMarkers.get(key).setLatLng([data.latitude, data.longitude])
      deviceMarkers.get(key).setIcon(icon)
    } else {
      const deviceName = auth.devices.find((d) => d.id === key)?.name || 'Unknown'
      const m = L.marker([data.latitude, data.longitude], { icon })
        .addTo(map)
        .bindPopup(deviceName)
      deviceMarkers.set(key, m)
    }
  }

  // Pan to the updated device if it matches filter or no filter
  if (!filterDeviceId.value || filterDeviceId.value === data.deviceId) {
    map.panTo([data.latitude, data.longitude])
  }
}

const fetchLatest = async () => {
  try {
    let url = `/api/location/latest/${auth.user?.id}`
    if (filterDeviceId.value) url += `?deviceId=${filterDeviceId.value}`

    const data = await authFetch<LocationPoint>(url)
    if (data) {
      latestLocation.value = data
      // Find device name
      if (data.deviceId) {
        const dev = auth.devices.find((d) => d.id === (data as any).deviceId)
        if (dev) data.deviceName = dev.name
      }
      updateMarker(data)
    }
  } catch {
    // No location data yet
  }
}

const handleLocationUpdate = (data: LocationPoint) => {
  // Filter by device if active
  if (filterDeviceId.value && data.deviceId !== filterDeviceId.value) {
    // Still update marker but don't update the info panel
    updateMarker(data)
    return
  }
  latestLocation.value = data
  updateMarker(data)
}

// Re-fetch when device filter changes
watch(filterDeviceId, () => {
  fetchLatest()
})

onMounted(async () => {
  if (auth.token) {
    on('location:update', handleLocationUpdate)

    try {
      await auth.fetchDevices()
    } catch {
      // ignore
    }
  }

  fetchLatest()

  setTimeout(() => {
    if (!latestLocation.value && mapRef.value) {
      ensureMap(23.8103, 90.4125)
    }
  }, 1000)
})

onUnmounted(() => {
  off('location:update', handleLocationUpdate)
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.device-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.device-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
}

.device-card:hover {
  border-color: var(--primary);
}

.device-card.selected {
  border-color: var(--primary);
  background: rgba(16, 185, 129, 0.1);
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>

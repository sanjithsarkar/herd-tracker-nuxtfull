<template>
  <div class="container" style="padding-top: 1.5rem;">
    <div class="dashboard-header">
      <h2>Location History</h2>
      <div class="view-toggle">
        <button :class="['tab-btn', { active: viewMode === 'sessions' }]" @click="viewMode = 'sessions'">Sessions</button>
        <button :class="['tab-btn', { active: viewMode === 'points' }]" @click="viewMode = 'points'">All Points</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom: 1rem;">
      <div class="filter-row">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Device</label>
          <select v-model="filterDeviceId" class="input">
            <option value="">All Devices</option>
            <option v-for="device in auth.devices" :key="device.id" :value="device.id">
              {{ device.name }} ({{ device.deviceType === 'laptop' ? device.identifier?.slice(-6) : device.imei?.slice(-4) }})
            </option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>From</label>
          <input v-model="dateFrom" type="date" class="input" />
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>To</label>
          <input v-model="dateTo" type="date" class="input" />
        </div>
        <button class="btn btn-primary" @click="fetchData" style="align-self: flex-end;">
          Filter
        </button>
      </div>
    </div>

    <!-- Map with route -->
    <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 1rem;">
      <div ref="historyMapRef" class="map-container"></div>
    </div>

    <!-- Sessions View -->
    <div v-if="viewMode === 'sessions'" class="card">
      <h3 style="margin-bottom: 1rem;">
        Tracking Sessions
        <span style="color: var(--text-muted); font-weight: normal; font-size: 0.875rem;">
          ({{ sessions.length }})
        </span>
      </h3>

      <div v-if="loading" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Loading...
      </div>

      <div v-else-if="sessions.length === 0" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No sessions found for this period.
      </div>

      <div v-else class="session-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          :class="['session-card', { selected: selectedSessionId === session.id }]"
          @click="selectSession(session)"
        >
          <div class="session-card-header">
            <strong>{{ session.deviceName || 'Unknown Device' }}</strong>
            <span :class="['badge', session.status === 'active' ? 'badge-success' : 'badge-danger']" style="font-size: 0.7rem;">
              <span class="badge-dot"></span>
              {{ session.status }}
            </span>
          </div>
          <div class="session-card-body">
            <div>
              <small style="color: var(--text-muted);">Started</small>
              <p>{{ formatTime(session.startedAt) }}</p>
            </div>
            <div>
              <small style="color: var(--text-muted);">Duration</small>
              <p>{{ formatDuration(session.duration) }}</p>
            </div>
            <div>
              <small style="color: var(--text-muted);">Distance</small>
              <p>{{ formatDistance(session.totalDistance) }}</p>
            </div>
            <div>
              <small style="color: var(--text-muted);">Points</small>
              <p>{{ session.pointCount }}</p>
            </div>
          </div>
          <div v-if="session.imei" style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.5rem;">
            IMEI: {{ session.imei }}
          </div>
        </div>
      </div>
    </div>

    <!-- Points View -->
    <div v-if="viewMode === 'points'" class="card">
      <h3 style="margin-bottom: 1rem;">
        Location Points
        <span style="color: var(--text-muted); font-weight: normal; font-size: 0.875rem;">
          ({{ locations.length }} records)
        </span>
      </h3>

      <div v-if="loading" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Loading...
      </div>

      <div v-else-if="locations.length === 0" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No location data for this period.
      </div>

      <div v-else class="table-wrapper">
        <table class="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Speed</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="loc in locations" :key="loc.id">
              <td>{{ formatTime(loc.timestamp) }}</td>
              <td>{{ loc.latitude.toFixed(6) }}</td>
              <td>{{ loc.longitude.toFixed(6) }}</td>
              <td>{{ loc.speed != null ? (loc.speed * 3.6).toFixed(1) + ' km/h' : '-' }}</td>
              <td>{{ loc.accuracy?.toFixed(1) || 'N/A' }}m</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

definePageMeta({
  middleware: 'auth',
})

interface HistoryLocation {
  id: string
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  altitude?: number
  timestamp: string
}

interface Session {
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

const { store: auth, authFetch } = useAuth()

const historyMapRef = ref<HTMLElement | null>(null)
const locations = ref<HistoryLocation[]>([])
const sessions = ref<Session[]>([])
const loading = ref(false)
const filterDeviceId = ref('')
const viewMode = ref<'sessions' | 'points'>('sessions')
const selectedSessionId = ref<string | null>(null)

const today = new Date()
const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
const dateTo = ref(today.toISOString().split('T')[0])
const dateFrom = ref(weekAgo.toISOString().split('T')[0])

let map: any = null
let polyline: any = null
let markers: any[] = []

const formatTime = (ts: string) => new Date(ts).toLocaleString()

const formatDuration = (seconds: number) => {
  if (!seconds) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const formatDistance = (meters: number) => {
  if (!meters) return '0m'
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(2)} km`
}

const fetchSessions = async () => {
  try {
    let url = `/api/sessions?from=${dateFrom.value}&to=${dateTo.value}`
    if (filterDeviceId.value) url += `&deviceId=${filterDeviceId.value}`
    const data = await authFetch<Session[]>(url)
    sessions.value = data || []
  } catch {
    sessions.value = []
  }
}

const fetchLocations = async () => {
  try {
    let url = `/api/location/history/${auth.user?.id}?from=${dateFrom.value}&to=${dateTo.value}`
    if (filterDeviceId.value) url += `&deviceId=${filterDeviceId.value}`
    if (selectedSessionId.value) url += `&sessionId=${selectedSessionId.value}`
    const data = await authFetch<HistoryLocation[]>(url)
    locations.value = data || []
    drawRoute()
  } catch {
    locations.value = []
  }
}

const fetchData = async () => {
  loading.value = true
  selectedSessionId.value = null
  await Promise.all([fetchSessions(), fetchLocations()])
  loading.value = false
}

const selectSession = async (session: Session) => {
  if (selectedSessionId.value === session.id) {
    selectedSessionId.value = null
    await fetchLocations()
    return
  }
  selectedSessionId.value = session.id
  loading.value = true

  try {
    const data = await authFetch<{ locations: HistoryLocation[] }>(`/api/session/${session.id}`)
    locations.value = data?.locations || []
    drawRoute()
  } catch {
    locations.value = []
  } finally {
    loading.value = false
  }
}

const drawRoute = async () => {
  if (!import.meta.client || !historyMapRef.value) return

  const L = await import('leaflet')

  if (!map) {
    map = L.map(historyMapRef.value).setView([23.8103, 90.4125], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
  }

  markers.forEach((m) => m.remove())
  markers = []
  if (polyline) polyline.remove()

  if (locations.value.length === 0) return

  const points: [number, number][] = locations.value.map((loc) => [loc.latitude, loc.longitude])

  polyline = L.polyline(points, {
    color: '#10b981',
    weight: 3,
    opacity: 0.8,
  }).addTo(map)

  const startIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div style="width:12px;height:12px;background:#10b981;border:2px solid white;border-radius:50%;"></div>',
    iconSize: [12, 12],
  })

  const endIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%;"></div>',
    iconSize: [12, 12],
  })

  if (points.length > 0) {
    const startMarker = L.marker(points[0], { icon: startIcon })
      .addTo(map)
      .bindPopup('Start: ' + formatTime(locations.value[0].timestamp))
    markers.push(startMarker)

    if (points.length > 1) {
      const endMarker = L.marker(points[points.length - 1], { icon: endIcon })
        .addTo(map)
        .bindPopup('End: ' + formatTime(locations.value[locations.value.length - 1].timestamp))
      markers.push(endMarker)
    }
  }

  map.fitBounds(polyline.getBounds(), { padding: [20, 20] })
}

watch(viewMode, () => {
  if (viewMode.value === 'points' && locations.value.length === 0) {
    fetchLocations()
  }
})

onMounted(async () => {
  try {
    await auth.fetchDevices()
  } catch {}
  fetchData()
})

onUnmounted(() => {
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
  gap: 0.5rem;
}

.view-toggle {
  display: flex;
  gap: 0;
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow: hidden;
}

.tab-btn {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--primary);
  color: white;
}

.filter-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.session-card {
  padding: 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.session-card:hover {
  border-color: var(--primary);
}

.session-card.selected {
  border-color: var(--primary);
  background: rgba(16, 185, 129, 0.05);
}

.session-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.session-card-body {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.session-card-body p {
  font-weight: 600;
  font-size: 0.9rem;
  margin-top: 0.15rem;
}

@media (max-width: 768px) {
  .session-card-body {
    grid-template-columns: repeat(2, 1fr);
  }
}

.table-wrapper {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th,
.history-table td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
}

.history-table th {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.history-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}
</style>

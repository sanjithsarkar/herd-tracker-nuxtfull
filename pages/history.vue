<template>
  <div class="container" style="padding-top: 1.5rem;">
    <div class="dashboard-header">
      <h2>Location History</h2>
      <div class="view-toggle">
        <button :class="['tab-btn', { active: history.viewMode === 'sessions' }]" @click="history.viewMode = 'sessions'">Sessions</button>
        <button :class="['tab-btn', { active: history.viewMode === 'points' }]" @click="history.viewMode = 'points'">All Points</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom: 1rem;">
      <div class="filter-row">
        <!-- User filter (admin only) -->
        <div v-if="auth.isAdmin" class="form-group" style="margin-bottom: 0;">
          <label>User</label>
          <select v-model="history.filterUserId" class="input">
            <option value="">All Users</option>
            <option v-for="user in adminUsers" :key="user.id" :value="user.id">
              {{ user.name }}
            </option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>Device</label>
          <select v-model="history.filterDeviceId" class="input">
            <option value="">All Devices</option>
            <option v-for="device in deviceOptions" :key="device.id" :value="device.id">
              {{ device.label }}
            </option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>From</label>
          <input v-model="history.dateFrom" type="date" class="input" />
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>To</label>
          <input v-model="history.dateTo" type="date" class="input" />
        </div>
        <button class="btn btn-primary" @click="history.fetchData()" style="align-self: flex-end;">
          Filter
        </button>
      </div>
    </div>

    <!-- Map with route -->
    <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 1rem;">
      <div ref="historyMapRef" class="map-container"></div>
    </div>

    <!-- Sessions View -->
    <div v-if="history.viewMode === 'sessions'" class="card">
      <h3 style="margin-bottom: 1rem;">
        Tracking Sessions
        <span style="color: var(--text-muted); font-weight: normal; font-size: 0.875rem;">
          ({{ history.sessions.length }})
        </span>
      </h3>

      <div v-if="history.loading" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Loading...
      </div>

      <div v-else-if="history.sessions.length === 0" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No sessions found for this period.
      </div>

      <div v-else class="session-list">
        <div
          v-for="session in history.sessions"
          :key="session.id"
          :class="['session-card', { selected: history.selectedSessionId === session.id }]"
          @click="history.selectSession(session)"
        >
          <div class="session-card-header">
            <div>
              <strong>{{ session.deviceName || 'Unknown Device' }}</strong>
              <span v-if="auth.isAdmin && session.user" class="owner-tag" style="margin-left: 0.5rem;">
                {{ session.user.name }}
              </span>
            </div>
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
    <div v-if="history.viewMode === 'points'" class="card">
      <h3 style="margin-bottom: 1rem;">
        Location Points
        <span style="color: var(--text-muted); font-weight: normal; font-size: 0.875rem;">
          ({{ history.locations.length }} records)
        </span>
      </h3>

      <div v-if="history.loading" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Loading...
      </div>

      <div v-else-if="history.locations.length === 0" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No location data for this period.
      </div>

      <div v-else class="table-wrapper">
        <table class="history-table">
          <thead>
            <tr>
              <th v-if="auth.isAdmin">User</th>
              <th>Time</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Speed</th>
              <th>Accuracy</th>
              <th>Google Maps</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="loc in history.locations" :key="loc.id">
              <td v-if="auth.isAdmin" class="owner-tag">{{ loc.user?.name || '-' }}</td>
              <td>{{ formatTime(loc.timestamp) }}</td>
              <td>{{ loc.latitude.toFixed(6) }}</td>
              <td>{{ loc.longitude.toFixed(6) }}</td>
              <td>{{ loc.speed != null ? (loc.speed * 3.6).toFixed(1) + ' km/h' : '-' }}</td>
              <td>{{ loc.accuracy?.toFixed(1) || 'N/A' }}m</td>
              <td class="map-cell">
                <a
                  :href="googleMapsUrl(loc.latitude, loc.longitude)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="map-link"
                  :title="`Open ${loc.latitude}, ${loc.longitude} in Google Maps`"
                  @click.stop
                >
                  <span class="sr-only">Open in Google Maps</span>
                  <svg class="map-pin-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </a>
              </td>
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

const auth = useAuthStore()
const history = useHistoryStore()
const admin = useAdminStore()

const historyMapRef = ref<HTMLElement | null>(null)
let map: any = null
let polyline: any = null
let markers: any[] = []

// For admin: load users list for the filter dropdown
const adminUsers = computed(() => {
  if (!auth.isAdmin) return []
  return admin.users.sort((a, b) => a.name.localeCompare(b.name))
})

// For admin: show all devices from admin store; for regular user: own devices
const adminDevices = ref<any[]>([])

const deviceOptions = computed(() => {
  if (auth.isAdmin) {
    let devices = adminDevices.value
    if (history.filterUserId) {
      devices = devices.filter((d: any) => d.userId === history.filterUserId)
    }
    return devices.map((d: any) => ({
      id: d.id,
      label: `${d.name} (${d.user?.name || 'Unknown'})`,
    }))
  }
  return auth.devices.map((d: any) => ({
    id: d.id,
    label: `${d.name} (${d.deviceType === 'laptop' ? d.identifier?.slice(-6) : d.imei?.slice(-4)})`,
  }))
})

const formatTime = (ts: string) => new Date(ts).toLocaleString()

const googleMapsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`

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

  if (history.locations.length === 0) return

  const points: [number, number][] = history.locations.map((loc) => [loc.latitude, loc.longitude])

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
      .bindPopup('Start: ' + formatTime(history.locations[0].timestamp))
    markers.push(startMarker)

    if (points.length > 1) {
      const endMarker = L.marker(points[points.length - 1], { icon: endIcon })
        .addTo(map)
        .bindPopup('End: ' + formatTime(history.locations[history.locations.length - 1].timestamp))
      markers.push(endMarker)
    }
  }

  map.fitBounds(polyline.getBounds(), { padding: [20, 20] })
}

watch(() => history.locations, drawRoute, { deep: true })

watch(() => history.viewMode, () => {
  if (history.viewMode === 'points' && history.locations.length === 0) {
    history.fetchLocations()
  }
})

// When user filter changes, reset device filter
watch(() => history.filterUserId, () => {
  history.filterDeviceId = ''
})

onMounted(async () => {
  if (auth.isAdmin) {
    // Load users and devices for admin filters
    await Promise.all([
      admin.fetchUsers(),
      auth.authFetch<any[]>('/api/admin/devices').then((d) => { adminDevices.value = d || [] }).catch(() => {}),
    ])
  } else {
    try { await auth.fetchDevices() } catch {}
  }
  await history.fetchData()
  await nextTick()
  drawRoute()
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

.owner-tag {
  color: var(--primary);
  font-weight: 600;
  font-size: 0.8rem;
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

.map-cell {
  width: 4rem;
  text-align: center;
  vertical-align: middle;
}

.map-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
  color: var(--primary);
  border-radius: var(--radius);
  transition: color 0.15s, background 0.15s;
}

.map-link:hover {
  color: #34a853;
  background: rgba(16, 185, 129, 0.12);
}

.map-pin-icon {
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

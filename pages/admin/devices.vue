<template>
  <div class="container" style="padding-top: 2rem;">
    <h2 style="margin-bottom: 1.5rem;">All Devices</h2>

    <p v-if="admin.error" style="color: var(--danger); margin-bottom: 1rem;">
      {{ admin.error }}
    </p>

    <!-- Filters -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="filters">
        <div class="form-group" style="margin-bottom: 0; flex: 1; min-width: 180px;">
          <label>Filter by User</label>
          <select v-model="filterUserId" class="input">
            <option value="">All Users</option>
            <option v-for="user in uniqueUsers" :key="user.id" :value="user.id">
              {{ user.name }}
            </option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0; min-width: 140px;">
          <label>Device Type</label>
          <select v-model="filterType" class="input">
            <option value="">All Types</option>
            <option value="mobile">Mobile</option>
            <option value="laptop">Laptop</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0; min-width: 140px;">
          <label>Status</label>
          <select v-model="filterStatus" class="input">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0; min-width: 200px;">
          <label>Search</label>
          <input
            v-model="searchQuery"
            type="text"
            class="input"
            placeholder="Name, IMEI, email..."
          />
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row" style="margin-bottom: 1.5rem;">
      <div class="stat-card">
        <span class="stat-value">{{ admin.devices.length }}</span>
        <span class="stat-label">Total Devices</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ admin.devices.filter(d => d.deviceType === 'mobile').length }}</span>
        <span class="stat-label">Mobile</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ admin.devices.filter(d => d.deviceType === 'laptop').length }}</span>
        <span class="stat-label">Laptop</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ uniqueUsers.length }}</span>
        <span class="stat-label">Users</span>
      </div>
    </div>

    <!-- Device List -->
    <div class="card">
      <h3 style="margin-bottom: 1rem;">
        Devices
        <span style="color: var(--text-muted); font-weight: normal; font-size: 0.875rem;">
          ({{ filteredDevices.length }})
        </span>
      </h3>

      <div v-if="admin.devicesLoading" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Loading devices...
      </div>

      <div v-else-if="filteredDevices.length === 0" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No devices found.
      </div>

      <div v-else class="device-list">
        <div v-for="device in filteredDevices" :key="device.id" class="device-item">
          <div class="device-info">
            <div class="device-header">
              <span class="device-name">{{ device.name }}</span>
              <span :class="['badge', device.isActive ? 'badge-success' : 'badge-danger']">
                <span class="badge-dot"></span>
                {{ device.isActive ? 'Active' : 'Inactive' }}
              </span>
              <span class="badge badge-type">
                {{ device.deviceType === 'laptop' ? 'Laptop' : 'Mobile' }}
              </span>
            </div>
            <div class="device-meta">
              <span class="owner-tag">{{ device.user.name }}</span>
              <span v-if="device.imei">IMEI: {{ device.imei }}</span>
              <span v-if="device.identifier">ID: {{ device.identifier }}</span>
              <span v-if="device.lastSeen">Last seen: {{ formatTime(device.lastSeen) }}</span>
              <span v-else>Never tracked</span>
            </div>
            <div class="device-meta" style="margin-top: 0.15rem;">
              <span>{{ device.user.email }}</span>
              <span>Registered: {{ formatDate(device.createdAt) }}</span>
            </div>
          </div>
          <div class="device-actions">
            <a
              v-if="device.latestLocation"
              :href="`https://www.google.com/maps?q=${device.latestLocation.latitude},${device.latestLocation.longitude}`"
              target="_blank"
              rel="noopener noreferrer"
              class="map-link"
              :title="`${device.name} — ${device.latestLocation.latitude.toFixed(6)}, ${device.latestLocation.longitude.toFixed(6)}`"
            >
              <svg class="map-pin-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </a>
            <span v-else class="no-location" title="No location data">
              <svg class="map-pin-icon muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const auth = useAuthStore()
const admin = useAdminStore()

const filterUserId = ref('')
const filterType = ref('')
const filterStatus = ref('')
const searchQuery = ref('')

onMounted(async () => {
  if (!auth.isAdmin) {
    return navigateTo('/dashboard')
  }
  await admin.fetchDevices()
})

const uniqueUsers = computed(() => {
  const map = new Map<string, { id: string; name: string }>()
  for (const d of admin.devices) {
    if (!map.has(d.user.id)) {
      map.set(d.user.id, { id: d.user.id, name: d.user.name })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
})

const filteredDevices = computed(() => {
  let list = admin.devices

  if (filterUserId.value) {
    list = list.filter((d) => d.userId === filterUserId.value)
  }
  if (filterType.value) {
    list = list.filter((d) => d.deviceType === filterType.value)
  }
  if (filterStatus.value) {
    list = list.filter((d) =>
      filterStatus.value === 'active' ? d.isActive : !d.isActive
    )
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.user.name.toLowerCase().includes(q) ||
        d.user.email.toLowerCase().includes(q) ||
        (d.imei && d.imei.includes(q)) ||
        (d.identifier && d.identifier.toLowerCase().includes(q))
    )
  }

  return list
})

const formatTime = (ts: string) => new Date(ts).toLocaleString()
const formatDate = (date: string) => new Date(date).toLocaleDateString()
</script>

<style scoped>
.filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stats-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 100px;
  padding: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--bg);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  gap: 1rem;
  flex-wrap: wrap;
}

.device-info {
  flex: 1;
  min-width: 200px;
}

.device-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.device-name {
  font-weight: 600;
  font-size: 1rem;
}

.device-meta {
  display: flex;
  gap: 1.5rem;
  color: var(--text-muted);
  font-size: 0.8rem;
  flex-wrap: wrap;
}

.owner-tag {
  color: var(--primary);
  font-weight: 600;
}

.badge-type {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
}

.device-actions {
  display: flex;
  align-items: center;
}

.map-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: var(--primary);
  border-radius: var(--radius);
  transition: color 0.15s, background 0.15s;
}

.map-link:hover {
  color: #34a853;
  background: rgba(16, 185, 129, 0.12);
}

.map-pin-icon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
}

.map-pin-icon.muted {
  color: var(--text-muted);
  opacity: 0.3;
}

.no-location {
  display: inline-flex;
  padding: 0.5rem;
}
</style>

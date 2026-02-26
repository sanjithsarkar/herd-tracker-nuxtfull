<template>
  <div class="container" style="padding-top: 2rem;">
    <h2 style="margin-bottom: 1.5rem;">Device Management</h2>

    <!-- Add Device Form -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <h3 style="margin-bottom: 1rem;">Register New Device</h3>
      <form @submit.prevent="addDevice">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <div class="form-group" style="min-width: 140px; margin-bottom: 0;">
            <label>Device Type</label>
            <select v-model="newDeviceType" class="input">
              <option value="mobile">Mobile</option>
              <option value="laptop">Laptop</option>
            </select>
          </div>
          <div v-if="newDeviceType === 'mobile'" class="form-group" style="flex: 1; min-width: 200px; margin-bottom: 0;">
            <label>IMEI Number (15 digits)</label>
            <input
              v-model="newImei"
              type="text"
              class="input"
              placeholder="123456789012345"
              maxlength="15"
              pattern="\d{15}"
              required
            />
          </div>
          <div v-else class="form-group" style="flex: 1; min-width: 200px; margin-bottom: 0;">
            <label>Serial Number / Identifier</label>
            <input
              v-model="newIdentifier"
              type="text"
              class="input"
              placeholder="e.g. SN-ABC123, hostname"
              minlength="3"
              maxlength="50"
              required
            />
          </div>
          <div class="form-group" style="flex: 1; min-width: 200px; margin-bottom: 0;">
            <label>Device Name</label>
            <input
              v-model="newName"
              type="text"
              class="input"
              :placeholder="newDeviceType === 'mobile' ? 'e.g. iPhone, Samsung' : 'e.g. MacBook Pro, ThinkPad'"
            />
          </div>
          <button type="submit" class="btn btn-primary" style="align-self: flex-end;" :disabled="adding">
            {{ adding ? 'Adding...' : 'Add Device' }}
          </button>
        </div>
        <p v-if="addError" style="color: var(--danger); font-size: 0.85rem; margin-top: 0.5rem;">
          {{ addError }}
        </p>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.75rem;">
          <template v-if="newDeviceType === 'mobile'">
            IMEI check: Phone dial *#06# to see your IMEI number.
          </template>
          <template v-else>
            Find serial: macOS &rarr; Apple menu &rarr; About This Mac | Windows &rarr; cmd &rarr; wmic bios get serialnumber
          </template>
        </p>
      </form>
    </div>

    <!-- Device List -->
    <div class="card">
      <h3 style="margin-bottom: 1rem;">
        Your Devices
        <span style="color: var(--text-muted); font-weight: normal; font-size: 0.875rem;">
          ({{ auth.devices.length }})
        </span>
      </h3>

      <div v-if="loading" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Loading devices...
      </div>

      <div v-else-if="auth.devices.length === 0" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No devices registered yet. Add your first device above.
      </div>

      <div v-else class="device-list">
        <div v-for="device in auth.devices" :key="device.id" class="device-item">
          <div class="device-info">
            <div class="device-header">
              <span v-if="editingId !== device.id" class="device-name">{{ device.name }}</span>
              <input
                v-else
                v-model="editName"
                class="input"
                style="max-width: 200px; padding: 0.4rem 0.6rem; font-size: 0.9rem;"
                @keyup.enter="saveEdit(device.id)"
              />
              <span :class="['badge', device.isActive ? 'badge-success' : 'badge-danger']">
                <span class="badge-dot"></span>
                {{ device.isActive ? 'Active' : 'Inactive' }}
              </span>
              <span class="badge badge-type">
                {{ device.deviceType === 'laptop' ? 'Laptop' : 'Mobile' }}
              </span>
            </div>
            <div class="device-meta">
              <span v-if="device.imei">IMEI: {{ device.imei }}</span>
              <span v-if="device.identifier">ID: {{ device.identifier }}</span>
              <span v-if="device.lastSeen">Last seen: {{ formatTime(device.lastSeen) }}</span>
              <span v-else>Never tracked</span>
            </div>
          </div>

          <div class="device-actions">
            <template v-if="editingId !== device.id">
              <button class="btn-icon" title="Edit" @click="startEdit(device)">
                Edit
              </button>
              <button
                class="btn-icon"
                :title="device.isActive ? 'Deactivate' : 'Activate'"
                @click="toggleActive(device)"
              >
                {{ device.isActive ? 'Disable' : 'Enable' }}
              </button>
              <button class="btn-icon danger" title="Delete" @click="deleteDevice(device.id)">
                Delete
              </button>
            </template>
            <template v-else>
              <button class="btn-icon" @click="saveEdit(device.id)">Save</button>
              <button class="btn-icon" @click="editingId = null">Cancel</button>
            </template>
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

const newDeviceType = ref<'mobile' | 'laptop'>('mobile')
const newImei = ref('')
const newIdentifier = ref('')
const newName = ref('')
const adding = ref(false)
const addError = ref('')
const loading = ref(false)
const editingId = ref<string | null>(null)
const editName = ref('')

const formatTime = (ts: string) => new Date(ts).toLocaleString()

onMounted(async () => {
  loading.value = true
  try {
    await auth.fetchDevices()
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
})

const addDevice = async () => {
  adding.value = true
  addError.value = ''

  try {
    const data: any = {
      deviceType: newDeviceType.value,
      name: newName.value || (newDeviceType.value === 'mobile' ? 'My Phone' : 'My Laptop'),
    }
    if (newDeviceType.value === 'mobile') {
      data.imei = newImei.value
    } else {
      data.identifier = newIdentifier.value
    }

    await auth.registerDevice(data)
    newImei.value = ''
    newIdentifier.value = ''
    newName.value = ''
  } catch (err: any) {
    addError.value = err?.data?.message || err?.message || 'Failed to add device'
  } finally {
    adding.value = false
  }
}

const startEdit = (device: any) => {
  editingId.value = device.id
  editName.value = device.name
}

const saveEdit = async (deviceId: string) => {
  try {
    await auth.updateDevice(deviceId, { name: editName.value })
    editingId.value = null
  } catch {
    // ignore
  }
}

const toggleActive = async (device: any) => {
  await auth.updateDevice(device.id, { isActive: !device.isActive })
}

const deleteDevice = async (deviceId: string) => {
  if (!confirm('Are you sure you want to remove this device?')) return
  await auth.removeDevice(deviceId)
}
</script>

<style scoped>
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
}

.device-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  padding: 0.4rem 0.75rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  color: var(--text);
  border-color: var(--primary);
}

.btn-icon.danger:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.badge-type {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
}
</style>

import { defineStore } from 'pinia'

interface User {
  id: string
  name: string
  email: string
}

interface Device {
  id: string
  deviceType: 'mobile' | 'laptop'
  imei?: string
  identifier?: string
  name: string
  isActive: boolean
  lastSeen: string | null
  createdAt: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
    devices: [] as Device[],
    selectedDeviceId: null as string | null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    selectedDevice: (state) => state.devices.find((d) => d.id === state.selectedDeviceId) || null,
  },

  actions: {
    async register(name: string, email: string, password: string) {
      const res = await $fetch<{ token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      })
      this.token = res.token
      this.user = res.user
      if (import.meta.client) {
        localStorage.setItem('token', res.token)
        localStorage.setItem('user', JSON.stringify(res.user))
      }
    },

    async login(email: string, password: string) {
      const res = await $fetch<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      this.token = res.token
      this.user = res.user
      if (import.meta.client) {
        localStorage.setItem('token', res.token)
        localStorage.setItem('user', JSON.stringify(res.user))
      }
    },

    logout() {
      this.token = null
      this.user = null
      this.devices = []
      this.selectedDeviceId = null
      if (import.meta.client) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
      navigateTo('/')
    },

    loadFromStorage() {
      if (import.meta.client) {
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')
        if (token && user) {
          this.token = token
          this.user = JSON.parse(user)
        }
      }
    },

    async fetchDevices() {
      const data = await $fetch<Device[]>('/api/devices', {
        headers: { Authorization: `Bearer ${this.token}` },
      })
      this.devices = data
    },

    async registerDevice(data: { deviceType: string; imei?: string; identifier?: string; name: string }) {
      const device = await $fetch<Device>('/api/device', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: data,
      })
      this.devices.unshift(device)
      return device
    },

    async updateDevice(deviceId: string, updates: { name?: string; isActive?: boolean }) {
      const device = await $fetch<Device>(`/api/device/${deviceId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${this.token}` },
        body: updates,
      })
      const idx = this.devices.findIndex((d) => d.id === deviceId)
      if (idx !== -1) this.devices[idx] = device
      return device
    },

    async removeDevice(deviceId: string) {
      await $fetch(`/api/device/${deviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.token}` },
      })
      this.devices = this.devices.filter((d) => d.id !== deviceId)
      if (this.selectedDeviceId === deviceId) {
        this.selectedDeviceId = null
      }
    },

    setSelectedDevice(deviceId: string | null) {
      this.selectedDeviceId = deviceId
    },
  },
})

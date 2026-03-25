interface User {
  id: string
  name: string
  email: string
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
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
    // Auth form (login/register page)
    authFormMode: 'login' as 'login' | 'register',
    authFormLoading: false,
    authFormError: '',
    authForm: {
      name: '',
      email: '',
      password: '',
    },
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'ADMIN' || state.user?.role === 'SUPER_ADMIN',
    isSuperAdmin: (state) => state.user?.role === 'SUPER_ADMIN',
    selectedDevice: (state) => state.devices.find((d) => d.id === state.selectedDeviceId) || null,
  },

  actions: {
    setAuthFormError(message: string) {
      this.authFormError = message
    },

    clearAuthForm() {
      this.authFormError = ''
      this.authForm = { name: '', email: '', password: '' }
    },

    async register(name: string, email: string, password: string) {
      this.authFormLoading = true
      this.authFormError = ''
      try {
        const res = await $fetch<{ success: boolean; message: string; user: User }>('/api/auth/register', {
          method: 'POST',
          body: { name, email, password },
        })
        // No token — user must wait for admin approval
        // Return the message so the UI can show it
        return res
      } catch (err: any) {
        this.authFormError = err?.data?.message || err?.message || 'Something went wrong'
        throw err
      } finally {
        this.authFormLoading = false
      }
    },

    async login(email: string, password: string) {
      this.authFormLoading = true
      this.authFormError = ''
      try {
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
      } catch (err: any) {
        this.authFormError = err?.data?.message || err?.message || 'Something went wrong'
        throw err
      } finally {
        this.authFormLoading = false
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

    async authFetch<T>(url: string, options: Record<string, unknown> = {}): Promise<T> {
      return $fetch<T>(url, {
        ...options,
        headers: {
          ...((options.headers as object) || {}),
          Authorization: `Bearer ${this.token}`,
        },
      })
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

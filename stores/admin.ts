interface AdminUser {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  isActive: boolean
  createdAt: string
}

export const useAdminStore = defineStore('admin', {
  state: () => ({
    users: [] as AdminUser[],
    loading: false,
    error: '',
  }),

  getters: {
    pendingUsers: (state) => state.users.filter((u) => !u.isActive),
    activeUsers: (state) => state.users.filter((u) => u.isActive),
  },

  actions: {
    async fetchUsers() {
      const auth = useAuthStore()
      this.loading = true
      this.error = ''
      try {
        this.users = await auth.authFetch<AdminUser[]>('/api/admin/users')
      } catch (err: any) {
        this.error = err?.data?.message || 'Failed to fetch users'
      } finally {
        this.loading = false
      }
    },

    async toggleUserStatus(userId: string, isActive: boolean) {
      const auth = useAuthStore()
      try {
        const updated = await auth.authFetch<AdminUser>(`/api/admin/users/${userId}/status`, {
          method: 'PATCH',
          body: { isActive },
        })
        const idx = this.users.findIndex((u) => u.id === userId)
        if (idx !== -1) this.users[idx] = updated
      } catch (err: any) {
        this.error = err?.data?.message || 'Failed to update user status'
        throw err
      }
    },

    async deleteUser(userId: string) {
      const auth = useAuthStore()
      try {
        await auth.authFetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        })
        this.users = this.users.filter((u) => u.id !== userId)
      } catch (err: any) {
        this.error = err?.data?.message || 'Failed to delete user'
        throw err
      }
    },

    async assignRole(userId: string, role: 'USER' | 'ADMIN') {
      const auth = useAuthStore()
      try {
        const updated = await auth.authFetch<AdminUser>(`/api/admin/users/${userId}/role`, {
          method: 'PATCH',
          body: { role },
        })
        const idx = this.users.findIndex((u) => u.id === userId)
        if (idx !== -1) this.users[idx] = updated
      } catch (err: any) {
        this.error = err?.data?.message || 'Failed to assign role'
        throw err
      }
    },
  },
})

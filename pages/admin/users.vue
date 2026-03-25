<template>
  <div class="container" style="padding-top: 2rem;">
    <h2 style="margin-bottom: 1.5rem;">User Management</h2>

    <!-- Error -->
    <p v-if="admin.error" style="color: var(--danger); margin-bottom: 1rem;">
      {{ admin.error }}
    </p>

    <!-- Pending Approval Section -->
    <div v-if="admin.pendingUsers.length > 0" class="card" style="margin-bottom: 1.5rem;">
      <h3 style="margin-bottom: 1rem; color: #fbbf24;">
        Pending Approval
        <span style="color: var(--text-muted); font-weight: normal; font-size: 0.875rem;">
          ({{ admin.pendingUsers.length }})
        </span>
      </h3>

      <div class="user-list">
        <div v-for="user in admin.pendingUsers" :key="user.id" class="user-item pending">
          <div class="user-info">
            <div class="user-header">
              <span class="user-name">{{ user.name }}</span>
              <span class="badge badge-warning">
                <span class="badge-dot"></span>
                Pending
              </span>
              <span class="badge badge-role">{{ user.role }}</span>
            </div>
            <div class="user-meta">
              <span>{{ user.email }}</span>
              <span>Registered: {{ formatDate(user.createdAt) }}</span>
            </div>
          </div>
          <div class="user-actions">
            <button class="btn-icon approve" @click="approveUser(user.id)">
              Accept
            </button>
            <button class="btn-icon danger" @click="openReject(user.id)">
              Reject
            </button>
            <button class="btn-icon danger" @click="confirmDelete(user)">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Users Section -->
    <div class="card">
      <h3 style="margin-bottom: 1rem;">
        All Users
        <span style="color: var(--text-muted); font-weight: normal; font-size: 0.875rem;">
          ({{ admin.users.length }})
        </span>
      </h3>

      <div v-if="admin.loading" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Loading users...
      </div>

      <div v-else-if="admin.users.length === 0" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No users found.
      </div>

      <div v-else class="user-list">
        <div v-for="user in admin.users" :key="user.id" class="user-item">
          <div class="user-info">
            <div class="user-header">
              <span class="user-name">{{ user.name }}</span>
              <span :class="['badge', user.isActive ? 'badge-success' : 'badge-danger']">
                <span class="badge-dot"></span>
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </span>
              <span class="badge badge-role">{{ user.role }}</span>
            </div>
            <div class="user-meta">
              <span>{{ user.email }}</span>
              <span>Joined: {{ formatDate(user.createdAt) }}</span>
            </div>
          </div>

          <div class="user-actions">
            <!-- Toggle Active/Inactive -->
            <button
              class="btn-icon"
              :title="user.isActive ? 'Deactivate' : 'Activate'"
              @click="toggleStatus(user)"
            >
              {{ user.isActive ? 'Deactivate' : 'Activate' }}
            </button>

            <!-- Role Assignment -->
            <select
              v-if="user.role !== 'SUPER_ADMIN'"
              class="role-select"
              :value="user.role"
              @change="changeRole(user.id, ($event.target as HTMLSelectElement).value)"
            >
              <option value="USER">USER</option>
              <option v-if="auth.isSuperAdmin" value="ADMIN">ADMIN</option>
            </select>

            <!-- Delete User -->
            <button class="btn-icon danger" @click="confirmDelete(user)">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete user -->
    <ConfirmDialog
      v-model="deleteOpen"
      title="Delete user permanently?"
      variant="danger"
      confirm-label="Delete permanently"
      cancel-label="Cancel"
      :loading="deleteLoading"
      loading-label="Deleting…"
      @confirm="runDeleteUser"
    >
      <template #default>
        <p v-if="deleteTarget" class="modal-lead">
          You are about to remove <strong>{{ deleteTarget.name }}</strong>
        </p>
        <p v-if="deleteTarget" class="modal-email">{{ deleteTarget.email }}</p>
        <p class="modal-warning">This cannot be undone. All related data will be removed:</p>
        <ul class="modal-bullets">
          <li>Registered devices</li>
          <li>Location history</li>
          <li>Tracking sessions</li>
        </ul>
      </template>
    </ConfirmDialog>

    <!-- Reject pending user -->
    <ConfirmDialog
      v-model="rejectOpen"
      title="Reject this user?"
      variant="warning"
      confirm-label="Yes, reject"
      cancel-label="Cancel"
      :loading="rejectLoading"
      @confirm="runRejectUser"
    >
      <template #default>
        <p class="modal-lead">They will be marked inactive and lose access until approved again.</p>
      </template>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const auth = useAuthStore()
const admin = useAdminStore()

// Redirect non-admin users
onMounted(async () => {
  if (!auth.isAdmin) {
    return navigateTo('/dashboard')
  }
  await admin.fetchUsers()
})

const formatDate = (date: string) => new Date(date).toLocaleDateString()

const deleteOpen = ref(false)
const deleteTarget = ref<{ id: string; name: string; email: string } | null>(null)
const deleteLoading = ref(false)

const rejectOpen = ref(false)
const rejectUserId = ref<string | null>(null)
const rejectLoading = ref(false)

const approveUser = async (userId: string) => {
  await admin.toggleUserStatus(userId, true)
}

const openReject = (userId: string) => {
  rejectUserId.value = userId
  rejectOpen.value = true
}

const runRejectUser = async () => {
  if (!rejectUserId.value) return
  rejectLoading.value = true
  try {
    await admin.toggleUserStatus(rejectUserId.value, false)
    rejectOpen.value = false
    rejectUserId.value = null
  } finally {
    rejectLoading.value = false
  }
}

const toggleStatus = async (user: any) => {
  await admin.toggleUserStatus(user.id, !user.isActive)
}

const changeRole = async (userId: string, role: string) => {
  if (role !== 'USER' && role !== 'ADMIN') return
  await admin.assignRole(userId, role)
}

const confirmDelete = (user: { id: string; name: string; email: string }) => {
  deleteTarget.value = user
  deleteOpen.value = true
}

const runDeleteUser = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await admin.deleteUser(deleteTarget.value.id)
    deleteOpen.value = false
    deleteTarget.value = null
  } finally {
    deleteLoading.value = false
  }
}
</script>

<style scoped>
.user-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-item {
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

.user-item.pending {
  border-color: rgba(251, 191, 36, 0.3);
}

.user-info {
  flex: 1;
  min-width: 200px;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.user-name {
  font-weight: 600;
  font-size: 1rem;
}

.user-meta {
  display: flex;
  gap: 1.5rem;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.user-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
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

.btn-icon.approve {
  color: var(--primary);
  border-color: var(--primary);
}

.btn-icon.approve:hover {
  background: rgba(16, 185, 129, 0.15);
}

.btn-icon.danger:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.badge-warning {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.badge-role {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
}

.role-select {
  padding: 0.4rem 0.5rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 0.8rem;
  cursor: pointer;
}

.modal-lead {
  color: var(--text);
  font-size: 0.95rem;
  margin-bottom: 0.35rem;
  text-align: center;
}

.modal-email {
  color: var(--primary);
  font-size: 0.85rem;
  margin-bottom: 1rem;
  word-break: break-all;
  text-align: center;
}

.modal-warning {
  color: var(--text-muted);
  font-size: 0.8rem;
  text-align: left;
  margin-bottom: 0.5rem;
}

.modal-bullets {
  text-align: left;
  padding-left: 1.25rem;
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.5;
}

.modal-bullets li {
  margin-bottom: 0.25rem;
}
</style>

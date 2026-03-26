<template>
  <div>
    <nav class="navbar" v-if="auth.isLoggedIn">
      <NuxtLink to="/dashboard" class="navbar-brand">Herd Tracker</NuxtLink>
      <div class="navbar-links">
        <NuxtLink to="/dashboard">Dashboard</NuxtLink>
        <NuxtLink to="/track">
          Track
          <span v-if="tracking.isTracking" class="tracking-pulse"></span>
        </NuxtLink>
        <NuxtLink to="/devices">Devices</NuxtLink>
        <NuxtLink to="/history">History</NuxtLink>
        <NuxtLink v-if="auth.isAdmin" to="/admin/devices" class="admin-link">All Devices</NuxtLink>
        <NuxtLink v-if="auth.isAdmin" to="/admin/users" class="admin-link">Users</NuxtLink>
        <button class="btn btn-outline" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;" @click="auth.logout()">
          Logout
        </button>
      </div>
    </nav>
    <slot />
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore()
const tracking = useTrackingStore()
</script>

<style scoped>
.tracking-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  margin-left: 4px;
  vertical-align: middle;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
}

.admin-link {
  color: #fbbf24 !important;
}
</style>

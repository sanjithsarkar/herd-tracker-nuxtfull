<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-header">
        <h1>Herd Tracker</h1>
        <p>Track your own device location in real-time</p>
      </div>

      <div class="card">
        <div class="auth-tabs">
          <button
            type="button"
            :class="['tab', { active: mode === 'login' }]"
            @click="mode = 'login'"
          >
            Login
          </button>
          <button
            type="button"
            :class="['tab', { active: mode === 'register' }]"
            @click="mode = 'register'"
          >
            Register
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-group" v-if="mode === 'register'">
            <label>Name</label>
            <input v-model="form.name" type="text" class="input" placeholder="Your name" required />
          </div>

          <div class="form-group">
            <label>Email</label>
            <input v-model="form.email" type="email" class="input" placeholder="you@example.com" required />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input v-model="form.password" type="password" class="input" placeholder="Min 6 characters" required />
          </div>

          <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

          <button type="submit" class="btn btn-primary" style="width: 100%" :disabled="loading">
            {{ loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Create Account') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const auth = useAuthStore()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  name: '',
  email: '',
  password: '',
})

// Redirect if already logged in (auth already loaded by plugin)
onMounted(() => {
  if (auth.isLoggedIn) {
    router.push('/dashboard')
  }
})

const handleSubmit = async () => {
  loading.value = true
  errorMsg.value = ''

  try {
    if (mode.value === 'register') {
      await auth.register(form.name, form.email, form.password)
    } else {
      await auth.login(form.email, form.password)
    }
    router.push('/dashboard')
  } catch (err: any) {
    errorMsg.value = err?.data?.message || err?.message || 'Something went wrong'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
}

.auth-container {
  width: 100%;
  max-width: 420px;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-header h1 {
  font-size: 2rem;
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.auth-header p {
  color: var(--text-muted);
}

.auth-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.tab {
  flex: 1;
  padding: 0.75rem;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.error-text {
  color: var(--danger);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
</style>

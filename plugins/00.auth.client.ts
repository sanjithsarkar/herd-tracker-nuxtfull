// Runs BEFORE middleware — ensures auth state is loaded from localStorage
// before any route guard checks
export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  auth.loadFromStorage()
})

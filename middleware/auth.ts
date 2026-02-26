export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  const publicPages = ['/', '/index']
  const isPublic = publicPages.includes(to.path)

  if (!auth.isLoggedIn && !isPublic) {
    return navigateTo('/')
  }
})

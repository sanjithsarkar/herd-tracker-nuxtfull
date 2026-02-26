/** Auth state and API live in useAuthStore(). This composable is a convenience that also exposes authFetch. */
export const useAuth = () => {
  const store = useAuthStore()
  return {
    store,
    authFetch: store.authFetch.bind(store),
  }
}

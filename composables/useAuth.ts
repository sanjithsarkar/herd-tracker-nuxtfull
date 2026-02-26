export const useAuth = () => {
  const store = useAuthStore()

  const authFetch = async <T>(url: string, options: any = {}): Promise<T> => {
    return $fetch<T>(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${store.token}`,
      },
    })
  }

  return {
    store,
    authFetch,
  }
}

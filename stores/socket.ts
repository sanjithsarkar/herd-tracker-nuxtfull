export const useSocketStore = defineStore('socket', {
  state: () => ({
    isConnected: false,
  }),

  actions: {
    setConnected(value: boolean) {
      this.isConnected = value
    },
  },
})

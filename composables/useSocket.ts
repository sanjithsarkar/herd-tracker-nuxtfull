import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'

// Singleton socket instance — persists across page navigations
let socket: Socket | null = null
const isConnected = ref(false)

export const useSocket = () => {
  const connect = (token: string) => {
    if (socket?.connected) return

    // Disconnect stale socket if exists
    if (socket) {
      socket.disconnect()
    }

    socket = io('', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      isConnected.value = true
    })

    socket.on('disconnect', () => {
      isConnected.value = false
    })
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      socket = null
      isConnected.value = false
    }
  }

  const emit = (event: string, data: any) => {
    if (socket?.connected) {
      socket.emit(event, data)
    }
  }

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback)
    }
  }

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socket) {
      socket.off(event, callback)
    }
  }

  return {
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
  }
}

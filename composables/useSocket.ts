import { io, Socket } from 'socket.io-client'

// Singleton socket instance — persists across page navigations
let socket: Socket | null = null

export const useSocket = () => {
  const socketStore = useSocketStore()

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
      socketStore.setConnected(true)
    })

    socket.on('disconnect', () => {
      socketStore.setConnected(false)
    })
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      socket = null
      socketStore.setConnected(false)
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
    ...storeToRefs(socketStore),
    connect,
    disconnect,
    emit,
    on,
    off,
  }
}

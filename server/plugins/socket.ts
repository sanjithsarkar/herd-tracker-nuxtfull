import { initSocketServer } from '~/server/utils/socketServer'
import type { Server as HttpServer } from 'http'

let initialized = false

export default defineNitroPlugin((nitroApp) => {
  // Use the 'request' hook to grab the Node.js HTTP server on the first request
  nitroApp.hooks.hook('request', (event) => {
    if (initialized) return
    initialized = true

    const httpServer = (event.node?.req?.socket as any)?.server as HttpServer | undefined
    if (httpServer) {
      initSocketServer(httpServer)
    }
  })
})

import { Server as SocketIOServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import prisma from '~/server/utils/prisma'
import { verifyToken } from '~/server/utils/jwt'

let io: SocketIOServer | null = null

export const getIO = () => io

export function initSocketServer(httpServer: HttpServer) {
  if (io) return io

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    serveClient: false,
  })

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token

      if (!token) {
        return next(new Error('Authentication token required'))
      }

      const decoded = verifyToken(token as string)

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })

      if (!user) {
        return next(new Error('User not found'))
      }

      socket.data.user = user
      next()
    } catch (error) {
      next(new Error('Invalid authentication token'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    console.log(`[Socket.IO] User connected: ${user.id}`)

    // Join user-specific room
    socket.join(`user:${user.id}`)

    // Listen for location updates
    socket.on('location:update', async (data) => {
      try {
        const {
          latitude,
          longitude,
          accuracy,
          imei,
          identifier,
          sessionId,
          speed,
          heading,
          altitude,
          batteryLevel,
        } = data

        // Resolve device
        let device = null
        if (imei) {
          device = await prisma.device.findUnique({ where: { imei } })
        } else if (identifier) {
          device = await prisma.device.findUnique({ where: { identifier } })
        }

        // Update device lastSeen
        if (device) {
          await prisma.device.update({
            where: { id: device.id },
            data: { lastSeen: new Date() },
          })
        }

        // Save location to database
        const location = await prisma.location.create({
          data: {
            userId: user.id,
            deviceId: device?.id || null,
            sessionId: sessionId || null,
            imei: imei || null,
            latitude,
            longitude,
            accuracy: accuracy || 0,
            speed: speed ?? null,
            heading: heading ?? null,
            altitude: altitude ?? null,
            batteryLevel: batteryLevel ?? null,
          },
        })

        // Broadcast to user room
        io!.to(`user:${user.id}`).emit('location:updated', location)
      } catch (error) {
        console.error('[Socket.IO] Error saving location:', error)
        socket.emit('location:error', { message: 'Failed to save location' })
      }
    })

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User disconnected: ${user.id}`)
    })
  })

  console.log('[Socket.IO] Server initialized')
  return io
}

import prisma from '~/server/utils/prisma'
import { haversine } from '~/server/utils/haversine'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Session ID is required',
    })
  }

  const session = await prisma.trackingSession.findUnique({
    where: { id },
  })

  if (!session) {
    throw createError({
      statusCode: 404,
      message: 'Session not found',
    })
  }

  if (session.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Not authorized to stop this session',
    })
  }

  // Fetch all locations for this session ordered by timestamp
  const locations = await prisma.location.findMany({
    where: { sessionId: id },
    orderBy: { timestamp: 'asc' },
  })

  // Calculate total distance using haversine on consecutive points
  let totalDistance = 0
  for (let i = 1; i < locations.length; i++) {
    totalDistance += haversine(
      locations[i - 1].latitude,
      locations[i - 1].longitude,
      locations[i].latitude,
      locations[i].longitude,
    )
  }

  const now = new Date()
  const durationMs = now.getTime() - new Date(session.startedAt).getTime()
  const duration = Math.floor(durationMs / 1000)

  const updatedSession = await prisma.trackingSession.update({
    where: { id },
    data: {
      status: 'stopped',
      stoppedAt: now,
      duration,
      totalDistance,
      pointCount: locations.length,
    },
  })

  return updatedSession
})

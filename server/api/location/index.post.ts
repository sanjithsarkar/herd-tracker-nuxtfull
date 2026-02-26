import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  const body = await readBody(event)
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
  } = body

  if (latitude === undefined || longitude === undefined) {
    throw createError({
      statusCode: 400,
      message: 'Latitude and longitude are required',
    })
  }

  // Resolve device by imei or identifier
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

  // Create location record
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

  // If sessionId provided, update session stats
  if (sessionId) {
    const session = await prisma.trackingSession.findUnique({
      where: { id: sessionId },
    })

    if (session) {
      const updateData: Record<string, any> = {
        pointCount: { increment: 1 },
        lastLatitude: latitude,
        lastLongitude: longitude,
      }

      // Set start coordinates if this is the first point
      if (!session.startLatitude && !session.startLongitude) {
        updateData.startLatitude = latitude
        updateData.startLongitude = longitude
      }

      // Update duration from session start to now
      const durationMs = new Date().getTime() - new Date(session.startedAt).getTime()
      updateData.duration = Math.floor(durationMs / 1000)

      await prisma.trackingSession.update({
        where: { id: sessionId },
        data: updateData,
      })
    }
  }

  return location
})

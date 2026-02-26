import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const userId = getRouterParam(event, 'userId')

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required',
    })
  }

  // Only allow fetching own locations
  if (userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Not authorized to view this user\'s location history',
    })
  }

  const query = getQuery(event)
  const from = query.from as string | undefined
  const to = query.to as string | undefined
  const deviceId = query.deviceId as string | undefined
  const sessionId = query.sessionId as string | undefined

  const where: Record<string, any> = { userId }

  if (deviceId) {
    where.deviceId = deviceId
  }

  if (sessionId) {
    where.sessionId = sessionId
  }

  // Date filtering
  if (from || to) {
    where.timestamp = {}
    if (from) {
      where.timestamp.gte = new Date(from)
    }
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      where.timestamp.lte = toDate
    }
  }

  const locations = await prisma.location.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 1000,
  })

  return locations
})

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
      message: 'Not authorized to view this user\'s locations',
    })
  }

  const query = getQuery(event)
  const deviceId = query.deviceId as string | undefined

  const where: Record<string, any> = { userId }
  if (deviceId) {
    where.deviceId = deviceId
  }

  const location = await prisma.location.findFirst({
    where,
    orderBy: { timestamp: 'desc' },
  })

  if (!location) {
    throw createError({
      statusCode: 404,
      message: 'No location found',
    })
  }

  return location
})

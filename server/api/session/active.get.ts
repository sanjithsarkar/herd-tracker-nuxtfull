import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  const query = getQuery(event)
  const deviceId = query.deviceId as string | undefined

  const where: Record<string, any> = {
    userId: user.id,
    status: 'active',
  }

  if (deviceId) {
    where.deviceId = deviceId
  }

  const session = await prisma.trackingSession.findFirst({
    where,
    orderBy: { startedAt: 'desc' },
  })

  if (!session) {
    throw createError({
      statusCode: 404,
      message: 'No active session found',
    })
  }

  return session
})

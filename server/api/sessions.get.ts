import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  const query = getQuery(event)
  const deviceId = query.deviceId as string | undefined
  const from = query.from as string | undefined
  const to = query.to as string | undefined
  const limit = parseInt(query.limit as string) || 50

  const where: Record<string, any> = { userId: user.id }

  if (deviceId) {
    where.deviceId = deviceId
  }

  if (from || to) {
    where.startedAt = {}
    if (from) {
      where.startedAt.gte = new Date(from)
    }
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      where.startedAt.lte = toDate
    }
  }

  const sessions = await prisma.trackingSession.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take: limit,
  })

  return sessions
})

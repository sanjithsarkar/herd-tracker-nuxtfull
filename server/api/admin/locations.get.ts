import prisma from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/adminGuard'

export default defineEventHandler(async (event) => {
  requireRole(event, 'ADMIN')

  const query = getQuery(event)
  const userId = query.userId as string | undefined
  const deviceId = query.deviceId as string | undefined
  const sessionId = query.sessionId as string | undefined
  const from = query.from as string | undefined
  const to = query.to as string | undefined

  const where: Record<string, any> = {}

  if (userId) where.userId = userId
  if (deviceId) where.deviceId = deviceId
  if (sessionId) where.sessionId = sessionId

  if (from || to) {
    where.timestamp = {}
    if (from) where.timestamp.gte = new Date(from)
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      where.timestamp.lte = toDate
    }
  }

  const locations = await prisma.location.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 1000,
  })

  return locations
})

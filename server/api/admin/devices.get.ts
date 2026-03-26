import prisma from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/adminGuard'

export default defineEventHandler(async (event) => {
  requireRole(event, 'ADMIN')

  const devices = await prisma.device.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      locations: {
        orderBy: { timestamp: 'desc' },
        take: 1,
        select: {
          latitude: true,
          longitude: true,
          timestamp: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return devices.map((d) => ({
    ...d,
    latestLocation: d.locations[0] || null,
    locations: undefined,
  }))
})

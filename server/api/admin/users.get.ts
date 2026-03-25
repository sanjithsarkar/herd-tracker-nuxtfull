import prisma from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/adminGuard'

export default defineEventHandler(async (event) => {
  const admin = requireRole(event, 'ADMIN')

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Filter out users that the admin can't manage (don't show SUPER_ADMIN to ADMIN)
  const filteredUsers = users.filter((u) => u.id !== admin.id)

  return filteredUsers
})

import prisma from '~/server/utils/prisma'
import { requireRole, canManageUser } from '~/server/utils/adminGuard'

export default defineEventHandler(async (event) => {
  const admin = requireRole(event, 'ADMIN')
  const userId = getRouterParam(event, 'id')

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (!canManageUser(admin.role, targetUser.role)) {
    throw createError({ statusCode: 403, message: 'Cannot delete a user with equal or higher role' })
  }

  // Delete all related data (locations, sessions, devices) then user
  await prisma.$transaction([
    prisma.location.deleteMany({ where: { userId } }),
    prisma.trackingSession.deleteMany({ where: { userId } }),
    prisma.device.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ])

  return { success: true, message: `User ${targetUser.email} deleted` }
})

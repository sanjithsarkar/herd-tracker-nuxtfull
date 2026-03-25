import prisma from '~/server/utils/prisma'
import { requireRole, canManageUser } from '~/server/utils/adminGuard'

export default defineEventHandler(async (event) => {
  const admin = requireRole(event, 'ADMIN')
  const userId = getRouterParam(event, 'id')
  const { isActive } = await readBody(event)

  if (typeof isActive !== 'boolean') {
    throw createError({ statusCode: 400, message: 'isActive must be a boolean' })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (!canManageUser(admin.role, targetUser.role)) {
    throw createError({ statusCode: 403, message: 'Cannot manage a user with equal or higher role' })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  return updated
})

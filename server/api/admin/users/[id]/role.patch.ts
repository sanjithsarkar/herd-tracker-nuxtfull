import prisma from '~/server/utils/prisma'
import { requireRole, canManageUser } from '~/server/utils/adminGuard'

const VALID_ROLES = ['USER', 'ADMIN'] as const

export default defineEventHandler(async (event) => {
  const admin = requireRole(event, 'ADMIN')
  const userId = getRouterParam(event, 'id')
  const { role } = await readBody(event)

  if (!VALID_ROLES.includes(role)) {
    throw createError({ statusCode: 400, message: `Role must be one of: ${VALID_ROLES.join(', ')}` })
  }

  // Only SUPER_ADMIN can assign ADMIN role
  if (role === 'ADMIN' && admin.role !== 'SUPER_ADMIN') {
    throw createError({ statusCode: 403, message: 'Only Super Admin can assign Admin role' })
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
    data: { role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  return updated
})

import type { H3Event } from 'h3'

const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  USER: 1,
}

export function requireRole(event: H3Event, minRole: 'ADMIN' | 'SUPER_ADMIN') {
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, message: 'Not authorized' })
  }

  const userLevel = ROLE_HIERARCHY[user.role] || 0
  const requiredLevel = ROLE_HIERARCHY[minRole]

  if (userLevel < requiredLevel) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  return user
}

export function canManageUser(managerRole: string, targetRole: string): boolean {
  const managerLevel = ROLE_HIERARCHY[managerRole] || 0
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0
  return managerLevel > targetLevel
}

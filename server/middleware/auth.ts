import prisma from '~/server/utils/prisma'
import { verifyToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const pathname = url.pathname

  // Skip auth for public routes
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/health')) {
    return
  }

  // Only protect /api routes
  if (!pathname.startsWith('/api')) {
    return
  }

  const authHeader = getRequestHeader(event, 'authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Not authorized, no token provided',
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Not authorized, user not found',
      })
    }

    event.context.user = user
  } catch (error: any) {
    if (error.statusCode === 401) {
      throw error
    }
    throw createError({
      statusCode: 401,
      message: 'Not authorized, token invalid',
    })
  }
})

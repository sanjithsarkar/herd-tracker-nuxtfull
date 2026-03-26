import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Session ID is required',
    })
  }

  const session = await prisma.trackingSession.findUnique({
    where: { id },
    include: {
      locations: {
        orderBy: { timestamp: 'asc' },
      },
    },
  })

  if (!session) {
    throw createError({
      statusCode: 404,
      message: 'Session not found',
    })
  }

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
  if (session.userId !== user.id && !isAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Not authorized to view this session',
    })
  }

  return session
})

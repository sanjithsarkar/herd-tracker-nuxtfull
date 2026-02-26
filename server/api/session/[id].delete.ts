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
  })

  if (!session) {
    throw createError({
      statusCode: 404,
      message: 'Session not found',
    })
  }

  if (session.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Not authorized to delete this session',
    })
  }

  // Delete all locations for this session first
  await prisma.location.deleteMany({
    where: { sessionId: id },
  })

  // Then delete the session
  await prisma.trackingSession.delete({
    where: { id },
  })

  return { message: 'Session deleted' }
})

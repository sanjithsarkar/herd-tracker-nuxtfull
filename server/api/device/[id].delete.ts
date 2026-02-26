import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Device ID is required',
    })
  }

  const device = await prisma.device.findUnique({
    where: { id },
  })

  if (!device) {
    throw createError({
      statusCode: 404,
      message: 'Device not found',
    })
  }

  if (device.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Not authorized to delete this device',
    })
  }

  await prisma.device.delete({
    where: { id },
  })

  return { message: 'Device removed' }
})

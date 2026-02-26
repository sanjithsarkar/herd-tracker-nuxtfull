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
      message: 'Not authorized to update this device',
    })
  }

  const body = await readBody(event)
  const { name, isActive } = body

  const updateData: Record<string, any> = {}
  if (name !== undefined) updateData.name = name
  if (isActive !== undefined) updateData.isActive = isActive

  const updatedDevice = await prisma.device.update({
    where: { id },
    data: updateData,
  })

  return updatedDevice
})

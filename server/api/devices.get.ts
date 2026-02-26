import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  const devices = await prisma.device.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return devices
})

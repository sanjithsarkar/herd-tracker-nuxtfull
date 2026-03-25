import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@herd.com'
  const password = process.env.SUPER_ADMIN_PASSWORD || 'admin123456'
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin'

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    console.log(`Super Admin already exists: ${email}`)
    // Update role and isActive in case they were changed
    await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN', isActive: true },
    })
    console.log('Super Admin role and active status confirmed.')
    return
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })

  console.log(`Super Admin created: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

import bcrypt from 'bcryptjs'
import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (config.public.allowRegistration === false) {
    throw createError({
      statusCode: 403,
      message: 'Registration is disabled',
    })
  }

  const body = await readBody(event)
  // Only destructure allowed fields — role and isActive cannot be set by user
  const { name, email, password } = body

  if (!name || !email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Please provide name, email, and password',
    })
  }

  if (password.length < 6) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 6 characters',
    })
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: 'User with this email already exists',
    })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      // role defaults to USER, isActive defaults to false (schema level)
    },
  })

  // No token — user must wait for admin approval
  return {
    success: true,
    message: 'Account created successfully. Please wait for admin approval.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  }
})

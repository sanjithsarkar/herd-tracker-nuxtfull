import bcrypt from 'bcryptjs'
import prisma from '~/server/utils/prisma'
import { signToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Please provide email and password',
    })
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    })
  }

  const isMatch = await bcrypt.compare(password, user.password)

  if (!isMatch) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    })
  }

  // Check if user account is approved/active
  if (!user.isActive) {
    throw createError({
      statusCode: 403,
      message: 'Your account is pending admin approval. Please wait for an admin to activate your account.',
    })
  }

  const token = signToken(user.id)

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }
})

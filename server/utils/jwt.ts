import jwt from 'jsonwebtoken'

export const signToken = (userId: string): string => {
  const config = useRuntimeConfig()
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: '30d' })
}

export const verifyToken = (token: string): { id: string } => {
  const config = useRuntimeConfig()
  return jwt.verify(token, config.jwtSecret) as { id: string }
}

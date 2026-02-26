import { d as defineEventHandler, r as readBody, c as createError, p as prisma, s as signToken } from '../../../nitro/nitro.mjs';
import bcrypt from 'bcryptjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'socket.io';
import '@prisma/client';
import 'jsonwebtoken';
import 'node:url';

const register_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { name, email, password } = body;
  if (!name || !email || !password) {
    throw createError({
      statusCode: 400,
      message: "Please provide name, email, and password"
    });
  }
  if (password.length < 6) {
    throw createError({
      statusCode: 400,
      message: "Password must be at least 6 characters"
    });
  }
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });
  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: "User with this email already exists"
    });
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword
    }
  });
  const token = signToken(user.id);
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };
});

export { register_post as default };
//# sourceMappingURL=register.post.mjs.map

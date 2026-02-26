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

const login_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password } = body;
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: "Please provide email and password"
    });
  }
  const user = await prisma.user.findUnique({
    where: { email }
  });
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Invalid email or password"
    });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw createError({
      statusCode: 401,
      message: "Invalid email or password"
    });
  }
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

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map

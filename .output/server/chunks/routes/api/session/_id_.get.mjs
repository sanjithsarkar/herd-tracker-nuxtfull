import { d as defineEventHandler, g as getRouterParam, c as createError, p as prisma } from '../../../nitro/nitro.mjs';
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

const _id__get = defineEventHandler(async (event) => {
  const user = event.context.user;
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Session ID is required"
    });
  }
  const session = await prisma.trackingSession.findUnique({
    where: { id },
    include: {
      locations: {
        orderBy: { timestamp: "asc" }
      }
    }
  });
  if (!session) {
    throw createError({
      statusCode: 404,
      message: "Session not found"
    });
  }
  if (session.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: "Not authorized to view this session"
    });
  }
  return session;
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map

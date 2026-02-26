import { d as defineEventHandler, a as getQuery, p as prisma, c as createError } from '../../../nitro/nitro.mjs';
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

const active_get = defineEventHandler(async (event) => {
  const user = event.context.user;
  const query = getQuery(event);
  const deviceId = query.deviceId;
  const where = {
    userId: user.id,
    status: "active"
  };
  if (deviceId) {
    where.deviceId = deviceId;
  }
  const session = await prisma.trackingSession.findFirst({
    where,
    orderBy: { startedAt: "desc" }
  });
  if (!session) {
    throw createError({
      statusCode: 404,
      message: "No active session found"
    });
  }
  return session;
});

export { active_get as default };
//# sourceMappingURL=active.get.mjs.map

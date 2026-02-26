import { d as defineEventHandler, a as getQuery, p as prisma } from '../../nitro/nitro.mjs';
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

const sessions_get = defineEventHandler(async (event) => {
  const user = event.context.user;
  const query = getQuery(event);
  const deviceId = query.deviceId;
  const from = query.from;
  const to = query.to;
  const limit = parseInt(query.limit) || 50;
  const where = { userId: user.id };
  if (deviceId) {
    where.deviceId = deviceId;
  }
  if (from || to) {
    where.startedAt = {};
    if (from) {
      where.startedAt.gte = new Date(from);
    }
    if (to) {
      where.startedAt.lte = new Date(to);
    }
  }
  const sessions = await prisma.trackingSession.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit
  });
  return sessions;
});

export { sessions_get as default };
//# sourceMappingURL=sessions.get.mjs.map

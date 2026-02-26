import { d as defineEventHandler, g as getRouterParam, c as createError, a as getQuery, p as prisma } from '../../../../nitro/nitro.mjs';
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

const _userId__get = defineEventHandler(async (event) => {
  const user = event.context.user;
  const userId = getRouterParam(event, "userId");
  if (!userId) {
    throw createError({
      statusCode: 400,
      message: "User ID is required"
    });
  }
  if (userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: "Not authorized to view this user's locations"
    });
  }
  const query = getQuery(event);
  const deviceId = query.deviceId;
  const where = { userId };
  if (deviceId) {
    where.deviceId = deviceId;
  }
  const location = await prisma.location.findFirst({
    where,
    orderBy: { timestamp: "desc" }
  });
  if (!location) {
    throw createError({
      statusCode: 404,
      message: "No location found"
    });
  }
  return location;
});

export { _userId__get as default };
//# sourceMappingURL=_userId_.get.mjs.map

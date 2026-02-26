import { d as defineEventHandler, g as getRouterParam, c as createError, p as prisma } from '../../../../nitro/nitro.mjs';
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

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const stop_post = defineEventHandler(async (event) => {
  const user = event.context.user;
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Session ID is required"
    });
  }
  const session = await prisma.trackingSession.findUnique({
    where: { id }
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
      message: "Not authorized to stop this session"
    });
  }
  const locations = await prisma.location.findMany({
    where: { sessionId: id },
    orderBy: { timestamp: "asc" }
  });
  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    totalDistance += haversine(
      locations[i - 1].latitude,
      locations[i - 1].longitude,
      locations[i].latitude,
      locations[i].longitude
    );
  }
  const now = /* @__PURE__ */ new Date();
  const durationMs = now.getTime() - new Date(session.startedAt).getTime();
  const duration = Math.floor(durationMs / 1e3);
  const updatedSession = await prisma.trackingSession.update({
    where: { id },
    data: {
      status: "stopped",
      stoppedAt: now,
      duration,
      totalDistance,
      pointCount: locations.length
    }
  });
  return updatedSession;
});

export { stop_post as default };
//# sourceMappingURL=stop.post.mjs.map

import { d as defineEventHandler, r as readBody, c as createError, p as prisma } from '../../nitro/nitro.mjs';
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

const index_post = defineEventHandler(async (event) => {
  const user = event.context.user;
  const body = await readBody(event);
  const {
    latitude,
    longitude,
    accuracy,
    imei,
    identifier,
    sessionId,
    speed,
    heading,
    altitude,
    batteryLevel
  } = body;
  if (latitude === void 0 || longitude === void 0) {
    throw createError({
      statusCode: 400,
      message: "Latitude and longitude are required"
    });
  }
  let device = null;
  if (imei) {
    device = await prisma.device.findUnique({ where: { imei } });
  } else if (identifier) {
    device = await prisma.device.findUnique({ where: { identifier } });
  }
  if (device) {
    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeen: /* @__PURE__ */ new Date() }
    });
  }
  const location = await prisma.location.create({
    data: {
      userId: user.id,
      deviceId: (device == null ? void 0 : device.id) || null,
      sessionId: sessionId || null,
      imei: imei || null,
      latitude,
      longitude,
      accuracy: accuracy || 0,
      speed: speed != null ? speed : null,
      heading: heading != null ? heading : null,
      altitude: altitude != null ? altitude : null,
      batteryLevel: batteryLevel != null ? batteryLevel : null
    }
  });
  if (sessionId) {
    const session = await prisma.trackingSession.findUnique({
      where: { id: sessionId }
    });
    if (session) {
      const updateData = {
        pointCount: { increment: 1 },
        lastLatitude: latitude,
        lastLongitude: longitude
      };
      if (!session.startLatitude && !session.startLongitude) {
        updateData.startLatitude = latitude;
        updateData.startLongitude = longitude;
      }
      const durationMs = (/* @__PURE__ */ new Date()).getTime() - new Date(session.startedAt).getTime();
      updateData.duration = Math.floor(durationMs / 1e3);
      await prisma.trackingSession.update({
        where: { id: sessionId },
        data: updateData
      });
    }
  }
  return location;
});

export { index_post as default };
//# sourceMappingURL=index.post2.mjs.map

import { d as defineEventHandler, r as readBody, p as prisma, c as createError } from '../../../nitro/nitro.mjs';
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

const start_post = defineEventHandler(async (event) => {
  const user = event.context.user;
  const body = await readBody(event);
  const { imei, identifier } = body;
  let device = null;
  if (imei) {
    device = await prisma.device.findUnique({ where: { imei } });
  } else if (identifier) {
    device = await prisma.device.findUnique({ where: { identifier } });
  }
  if (!device) {
    throw createError({
      statusCode: 404,
      message: "Device not found. Provide a valid imei or identifier."
    });
  }
  if (device.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: "Not authorized to start a session for this device"
    });
  }
  await prisma.trackingSession.updateMany({
    where: {
      deviceId: device.id,
      status: "active"
    },
    data: {
      status: "stopped",
      stoppedAt: /* @__PURE__ */ new Date()
    }
  });
  const session = await prisma.trackingSession.create({
    data: {
      userId: user.id,
      deviceId: device.id,
      imei: device.imei || null,
      deviceName: device.name,
      status: "active",
      startedAt: /* @__PURE__ */ new Date()
    }
  });
  return session;
});

export { start_post as default };
//# sourceMappingURL=start.post.mjs.map

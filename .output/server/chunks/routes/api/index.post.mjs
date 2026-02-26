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
  const { deviceType, imei, identifier, name } = body;
  if (!deviceType || !["mobile", "laptop"].includes(deviceType)) {
    throw createError({
      statusCode: 400,
      message: "Please provide a valid deviceType (mobile or laptop)"
    });
  }
  if (deviceType === "mobile") {
    if (!imei) {
      throw createError({
        statusCode: 400,
        message: "Mobile devices require an IMEI number"
      });
    }
    if (!/^\d{15}$/.test(imei)) {
      throw createError({
        statusCode: 400,
        message: "IMEI must be exactly 15 digits"
      });
    }
    const existingDevice = await prisma.device.findUnique({
      where: { imei }
    });
    if (existingDevice) {
      throw createError({
        statusCode: 400,
        message: "A device with this IMEI already exists"
      });
    }
  }
  if (deviceType === "laptop") {
    if (!identifier) {
      throw createError({
        statusCode: 400,
        message: "Laptop devices require an identifier"
      });
    }
    if (identifier.length < 3 || identifier.length > 50) {
      throw createError({
        statusCode: 400,
        message: "Identifier must be between 3 and 50 characters"
      });
    }
    const existingDevice = await prisma.device.findUnique({
      where: { identifier }
    });
    if (existingDevice) {
      throw createError({
        statusCode: 400,
        message: "A device with this identifier already exists"
      });
    }
  }
  const device = await prisma.device.create({
    data: {
      userId: user.id,
      deviceType,
      imei: deviceType === "mobile" ? imei : null,
      identifier: deviceType === "laptop" ? identifier : null,
      name: name || "My Device"
    }
  });
  return device;
});

export { index_post as default };
//# sourceMappingURL=index.post.mjs.map

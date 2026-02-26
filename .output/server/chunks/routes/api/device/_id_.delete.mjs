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

const _id__delete = defineEventHandler(async (event) => {
  const user = event.context.user;
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Device ID is required"
    });
  }
  const device = await prisma.device.findUnique({
    where: { id }
  });
  if (!device) {
    throw createError({
      statusCode: 404,
      message: "Device not found"
    });
  }
  if (device.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: "Not authorized to delete this device"
    });
  }
  await prisma.device.delete({
    where: { id }
  });
  return { message: "Device removed" };
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map

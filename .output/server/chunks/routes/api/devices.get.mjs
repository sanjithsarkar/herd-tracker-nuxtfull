import { d as defineEventHandler, p as prisma } from '../../nitro/nitro.mjs';
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

const devices_get = defineEventHandler(async (event) => {
  const user = event.context.user;
  const devices = await prisma.device.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });
  return devices;
});

export { devices_get as default };
//# sourceMappingURL=devices.get.mjs.map

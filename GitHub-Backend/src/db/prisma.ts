import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Handle BigInt serialization for JSON responses
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

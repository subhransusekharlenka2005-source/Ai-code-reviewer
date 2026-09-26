import { PrismaClient } from "@prisma/client";

// Prevents creating a new PrismaClient on every hot-reload in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.includes("@db:5432") && process.platform === "win32") {
  dbUrl = dbUrl.replace("@db:5432", "@127.0.0.1:5432");
}

export const prisma =
  globalForPrisma.prisma ??
  (dbUrl ? new PrismaClient({ datasources: { db: { url: dbUrl } } }) : new PrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}


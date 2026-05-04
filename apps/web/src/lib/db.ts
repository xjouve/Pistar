import { PrismaClient } from "@prisma/client";

// Reuse the Prisma client across hot reloads in development to avoid
// exhausting the database connection pool. In production a single
// instance per Lambda / Edge runtime is fine.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

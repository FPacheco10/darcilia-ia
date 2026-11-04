import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalPrisma = globalThis as typeof globalThis & {
  darciliaPrisma?: PrismaClient;
};

export function obterPrisma() {
  if (globalPrisma.darciliaPrisma) return globalPrisma.darciliaPrisma;

  const connectionString = process.env.DATABASE_URL_POOLED;

  if (!connectionString) {
    throw new Error("DATABASE_URL_POOLED não está configurada.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  globalPrisma.darciliaPrisma = prisma;
  return prisma;
}
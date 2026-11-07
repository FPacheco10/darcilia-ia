import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { obterPrisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(obterPrisma(), {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  plugins: [admin()],
});
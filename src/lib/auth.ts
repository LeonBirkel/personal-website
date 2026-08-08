import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

/** Single admin user, email/password only. Sign-ups are disabled, the user is seeded. */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    password: {
      hash: hashPassword,
      verify: ({ hash, password }) => verifyPassword(hash, password),
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "admin", input: false },
    },
  },
  advanced: {
    ipAddress: {
      // Mirrors src/lib/request-ip.ts. Behind Cloudflare (the documented
      // deployment) cf-connecting-ip is authoritative because the edge
      // overwrites it. Without Cloudflare no client-settable header can be
      // trusted, this list included, so instance owners fronting the app
      // with their own proxy should also set
      // advanced.ipAddress.trustedProxies for it.
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
    },
  },
  plugins: [nextCookies()],
});

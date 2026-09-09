/**
 * GlobalSettings keys shared between the app and the seed script. The seed
 * writes the flag, the admin dashboard reads it, and neither may import the
 * other's Prisma client.
 */
export const SEED_COMPLETED_KEY = "seed:completed";

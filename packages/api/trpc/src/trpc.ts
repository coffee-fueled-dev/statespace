import { initTRPC } from "@trpc/server";

// Initialize tRPC with context type
export type Context = {};

const t = initTRPC.context<Context>().create();

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

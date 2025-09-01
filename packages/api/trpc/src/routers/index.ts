import { router } from "../trpc";
import { generationRouter } from "./generation";
import { storageRouter } from "./storage";

export const appRouter = router({
  generation: generationRouter,
  storage: storageRouter,
});

export type AppRouter = typeof appRouter;

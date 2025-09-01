import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter } from "./routers";

const server = createHTTPServer({
  router: appRouter,
  createContext: () => ({}),
});

const port = 3001;
server.listen(port);

console.log(`tRPC server running on http://localhost:${port}`);

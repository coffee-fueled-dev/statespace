import { getYoga, onListen, createDriver, getSchema } from "./startup/index.js";
import type { Server } from "bun";
import type { Driver as Neo4jDriver } from "neo4j-driver";
import { pino } from "pino";

const { PORT = 4000 } = process.env;

const logger = pino({
  name: "statespace-memgraph-server",
});

async function stopServer(
  protoServer: Server | null,
  neo4jDriver: Neo4jDriver | null
) {
  try {
    if (protoServer) {
      protoServer.stop();
    }

    if (neo4jDriver) {
      await neo4jDriver.close();
    }

    logger.info("Server closed");
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error closing server: %O", error);
    } else {
      logger.error("Error closing server: %O");
    }
    process.exit(1);
  }
}

async function initializeServer() {
  let protoServer: Server | null = null;
  let neo4jDriver: Neo4jDriver | null = null;

  try {
    neo4jDriver = await createDriver().catch((error) => {
      logger.error("Failed to initialize database driver: %O", error);
      throw error;
    });

    const schema = await getSchema(neo4jDriver).catch((error) => {
      logger.error("Failed to generate schema: %O", error);
      throw error;
    });

    logger.info("Successfully generated GraphQL schema");

    const yoga = await getYoga({ schema, driver: neo4jDriver }).catch(
      (error) => {
        logger.error("Failed to initialize Yoga: %O", error);
        throw error;
      }
    );

    protoServer = Bun.serve({
      port: PORT,
      hostname: "0.0.0.0",
      fetch: yoga.fetch,
    });

    process.on("SIGTERM", stopServer);
    process.on("SIGINT", stopServer);

    onListen(yoga);

    logger.info("Server initialization completed successfully");
  } catch (error) {
    await stopServer(protoServer, neo4jDriver);
    if (error instanceof Error) {
      logger.error("Failed to initialize Yoga: %O", error);
    } else {
      logger.error("Failed to initialize Yoga: %O");
    }
    throw error;
  }
}

if (import.meta.main) {
  await initializeServer().catch((error) => {
    logger.error("Failed to initialize server: %O", error);
    process.exit(1);
  });
}

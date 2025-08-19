import type { Config, Driver } from "neo4j-driver";
import neo4j from "neo4j-driver";
import {
  MEMGRAPH_CONNECTION_LIFETIME,
  MEMGRAPH_CONNECTION_TIMEOUT,
  MEMGRAPH_DATABASE_NAME,
  MEMGRAPH_MAX_CONNECTIONS,
  MEMGRAPH_PASSWORD,
  MEMGRAPH_URL,
  MEMGRAPH_USER,
  NODE_ENV,
} from "../environment";

const isDevelopment = NODE_ENV === "development";

const validateConnection = async (driver: Driver): Promise<boolean> => {
  const session = driver.session({
    database: MEMGRAPH_DATABASE_NAME,
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    await session.run("RETURN 1 as num");
    console.info("Neo4j connection validated successfully");
    return true;
  } catch (error) {
    console.error("Neo4j connection validation failed: %O", error);
    return false;
  } finally {
    await session.close();
  }
};

export const createDriver = async () => {
  const driver = neo4j.driver(
    MEMGRAPH_URL,
    neo4j.auth.basic(MEMGRAPH_USER, MEMGRAPH_PASSWORD!),
    {
      maxConnectionLifetime: Number(MEMGRAPH_CONNECTION_LIFETIME),
      maxConnectionPoolSize: Number(MEMGRAPH_MAX_CONNECTIONS),
      connectionAcquisitionTimeout: Number(MEMGRAPH_CONNECTION_TIMEOUT),
      maxTransactionRetryTime: 15000,
      connectionLivenessCheckTimeout: 15000,
      disableLosslessIntegers: true,
      logging: neo4jLogger,
    }
  );

  try {
    const isConnected = await validateConnection(driver);
    if (!isConnected) {
      throw new Error("Neo4j connection validation failed");
    }

    const serverInfo = await driver.getServerInfo();

    console.debug({
      address: serverInfo.address || "null",
      agent: serverInfo.agent || "null",
      protocol: serverInfo.protocolVersion || "null",
    });
  } catch (error) {
    console.error("Failed to establish initial Neo4j connection: %O", error);
    throw error;
  }

  return driver;
};

export const neo4jLogger: Config["logging"] = {
  level: isDevelopment ? "info" : "warn",
  logger: (level: string, message: string) => {
    switch (level) {
      case "error":
        console.error(message);
        break;
      case "warn":
        console.warn(message);
        break;
      case "info":
        if (isDevelopment) {
          console.info(message);
        }
        break;
    }
  },
};

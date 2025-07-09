import * as memgraph from "neo4j-driver";

const MEMGRAPH_URI = process.env.MEMGRAPH_URI || "bolt://localhost:7687";
const MEMGRAPH_USER = process.env.MEMGRAPH_USER || "neo4j";
const MEMGRAPH_PASS = process.env.MEMGRAPH_PASS || "password";

export const createDriver = () =>
  memgraph.driver(
    MEMGRAPH_URI,
    memgraph.auth.basic(MEMGRAPH_USER, MEMGRAPH_PASS),
    {
      // Optimize for concurrent connections
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
      maxTransactionRetryTime: 15000,
    }
  );

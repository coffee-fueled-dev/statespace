import { GraphQLSchema } from "graphql";
import {
  createYoga,
  useEnvelop,
  type YogaInitialContext,
  type YogaServerInstance,
} from "graphql-yoga";
import { Driver, Session } from "neo4j-driver";
import pkg from "../../../package.json" assert { type: "json" };
import getEnveloped from "../plugins/envelop";
import {
  ENABLE_GRAPHIQL,
  ENABLE_LANDING_PAGE,
  MEMGRAPH_DATABASE_NAME,
} from "../environment";

interface YogaParams {
  schema: GraphQLSchema;
  driver: Driver;
}

interface ExtendedContext extends YogaInitialContext {
  executionContext: Session;
  yoga: YogaServerInstance<{}, ExtendedContext>;
}

export type StateSpaceServerInstance = YogaServerInstance<{}, ExtendedContext>;

export const getYoga = async ({
  schema,
  driver,
}: YogaParams): Promise<YogaServerInstance<{}, ExtendedContext>> => {
  try {
    const yoga: YogaServerInstance<{}, ExtendedContext> = createYoga<
      {},
      ExtendedContext
    >({
      schema,
      graphiql: ENABLE_GRAPHIQL === "true",
      landingPage: ENABLE_LANDING_PAGE === "true",
      context: (initialContext) => ({
        ...initialContext,
        executionContext: driver.session({ database: MEMGRAPH_DATABASE_NAME }),
        cypherParams: {
          apiVersion: pkg.version,
        },
        cypherQueryOptions: {
          addVersionPrefix: false,
        },
        yoga,
      }),
      plugins: [useEnvelop(await getEnveloped())],
    });

    console.info("Yoga initialized successfully");
    return yoga;
  } catch (error) {
    console.error("Failed to initialize Yoga: %O", error);
    throw error;
  }
};

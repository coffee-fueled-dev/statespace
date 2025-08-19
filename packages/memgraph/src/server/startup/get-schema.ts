import { Neo4jGraphQL } from "@neo4j/graphql";
import { type GraphQLSchema } from "graphql";
import type { Driver } from "neo4j-driver";
import { NODE_ENV } from "../environment";

export const getSchema = (
  SDL: string,
  driver?: Driver
): Promise<GraphQLSchema> =>
  new Neo4jGraphQL({
    validate: false,
    typeDefs: SDL,
    driver,
    debug: NODE_ENV === "development",
    features: {
      populatedBy: {
        callbacks: {
          apiVersion: (_parent, _args, ctx) => {
            const customCtx = ctx as { version: string };
            if (!customCtx.version) {
              console.warn(
                "context.version must exist during Neo4j callback execution"
              );
            }
            return customCtx.version;
          },
        },
      },
      excludeDeprecatedFields: {
        mutationOperations: true,
        aggregationFilters: true,
        aggregationFiltersOutsideConnection: true,
        relationshipFilters: true,
        attributeFilters: true,
      },
    },
  }).getSchema();
